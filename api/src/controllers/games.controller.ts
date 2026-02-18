import { Request, Response } from 'express';
import { supabase } from '../supabase/client';
import { getSteamTopSellers } from '../services/steam-charts-service';

// Steam tag ID to name mapping (most common tags)
const steamTagIdToName: Record<string, string> = {
  // Genres
  '19': 'Action',
  '21': 'Adventure',
  '122': 'RPG',
  '9': 'Strategy',
  '599': 'Simulation',
  '4166': 'Sports',
  '1773': 'Racing',
  '1774': 'Puzzle',
  '4191': 'Casual',
  '3959': 'Indie',
  '4182': 'Singleplayer',
  '492': 'Free to Play',
  '128': 'Multiplayer',
  '1775': 'Co-op',
  '3843': 'Online Co-Op',
  '3841': 'Local Co-Op',
  '3871': 'Local Multiplayer',
  '1685': 'Open World',
  '1742': 'First-Person',
  '1697': 'Third Person',
  '1664': 'FPS',
  '1770': 'Shooter',
  '3964': 'Platformer',
  '3839': 'Horror',
  '1667': 'Survival',
  '4106': 'Action RPG',
  '1695': 'Turn-Based',
  '1677': 'Turn-Based Strategy',
  '101': 'Real Time Tactics',
  '4231': 'Fighting',
  '4736': 'Visual Novel',
  '4486': 'Story Rich',
  '1654': 'Relaxing',
  '5350': 'Building',
  '4325': 'City Builder',
  '4474': 'Sandbox',
  '1702': 'Crafting',
  '7250': 'Resource Management',
  '4064': 'Exploration',
  '1662': 'Sci-fi',
  '3942': 'Fantasy',
  '21978': 'VR',
  '113': 'Massively Multiplayer',
  '4026': 'Difficult',
  '5716': 'Roguelike',
  '1716': 'Roguelite',
  '6730': 'Deckbuilder',
  '1625': 'Card Game',
  '5537': 'Souls-like',
  '1628': 'Metroidvania',
  '4695': 'Anime',
  '4085': 'Atmospheric',
  '4295': 'Stealth',
  '5711': 'Team-Based',
  '1100687': 'PvP',
  '1100689': 'PvE',
  '3834': 'Competitive',
  '29482': 'Immersive Sim',
  '3810': 'Controller Support',
  '7368': 'Steam Achievements',
  '8945': 'Mod Support',
  '9130': 'Steam Workshop',
  '3859': '2D',
  '4004': '3D',
  '4726': 'Cute',
  '1720': 'Dungeon Crawler',
  '1708': 'Tactical',
  '1659': 'Zombies',
  '7743': 'Soundtrack',
  '4747': 'Character Customization',
  '5613': 'Detective',
  '1719': 'Comedy',
  '4684': 'Military',
  '4604': 'World War II',
  '10235': 'Level Editor',
  '4835': 'Retro',
  '3978': 'Pixel Graphics',
  '4195': 'Minimalist',
  '87918': 'Farming Sim',
  '17894': 'Base Building',
  '6915': 'Hack and Slash',
  '5547': 'Arena Shooter',
  '6129': 'Logic',
  '1710': 'Dark',
  '1721': 'Battle Royale',
};

export const getMostReviewed = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const { data: games, error } = await supabase
      .from('games')
      .select('id, name, header_image, total_reviews, steam_appid')
      .order('total_reviews', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    res.json(games || []);
  } catch (error: unknown) {
    console.error('Error fetching most reviewed games:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to fetch most reviewed games',
      details: errorMessage,
    });
  }
};

export const searchGames = async (
  req: Request,
  res: Response
): Promise<void> => {
  const searchQuery = req.query.q as string;

  if (!searchQuery) {
    res.status(400).json({ error: 'Search query (q) is required' });
    return;
  }

  try {
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .ilike('name', `%${searchQuery}%`)
      .eq('steam_app_type', 'game') // Only search for actual games
      .limit(5);

    if (error) {
      throw error;
    }

    res.json(games || []);
  } catch (error: unknown) {
    console.error('Error searching games:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res
      .status(500)
      .json({ error: 'Failed to search games', details: errorMessage });
  }
};

export const getPopularTags = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const days = parseInt(req.query.days as string) || 30;

    // Get trending games from the past N days
    const date = new Date();
    date.setDate(date.getDate() - days);

    const { data: games, error } = await supabase
      .from('games')
      .select('tags, current_players')
      .eq('steam_app_type', 'game')
      .not('current_players', 'is', null)
      .not('tags', 'is', null)
      .gte('player_count_last_updated', date.toISOString())
      .order('current_players', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    // Aggregate tags with weighted counts based on player count
    const tagCounts: Record<string, { count: number; totalPlayers: number }> =
      {};

    for (const game of games || []) {
      if (game.tags && Array.isArray(game.tags)) {
        const playerWeight = game.current_players || 1;
        for (const tagId of game.tags) {
          // Only count tags we have names for
          const tagName = steamTagIdToName[tagId];
          if (tagName) {
            if (!tagCounts[tagName]) {
              tagCounts[tagName] = { count: 0, totalPlayers: 0 };
            }
            tagCounts[tagName].count += 1;
            tagCounts[tagName].totalPlayers += playerWeight;
          }
        }
      }
    }

    // Sort by total players (weighted popularity)
    const sortedTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b.totalPlayers - a.totalPlayers)
      .slice(0, limit)
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalPlayers: data.totalPlayers,
      }));

    res.json(sortedTags);
  } catch (error: unknown) {
    console.error('Error fetching popular tags:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to fetch popular tags',
      details: errorMessage,
    });
  }
};

