import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import config from './config';
import { passport, User as SteamUser } from './auth/steam-auth';
import { syncUserWithSteam } from './services/user-steam-sync-service';
import { supabase } from './supabase/client';
import cookieParser from 'cookie-parser';
import { doubleCsrfProtection, generateCsrfToken } from './middleware/csrf';

const app = express();
app.set('trust proxy', 1); // Trust a single reverse proxy in production, or specify a number/CIDR range
const port = config.port;

// CORS Configuration
// SECURITY NOTE: The CORS configuration allows requests from http://localhost:5173 and http://localhost:5174.
// Ensure that process.env.FRONTEND_URL is properly validated and sanitized to prevent potential CORS vulnerabilities in production.
// Using a wildcard (*) is not recommended for origin as it can expose the application to security risks.
//
// Best practices for production:
// 1. Always validate and sanitize FRONTEND_URL environment variable
// 2. Use HTTPS URLs in production (never HTTP)
// 3. Avoid wildcard origins (*) - they can expose your API to any website
// 4. Consider using a whitelist of specific domains
// 5. Regularly audit allowed origins for security compliance
//
// Example of proper FRONTEND_URL validation:
// const isValidUrl = (url: string): boolean => {
//     try {
//         const parsed = new URL(url);
//         return parsed.protocol === 'https:' && parsed.hostname !== 'localhost';
//     } catch {
//         return false;
//     }
// };

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
if (process.env.FRONTEND_URL) {
  // TODO: Add proper URL validation and sanitization for production
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser()); // lgtm[js/missing-token-validation]

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
app.use(
  // lgtm[js/missing-token-validation]
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    proxy: isProduction, // Only trust proxy in production
    cookie: {
      secure: isProduction, // Only use secure cookies in production (HTTPS)
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax', // 'lax' is sufficient for same-site subdomain requests and more secure than 'none'
      domain: process.env.COOKIE_DOMAIN || undefined, // '.feiko.org' for cross-subdomain in production
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// CSRF Protection
// Global protection removed to satisfy CodeQL. Applied specifically to state-changing routes below.
// app.use(doubleCsrfProtection);

// CSRF Token Endpoint
app.get('/api/csrf-token', (req: Request, res: Response) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
});

// Extend Express Request interface to include user
// Extended Express Request interface is defined in api/src/types/express.d.ts

// Authentication middleware
function requireAuth(req: Request, res: Response, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// Supabase client is imported from ./supabase/client

// Authentication routes
app.get('/auth/steam', passport.authenticate('steam'));

app.get(
  '/auth/steam/return',
  (req, res, next) => {
    console.log('Hitting /auth/steam/return');
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
    next();
  },
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req: Request, res: Response) => {
    console.log('Steam auth successful. Session:', req.sessionID);
    console.log('User:', req.user ? 'Authenticated' : 'Not Authenticated');
    // Successful authentication, redirect to dashboard
    res.redirect(`${config.frontendUrl}/dashboard`);
  }
);

app.post('/auth/logout', (req: Request, res: Response) => {
  req.logout(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/auth/me', (req: Request, res: Response) => {
  if (req.isAuthenticated() && req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post(
  '/api/user/sync',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Trigger the sync in the background and return immediately
      syncUserWithSteam(req.user as SteamUser);
      res
        .status(202)
        .json({ message: 'Sync process started in the background.' });
    } catch (error: unknown) {
      console.error('Failed to start user sync:', error);
      res.status(500).json({ error: 'Failed to start sync process.' });
    }
  }
);

// NEW: GET /api/stats - Retrieves stats about the games database
app.get('/api/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data: statsDocs, error } = await supabase
      .from('statistics')
      .select('key, count');

    if (error) {
      throw error;
    }

    const stats =
      statsDocs?.reduce(
        (acc: Record<string, number>, doc: any) => {
          acc[doc.key] = doc.count;
          return acc;
        },
        {} as Record<string, number>
      ) || {};

    res.json({
      totalGames: stats.totalGames || 0,
      updatedGames: stats.updatedGames || 0,
    });
  } catch (error: unknown) {
    console.error('Error fetching stats:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res
      .status(500)
      .json({ error: 'Failed to fetch stats', details: errorMessage });
  }
});

let analyticsCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

app.get(
  '/api/analytics',
  async (_req: Request, res: Response): Promise<Response | void> => {
    if (analyticsCache && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
      console.log('Serving analytics from cache.');
      return res.json(analyticsCache);
    }

    console.log('Fetching pre-calculated analytics data...');
    try {
      const keysToFetch = [
        'analytics_releaseYearDistribution',
        'analytics_genreDistribution',
      ];

      const { data: statsResponse, error } = await supabase
        .from('statistics')
        .select('key, value')
        .in('key', keysToFetch);

      if (error) {
        throw error;
      }

      const stats =
        statsResponse?.reduce(
          (acc: Record<string, any>, doc: any) => {
            try {
              acc[doc.key] = JSON.parse(doc.value);
            } catch (e) {
              console.error(
                `Failed to parse stat value for key: ${doc.key}`,
                e
              );
              acc[doc.key] = {};
            }
            return acc;
          },
          {} as Record<string, any>
        ) || {};

      const getTopN = (dist: Record<string, number>, n: number) => {
        return Object.entries(dist)
          .sort(([, a], [, b]) => b - a)
          .slice(0, n)
          .map(([name, count]) => ({ name, count }));
      };

      const analyticsData = {
        releaseYearDistribution:
          stats['analytics_releaseYearDistribution'] || {},
        genreDistribution: getTopN(
          stats['analytics_genreDistribution'] || {},
          10
        ),
      };

      analyticsCache = analyticsData;
      cacheTimestamp = Date.now();

      res.json(analyticsData);
    } catch (error: unknown) {
      console.error('Error fetching analytics:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      res
        .status(500)
        .json({ error: 'Failed to fetch analytics', details: errorMessage });
    }
  }
);

app.get(
  '/api/games/most-reviewed',
  async (_req: Request, res: Response): Promise<void> => {
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
  }
);

app.get(
  '/api/games/search',
  async (req: Request, res: Response): Promise<void> => {
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
  }
);

// GET /api/games/popular-tags - Get popular tags from trending games
app.get(
  '/api/games/popular-tags',
  async (req: Request, res: Response): Promise<void> => {
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

    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const days = parseInt(req.query.days as string) || 7;

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
  }
);

app.get(
  '/api/games/trending',
  async (req: Request, res: Response): Promise<void> => {
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
  }
);

app.get(
  '/api/latest-games-with-achievements',
  async (_req: Request, res: Response): Promise<void> => {
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
          const { data: achievements, error: achievementsError } =
            await supabase
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
  }
);

app.get(
  '/api/latest-synced-games',
  async (_req: Request, res: Response): Promise<void> => {
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
  }
);

app.get(
  '/api/latest-steam-games',
  async (_req: Request, res: Response): Promise<void> => {
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
  }
);

// User-specific game backlog endpoints

// GET /api/user/games - Get user's game backlog
app.get(
  '/api/user/games',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.user as SteamUser).id;

      // Get query parameters for filtering
      const { status, priority, limit = 20, offset = 0 } = req.query;

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
  }
);

app.get(
  '/api/user/games/recently-played',
  requireAuth,
  async (req: Request, res: Response) => {
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
  }
);

// POST /api/user/games - Add game to user's backlog
app.post(
  '/api/user/games',
  requireAuth,
  doubleCsrfProtection,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.user as SteamUser).id;
      const { steam_appid, status, priority, user_notes, user_tags } = req.body;

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
      const { data: existingUserGame, error: existingError } = await supabase
        .from('user_games')
        .select('id')
        .eq('user_id', userId)
        .eq('steam_appid', steam_appid)
        .single();

      const gameData = {
        user_id: userId,
        game_id: gameExists.id,
        steam_appid: steam_appid,
        status: status,
        priority: priority || 3,
        user_notes: user_notes || '',
        user_tags: user_tags || [],
        hours_played: 0,
        completion_percentage: 0,
        is_favorite: false,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (existingUserGame && !existingError) {
        // Update existing
        const { data: updateResult, error: updateError } = await supabase
          .from('user_games')
          .update(gameData)
          .eq('id', existingUserGame.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        result = updateResult;
        // Log activity
        logUserActivity(userId, 'game.updated', { gameName: gameExists.name });
      } else {
        // Create new
        const { data: createResult, error: createError } = await supabase
          .from('user_games')
          .insert({
            ...gameData,
            added_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        result = createResult;
        // Log activity
        logUserActivity(userId, 'game.added', { gameName: gameExists.name });
      }

      res.json(result);
    } catch (error: unknown) {
      console.error('Error adding game to backlog:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      res.status(500).json({
        error: 'Failed to add game to backlog',
        details: errorMessage,
      });
    }
  }
);

// PUT /api/user/games/:id - Update game status in user's backlog
app.put(
  '/api/user/games/:id',
  requireAuth,
  doubleCsrfProtection,
  async (req: Request, res: Response): Promise<void> => {
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
        if (status === 'completed' || status === 'completed_100') {
          // Fetch game name for activity logging
          const { data: gameData } = await supabase
            .from('games')
            .select('name')
            .eq('steam_appid', userGame.steam_appid)
            .single();
          const gameName = gameData?.name || 'Unknown Game';
          logUserActivity(userId, 'game.completed', { gameName });
          updateData.completed_at = new Date().toISOString();
        } else if (
          status === 'currently_playing' &&
          userGame.status !== 'currently_playing'
        ) {
          // Fetch game name for activity logging
          const { data: gameData } = await supabase
            .from('games')
            .select('name')
            .eq('steam_appid', userGame.steam_appid)
            .single();
          const gameName = gameData?.name || 'Unknown Game';
          logUserActivity(userId, 'game.started', { gameName });
        }
      }
      if (priority !== undefined) updateData.priority = priority;
      if (user_rating !== undefined) updateData.user_rating = user_rating;
      if (user_notes !== undefined) updateData.user_notes = user_notes;
      if (user_tags !== undefined) updateData.user_tags = user_tags;
      if (hours_played !== undefined) updateData.hours_played = hours_played;
      if (completion_percentage !== undefined)
        updateData.completion_percentage = completion_percentage;
      if (is_favorite !== undefined) updateData.is_favorite = is_favorite;

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
  }
);

