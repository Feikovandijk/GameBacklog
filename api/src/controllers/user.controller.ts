import { Request, Response } from 'express';
import { supabase } from '../supabase/client';
import { User as SteamUser } from '../auth/steam-auth';
import { syncUserWithSteam } from '../services/user-steam-sync-service';

export const syncUser = (req: Request, res: Response): void => {
  try {
    // Trigger the sync in the background and return immediately
    void syncUserWithSteam(req.user as SteamUser);
    res
      .status(202)
      .json({ message: 'Sync process started in the background.' });
  } catch (error: unknown) {
    console.error('Failed to start user sync:', error);
    res.status(500).json({ error: 'Failed to start sync process.' });
  }
};

export const getUserGames = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as SteamUser).id;

    // Get query parameters for filtering
    const { status, priority, limit = 20, offset = 0, has_notes } = req.query;

    let query = supabase
      .from('user_games')
      .select(
        `
        *,
        game:games(*)
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

    if (status) {
      query = query.eq('status', status as string);
    }
    if (priority) {
      query = query.eq('priority', parseInt(priority as string));
    }
    if (has_notes === 'true') {
      query = query.not('user_notes', 'is', null).neq('user_notes', '');
    }

    const { data: userGames, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      documents: userGames || [],
      total: count || 0,
    });
  } catch (error: unknown) {
    console.error('Error fetching user games:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res
      .status(500)
      .json({ error: 'Failed to fetch user games', details: errorMessage });
  }
};

export const getRecentlyPlayed = async (req: Request, res: Response) => {
  const user = req.user as SteamUser;
  const { limit = 5 } = req.query;

  try {
    const { data: userGames, error } = await supabase
      .from('user_games')
      .select(
        `
                id,
                steam_appid,
                playtime_2weeks,
                game_id,
                hours_played,
                status,
                updated_at,
                last_played,
                game:games(*)
            `
      )
      .eq('user_id', user.id)
      .gt('playtime_2weeks', 0)
      .order('playtime_2weeks', { ascending: false })
      .limit(parseInt(limit as string, 10));

    if (error) {
      throw error;
    }

    res.json(userGames || []);
  } catch (error: unknown) {
    console.error('Error fetching recently played games:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to fetch recently played games',
      details: errorMessage,
    });
  }
};

export const addUserGame = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as SteamUser).id;
    const { steam_appid, status } = req.body;

    if (!steam_appid || !status) {
      res.status(400).json({ error: 'steam_appid and status are required' });
      return;
    }

    // Verify the game exists
    const { data: gameExists, error: gameError } = await supabase
      .from('games')
      .select('id, name')
      .eq('steam_appid', steam_appid)
      .single();

    if (gameError || !gameExists) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Check if user already has this game
    const { data: existingUserGame } = await supabase
      .from('user_games')
      .select('id')
      .eq('user_id', userId)
      .eq('steam_appid', steam_appid)
      .single();

    if (existingUserGame) {
      res.status(409).json({ error: 'Game already in backlog' });
      return;
    }

    const { data: newUserGame, error: insertError } = await supabase
      .from('user_games')
      .insert({
        user_id: userId,
        game_id: gameExists.id,
        steam_appid,
        status,
        added_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json(newUserGame);
  } catch (error: unknown) {
    console.error('Error adding user game:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res
      .status(500)
      .json({ error: 'Failed to add user game', details: errorMessage });
  }
};

// Helper function to log user activity
async function logUserActivity(userId: string, type: string, metadata: object) {
  try {
    await supabase.from('user_activity').insert({
      user_id: userId,
      type: type,
      data: metadata,
      created_at: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error(
      `Failed to log user activity of type ${type} for user ${userId}:`,
      error
    );
  }
}

export const updateUserGame = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as SteamUser).id;
    const gameId = req.params.id;
    const {
      status,
      priority,
      user_rating,
      user_notes,
      user_tags,
      hours_played,
      completion_percentage,
      is_favorite,
    } = req.body;

    // Verify ownership
    const { data: userGame, error: userGameError } = await supabase
      .from('user_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (userGameError || !userGame) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (userGame.user_id !== userId) {
      res.status(403).json({ error: 'Forbidden: Not your game' });
      return;
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update provided fields
    if (status !== undefined) {
      updateData.status = status;
      // Log activity based on status change
      if (
        status === 'completed' ||
        status === 'completed_100' ||
        (status === 'currently_playing' &&
          userGame.status !== 'currently_playing')
      ) {
        // Fetch game name once for activity logging
        const { data: gameData } = await supabase
          .from('games')
          .select('name')
          .eq('steam_appid', userGame.steam_appid)
          .single();
        const gameName = gameData?.name || 'Unknown Game';

        if (status === 'completed' || status === 'completed_100') {
          void logUserActivity(userId, 'game.completed', { gameName });
          updateData.completed_at = new Date().toISOString();
        } else if (
          status === 'currently_playing' &&
          userGame.status !== 'currently_playing'
        ) {
          void logUserActivity(userId, 'game.started', { gameName });
        }
      }
    }
    if (priority !== undefined) {
      updateData.priority = priority;
    }
    if (user_rating !== undefined) {
      updateData.user_rating = user_rating;
    }
    if (user_notes !== undefined) {
      updateData.user_notes = user_notes;
    }
    if (user_tags !== undefined) {
      updateData.user_tags = user_tags;
    }
    if (hours_played !== undefined) {
      updateData.hours_played = hours_played;
    }
    if (completion_percentage !== undefined) {
      updateData.completion_percentage = completion_percentage;
    }
    if (is_favorite !== undefined) {
      updateData.is_favorite = is_favorite;
    }

    // Set completion date if marking as completed
    if (
      (status === 'completed' || status === 'completed_100') &&
      !updateData.completed_at
    ) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: result, error: updateError } = await supabase
      .from('user_games')
      .update(updateData)
      .eq('id', gameId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.json(result);
  } catch (error: unknown) {
    console.error('Error updating user game:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res
      .status(500)
      .json({ error: 'Failed to update game', details: errorMessage });
  }
};

export const deleteUserGame = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as SteamUser).id;
    const gameId = req.params.id;

    // Verify ownership
    const { data: userGame, error: userGameError } = await supabase
      .from('user_games')
      .select('user_id')
      .eq('id', gameId)
      .single();

    if (userGameError || !userGame) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (userGame.user_id !== userId) {
      res.status(403).json({ error: 'Forbidden: Not your game' });
      return;
    }

    const { error: deleteError } = await supabase
      .from('user_games')
      .delete()
      .eq('id', gameId);

    if (deleteError) {
      throw deleteError;
    }

    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Error removing game from backlog:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to remove game from backlog',
      details: errorMessage,
    });
  }
};

export const bulkDeleteByStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as SteamUser).id;
    const { status } = req.body as { status: string };

    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    const { error } = await supabase
      .from('user_games')
      .delete()
      .eq('user_id', userId)
      .eq('status', status);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Error bulk-deleting games by status:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res
      .status(500)
      .json({ error: 'Bulk delete failed', details: errorMessage });
  }
};

export const getUserStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as SteamUser).id;

    // Get various stats in parallel
    const [
      { count: totalGames },
      { count: completedGames },
      { count: currentlyPlaying },
      { count: wantToPlay },
      { count: onHold },
      { count: dropped },
    ] = await Promise.all([
      supabase
        .from('user_games')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      supabase
        .from('user_games')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'completed'),
      supabase
        .from('user_games')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'currently_playing'),
      supabase
        .from('user_games')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'want_to_play'),
      supabase
        .from('user_games')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'on_hold'),
      supabase
        .from('user_games')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'dropped'),
    ]);

    const stats = {
      totalGames: totalGames || 0,
      completedGames: completedGames || 0,
      currentlyPlaying: currentlyPlaying || 0,
      wantToPlay: wantToPlay || 0,
      onHold: onHold || 0,
      dropped: dropped || 0,
      completionPercentage:
        (totalGames || 0) > 0
          ? Math.round(((completedGames || 0) / (totalGames || 0)) * 100)
          : 0,
    };

    res.json(stats);
  } catch (error: unknown) {
    console.error('Error fetching user stats:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res
      .status(500)
      .json({ error: 'Failed to fetch user stats', details: errorMessage });
  }
};

export const getExtendedStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as SteamUser).id;

    const { data: userGames, error } = await supabase
      .from('user_games')
      .select('hours_played')
      .eq('user_id', userId)
      .limit(5000); // A high limit to get all games

    if (error) {
      throw error;
    }

    const totalHoursPlayed = (userGames || []).reduce(
      (sum: number, game: any) => sum + (game.hours_played || 0),
      0
    );

    res.json({
      totalHoursPlayed: Math.round(totalHoursPlayed * 100) / 100, // Round to 2 decimal places
    });
  } catch (error: unknown) {
    console.error('Error fetching user extended stats:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to fetch user extended stats',
      details: errorMessage,
    });
  }
};

export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as SteamUser).id;
    const now = new Date();

    // Calculate time boundaries
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Run optimized parallel queries for different stats
    const [
      statusCountsResult,
      completedStatsResult,
      playtimeResult,
      genreDataResult,
      collectionValueResult,
      { count: recentAchievementCount },
    ] = await Promise.all([
      // Get status counts using database aggregation
      supabase.from('user_games').select('status').eq('user_id', userId),

      // Get completed games with completed_at and hours_played for time-based and avg stats
      supabase
        .from('user_games')
        .select('completed_at, hours_played')
        .eq('user_id', userId)
        .in('status', ['completed', 'completed_100']),

      // Get total hours played
      supabase.from('user_games').select('hours_played').eq('user_id', userId),

      // Get genre data only
      supabase
        .from('user_games')
        .select('game:games(genres)')
        .eq('user_id', userId),

      // Get collection value only
      supabase
        .from('user_games')
        .select('game:games(price_final)')
        .eq('user_id', userId),

      // Get recent achievement count
      supabase
        .from('user_achievements')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_unlocked', true)
        .gte('unlock_time', startOfMonth.toISOString()),
    ]);

    // Calculate status counts
    const statusCounts = (statusCountsResult.data || []).reduce(
      (acc, game) => {
        acc[game.status] = (acc[game.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalGames = (statusCountsResult.data || []).length;

    // Calculate time-based completions using completed_at
    const completedGames = completedStatsResult.data || [];

    const completedThisWeek = completedGames.filter(g => {
      if (!g.completed_at) {
        return false;
      }
      return new Date(g.completed_at as string) >= startOfWeek;
    }).length;

    const completedThisMonth = completedGames.filter(g => {
      if (!g.completed_at) {
        return false;
      }
      return new Date(g.completed_at as string) >= startOfMonth;
    }).length;

    const completedThisYear = completedGames.filter(g => {
      if (!g.completed_at) {
        return false;
      }
      return new Date(g.completed_at as string) >= startOfYear;
    }).length;

    // Calculate playtime stats
    const totalHoursPlayed = (playtimeResult.data || []).reduce(
      (sum, g) => sum + (g.hours_played || 0),
      0
    );

    // Calculate average hours per completed game
    const avgHoursPerCompletion =
      completedGames.length > 0
        ? Math.round(
            (completedGames.reduce((sum, g) => sum + (g.hours_played || 0), 0) /
              completedGames.length) *
              10
          ) / 10
        : 0;

    // Calculate genre distribution
    const genreCounts: Record<string, number> = {};
    (genreDataResult.data || []).forEach(ug => {
      const game = ug.game as any;
      if (game?.genres && Array.isArray(game.genres)) {
        game.genres.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });

    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Calculate collection value estimate (sum of game prices in cents, then convert to dollars)
    const collectionValueCents = (collectionValueResult.data || []).reduce(
      (sum, ug) => {
        const game = ug.game as any;
        return sum + (game?.price_final || 0);
      },
      0
    );
    const collectionValueEstimate = Math.round(collectionValueCents) / 100;

    // Build response
    const dashboardStats = {
      // Status counts
      totalGames,
      completedGames: statusCounts['completed'] || 0,
      completed100: statusCounts['completed_100'] || 0,
      currentlyPlaying: statusCounts['currently_playing'] || 0,
      wantToPlay: statusCounts['want_to_play'] || 0,
      onHold: statusCounts['on_hold'] || 0,
      dropped: statusCounts['dropped'] || 0,

      // Time-based completions
      completedThisWeek,
      completedThisMonth,
      completedThisYear,

      // Playtime stats
      totalHoursPlayed: Math.round(totalHoursPlayed * 10) / 10,
      avgHoursPerCompletion,

      // Insights
      topGenres,
      recentAchievementCount: recentAchievementCount || 0,
      collectionValueEstimate,

      // Computed
      completionPercentage:
        totalGames > 0
          ? Math.round(
              (((statusCounts['completed'] || 0) +
                (statusCounts['completed_100'] || 0)) /
                totalGames) *
                100
            )
          : 0,
    };

    res.json(dashboardStats);
  } catch (error: unknown) {
    console.error('Error fetching dashboard stats:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      details: errorMessage,
    });
  }
};

export const getRecentAchievements = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as SteamUser).id;

    // Fetch 5 most recent unlocked achievements with related data
    const { data: recentUserAchievements, error: achievementsError } =
      await supabase
        .from('user_achievements')
        .select(
          `
                *,
                achievement:achievements(*),
                game:games(*)
            `
        )
        .eq('user_id', userId)
        .eq('is_unlocked', true)
        .order('unlock_time', { ascending: false })
        .limit(5);

    if (achievementsError) {
      throw achievementsError;
    }

    res.json(recentUserAchievements || []);
  } catch (error: unknown) {
    console.error('Error fetching recent achievements:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to fetch recent achievements',
      details: errorMessage,
    });
  }
};

export const getUserActivity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as SteamUser).id;
    const { data: activities, error } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    res.json(activities || []);
  } catch (error: unknown) {
    console.error('Error fetching user activity:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to fetch user activity',
      details: errorMessage,
    });
  }
};

const VALID_STATUSES = [
  'want_to_play',
  'currently_playing',
  'completed',
  'completed_100',
  'on_hold',
  'dropped',
];
const VALID_VIEWS = ['grid', 'list'];

export const updateUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as SteamUser).id;
    const {
      auto_import_steam_games,
      sync_steam_playtime,
      default_game_status,
      default_view,
    } = req.body;

    if (
      default_game_status !== undefined &&
      !VALID_STATUSES.includes(String(default_game_status))
    ) {
      res.status(400).json({ error: 'Invalid default_game_status value' });
      return;
    }

    if (
      default_view !== undefined &&
      !VALID_VIEWS.includes(String(default_view))
    ) {
      res.status(400).json({ error: 'Invalid default_view value' });
      return;
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (auto_import_steam_games !== undefined) {
      updateData.auto_import_steam_games = auto_import_steam_games;
    }
    if (sync_steam_playtime !== undefined) {
      updateData.sync_steam_playtime = sync_steam_playtime;
    }
    if (default_game_status !== undefined) {
      updateData.default_game_status = default_game_status;
    }
    if (default_view !== undefined) {
      updateData.default_view = default_view;
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(updatedUser);
  } catch (error: unknown) {
    console.error('Error updating user profile:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to update user profile',
      details: errorMessage,
    });
  }
};