export const getTrendingGames = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const days = parseInt(req.query.days as string);

    let query = supabase
      .from('games')
      .select('*')
      .eq('steam_app_type', 'game')
      .not('current_players', 'is', null) // Filter out games with no player count
      .order('current_players', { ascending: false })
      .limit(limit);

    if (!isNaN(days) && days > 0) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      query = query.gte('release_date', date.toISOString());
    }

    const { data: games, error } = await query;

    if (error) {
      throw error;
    }

    res.json(games || []);
  } catch (error: unknown) {
    console.error('Error fetching trending games:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to fetch trending games',
      details: errorMessage,
    });
  }
};

export const getLatestGamesWithAchievements = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. Fetch the 5 most recently updated games that have achievements
    const { data: latestGames, error: gamesError } = await supabase
      .from('games')
      .select('id, name, steam_appid, last_updated')
      .eq('has_steam_achievements', true)
      .order('last_updated', { ascending: false })
      .limit(5);

    if (gamesError) {
      throw gamesError;
    }

    // 2. For each game, fetch its achievements
    const gamesWithAchievements = await Promise.all(
      (latestGames || []).map(async game => {
        const { data: achievements, error: achievementsError } = await supabase
          .from('achievements')
          .select('*')
          .eq('steam_appid', game.steam_appid)
          .limit(500); // Assuming a game won't have more than 500 achievements

        if (achievementsError) {
          console.error(
            `Error fetching achievements for game ${game.steam_appid}:`,
            achievementsError
          );
        }

        return {
          ...game,
          achievements: achievements || [],
        };
      })
    );

    res.json(gamesWithAchievements);
  } catch (error: unknown) {
    console.error('Error fetching latest games with achievements:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to fetch latest games with achievements',
      details: errorMessage,
    });
  }
};

export const getLatestSyncedGames = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. Fetch the 10 most recently updated games
    const { data: latestGames, error: gamesError } = await supabase
      .from('games')
      .select('*')
      .not('last_updated', 'is', null) // Ensure the game has been synced at least once
      .order('last_updated', { ascending: false })
      .limit(10);

    if (gamesError) {
      throw gamesError;
    }

    // 2. For each game, fetch its achievements if it has any
    const gamesWithDetails = await Promise.all(
      (latestGames || []).map(async game => {
        let achievements: any[] = [];
        if (game.has_steam_achievements) {
          const { data: achievementsData, error: achievementsError } =
            await supabase
              .from('achievements')
              .select('*')
              .eq('steam_appid', game.steam_appid)
              .limit(1000); // Generous limit for achievements

          if (achievementsError) {
            console.error(
              `Error fetching achievements for game ${game.steam_appid}:`,
              achievementsError
            );
          } else {
            achievements = achievementsData || [];
          }
        }

        return {
          ...game,
          achievements,
        };
      })
    );

    res.json(gamesWithDetails);
  } catch (error: unknown) {
    console.error('Error fetching latest synced games:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to fetch latest synced games',
      details: errorMessage,
    });
  }
};

export const getLatestSteamGames = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const { data: games, error } = await supabase
      .from('games')
      .select('name, steam_appid, header_image, total_reviews, release_date')
      .order('release_date', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    res.json(games || []);
  } catch (error: unknown) {
    console.error('Error fetching latest steam games:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to fetch latest steam games',
      details: errorMessage,
    });
  }
};

export const getTopSellers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const topSellers = await getSteamTopSellers();
    res.json(topSellers);
  } catch (error: unknown) {
    console.error('Error fetching top sellers:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res
      .status(500)
      .json({ error: 'Failed to fetch top sellers', details: errorMessage });
  }
};