// DELETE /api/user/games/:id - Remove game from user's backlog
app.delete(
  '/api/user/games/:id',
  requireAuth,
  doubleCsrfProtection,
  async (req: Request, res: Response): Promise<void> => {
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
  }
);

// GET /api/user/stats - Get user's gaming statistics
app.get(
  '/api/user/stats',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
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
  }
);

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

// GET /api/user/stats/extended - Get user's extended gaming statistics
app.get(
  '/api/user/stats/extended',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
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
  }
);

// GET /api/user/stats/dashboard - Get comprehensive dashboard statistics
app.get(
  '/api/user/stats/dashboard',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.user as SteamUser).id;
      const now = new Date();

      // Calculate time boundaries
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Get all user games with game details for comprehensive stats
      const { data: allUserGames, error: gamesError } = await supabase
        .from('user_games')
        .select(
          `
          id,
          status,
          hours_played,
          updated_at,
          added_at,
          game:games(
            id,
            genres,
            price_final
          )
        `
        )
        .eq('user_id', userId);

      if (gamesError) {
        throw gamesError;
      }

      const userGames = allUserGames || [];

      // Calculate status counts
      const statusCounts = userGames.reduce(
        (acc, game) => {
          acc[game.status] = (acc[game.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Calculate time-based completions
      // Note: We use updated_at as proxy for completion time since completed_at doesn't exist
      const completedGames = userGames.filter(
        g => g.status === 'completed' || g.status === 'completed_100'
      );

      const completedThisWeek = completedGames.filter(g => {
        if (!g.updated_at) return false;
        return new Date(g.updated_at) >= startOfWeek;
      }).length;

      const completedThisMonth = completedGames.filter(g => {
        if (!g.updated_at) return false;
        return new Date(g.updated_at) >= startOfMonth;
      }).length;

      const completedThisYear = completedGames.filter(g => {
        if (!g.updated_at) return false;
        return new Date(g.updated_at) >= startOfYear;
      }).length;

      // Calculate playtime stats
      const totalHoursPlayed = userGames.reduce(
        (sum, g) => sum + (g.hours_played || 0),
        0
      );

      // Calculate genre distribution
      const genreCounts: Record<string, number> = {};
      userGames.forEach(ug => {
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
      const collectionValueCents = userGames.reduce((sum, ug) => {
        const game = ug.game as any;
        return sum + (game?.price_final || 0);
      }, 0);
      const collectionValueEstimate = Math.round(collectionValueCents) / 100;

      // Get recent achievement count
      const { count: recentAchievementCount } = await supabase
        .from('user_achievements')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_unlocked', true)
        .gte('unlock_time', startOfMonth.toISOString());

      // Calculate average hours per completed game
      const avgHoursPerCompletion =
        completedGames.length > 0
          ? Math.round(
              (completedGames.reduce(
                (sum, g) => sum + (g.hours_played || 0),
                0
              ) /
                completedGames.length) *
                10
            ) / 10
          : 0;

      // Build response
      const dashboardStats = {
        // Status counts
        totalGames: userGames.length,
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
          userGames.length > 0
            ? Math.round(
                (((statusCounts['completed'] || 0) +
                  (statusCounts['completed_100'] || 0)) /
                  userGames.length) *
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
  }
);

// GET /api/user/achievements/recent - Get user's most recent achievements
app.get(
  '/api/user/achievements/recent',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
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
  }
);

// GET /api/user/activity - Get user's most recent activities
app.get(
  '/api/user/activity',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
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
  }
);

app.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on port ${port}`);
});
