import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import { Client, Databases, Query, ID, AppwriteException } from 'node-appwrite';
import config from './config';
import { passport, User } from './auth/steam-auth';
import { syncUserWithSteam } from './services/user-steam-sync-service';

const app = express();
app.set('trust proxy', 1);
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

app.use(cors({
    origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface User {
            $id: string;
            steam_id: string;
            display_name: string;
            avatar_url: string;
            profile_url: string;
            real_name?: string;
            country_code?: string;
            is_public_profile: boolean;
            auto_import_steam_games: boolean;
            sync_steam_playtime: boolean;
            default_game_status: string;
            theme: string;
            default_view: string;
            created_at: string;
            last_steam_sync?: string;
            last_active?: string;
        }
    }
}

// Authentication middleware
function requireAuth(req: Request, res: Response, next: any) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Authentication required' });
}

// Appwrite Client Setup
const appwriteClient = new Client()
    .setEndpoint(config.appwrite.endpoint!)
    .setProject(config.appwrite.projectId!)
    .setKey(config.appwrite.apiKey!);
const appwriteDatabases = new Databases(appwriteClient);

// Authentication routes
app.get('/auth/steam', passport.authenticate('steam'));

app.get('/auth/steam/return',
    passport.authenticate('steam', { failureRedirect: '/' }),
    (req: Request, res: Response) => {
        // Successful authentication, redirect to dashboard
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/dashboard`);
    }
);

app.post('/auth/logout', (req: Request, res: Response) => {
    req.logout((err) => {
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

app.post('/api/user/sync', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        // Trigger the sync in the background and return immediately
        syncUserWithSteam(req.user as User);
        res.status(202).json({ message: 'Sync process started in the background.' });
    } catch (error) {
        console.error('Failed to start user sync:', error);
        res.status(500).json({ error: 'Failed to start sync process.' });
    }
});

// NEW: GET /api/stats - Retrieves stats about the games database
app.get('/api/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const databaseId = config.appwrite.databaseId!;
    const statsCollectionId = 'statistics';

    const statsDocs = await appwriteDatabases.listDocuments(databaseId, statsCollectionId);
    
    const stats = statsDocs.documents.reduce((acc, doc) => {
      acc[doc.key] = doc.count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      totalGames: stats.totalGames || 0,
      updatedGames: stats.updatedGames || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch stats', details: errorMessage });
  }
});

let analyticsCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

app.get('/api/analytics', async (_req: Request, res: Response): Promise<Response | void> => {
    if (analyticsCache && (Date.now() - cacheTimestamp < CACHE_DURATION_MS)) {
        console.log("Serving analytics from cache.");
        return res.json(analyticsCache);
    }

    console.log("Fetching pre-calculated analytics data...");
    try {
        const databaseId = config.appwrite.databaseId!;
        const statsCollectionId = 'statistics';

        const keysToFetch = [
            'analytics_releaseYearDistribution',
            'analytics_genreDistribution'
        ];
        
        const statsResponse = await appwriteDatabases.listDocuments(
            databaseId,
            statsCollectionId,
            [Query.equal('key', keysToFetch)]
        );

        const stats = statsResponse.documents.reduce((acc, doc) => {
            try {
                acc[doc.key] = JSON.parse(doc.value);
            } catch (e) {
                console.error(`Failed to parse stat value for key: ${doc.key}`, e);
                acc[doc.key] = {};
            }
            return acc;
        }, {} as Record<string, any>);

        const getTopN = (dist: Record<string, number>, n: number) => {
            return Object.entries(dist)
                .sort(([, a], [, b]) => b - a)
                .slice(0, n)
                .map(([name, count]) => ({ name, count }));
        };
        
        const analyticsData = {
            releaseYearDistribution: stats['analytics_releaseYearDistribution'] || {},
            genreDistribution: getTopN(stats['analytics_genreDistribution'] || {}, 10),
        };
        
        analyticsCache = analyticsData;
        cacheTimestamp = Date.now();

        res.json(analyticsData);

    } catch (error) {
        console.error('Error fetching analytics:', error);
        const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch analytics', details: errorMessage });
    }
});

app.get('/api/games/most-reviewed', async (_req: Request, res: Response): Promise<void> => {
  try {
    const databaseId = config.appwrite.databaseId!;
    const gamesCollectionId = config.appwrite.gamesCollectionId!;

    const response = await appwriteDatabases.listDocuments(
      databaseId,
      gamesCollectionId,
      [
        Query.orderDesc('total_reviews'),
        Query.limit(10),
        Query.select(['$id', 'name', 'header_image', 'total_reviews', 'steam_appid'])
      ]
    );

    res.json(response.documents);
  } catch (error) {
    console.error('Error fetching most reviewed games:', error);
    const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch most reviewed games', details: errorMessage });
  }
});

app.get('/api/games/search', async (req: Request, res: Response): Promise<void> => {
  const searchQuery = req.query.q as string;

  if (!searchQuery) {
    res.status(400).json({ error: 'Search query (q) is required' });
    return;
  }

  try {
    const databaseId = config.appwrite.databaseId!;
    const gamesCollectionId = config.appwrite.gamesCollectionId!;

    const response = await appwriteDatabases.listDocuments(
      databaseId,
      gamesCollectionId,
      [
        Query.search('name', searchQuery),
        Query.equal('steam_app_type', 'game'), // Only search for actual games
        Query.limit(5)
      ]
    );

    res.json(response.documents);
  } catch (error: any) {
    console.error('Error searching games:', error);
    res.status(500).json({ error: 'Failed to search games', details: error.message });
  }
});

app.get('/api/latest-games-with-achievements', async (_req: Request, res: Response): Promise<void> => {
  try {
    const databaseId = config.appwrite.databaseId!;
    const gamesCollectionId = config.appwrite.gamesCollectionId!;
    const achievementsCollectionId = 'achievements'; // As seen in steam-refresh-service

    // 1. Fetch the 5 most recently updated games that have achievements
    const latestGamesResponse = await appwriteDatabases.listDocuments(
      databaseId,
      gamesCollectionId,
      [
        Query.orderDesc('last_updated'),
        Query.equal('has_steam_achievements', true),
        Query.limit(5),
        Query.select(['$id', 'name', 'steam_appid', 'last_updated'])
      ]
    );

    const latestGames = latestGamesResponse.documents;

    // 2. For each game, fetch its achievements
    const gamesWithAchievements = await Promise.all(
      latestGames.map(async (game) => {
        const achievementsResponse = await appwriteDatabases.listDocuments(
          databaseId,
          achievementsCollectionId,
          [
            Query.equal('steam_appid', game.steam_appid),
            Query.limit(500) // Assuming a game won't have more than 500 achievements
          ]
        );

        return {
          ...game,
          achievements: achievementsResponse.documents,
        };
      })
    );

    res.json(gamesWithAchievements);

  } catch (error) {
    console.error('Error fetching latest games with achievements:', error);
    const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch latest games with achievements', details: errorMessage });
  }
});

app.get('/api/latest-synced-games', async (_req: Request, res: Response): Promise<void> => {
  try {
    const databaseId = config.appwrite.databaseId!;
    const gamesCollectionId = config.appwrite.gamesCollectionId!;
    const achievementsCollectionId = 'achievements';

    // 1. Fetch the 10 most recently updated games
    const latestGamesResponse = await appwriteDatabases.listDocuments(
      databaseId,
      gamesCollectionId,
      [
        Query.isNotNull('last_updated'), // Ensure the game has been synced at least once
        Query.orderDesc('last_updated'),
        Query.limit(10),
      ]
    );

    const latestGames = latestGamesResponse.documents;

    // 2. For each game, fetch its achievements if it has any
    const gamesWithDetails = await Promise.all(
      latestGames.map(async (game) => {
        let achievements: any[] = [];
        if (game.has_steam_achievements) {
          const achievementsResponse = await appwriteDatabases.listDocuments(
            databaseId,
            achievementsCollectionId,
            [
              Query.equal('steam_appid', game.steam_appid),
              Query.limit(1000) // Generous limit for achievements
            ]
          );
          achievements = achievementsResponse.documents;
        }

        return {
          ...game,
          achievements,
        };
      })
    );

    res.json(gamesWithDetails);

  } catch (error) {
    console.error('Error fetching latest synced games:', error);
    const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch latest synced games', details: errorMessage });
  }
});

app.get('/api/latest-steam-games', async (_req: Request, res: Response): Promise<void> => {
  try {
    const databaseId = config.appwrite.databaseId!;
    const gamesCollectionId = config.appwrite.gamesCollectionId!;

    const response = await appwriteDatabases.listDocuments(
      databaseId,
      gamesCollectionId,
      [
        Query.orderDesc('release_date'),
        Query.limit(10),
        Query.select([
            'name', 
            'steam_appid',
            'header_image',
            'total_reviews',
            'release_date'
        ])
      ]
    );

    res.json(response.documents);
  } catch (error) {
    console.error('Error fetching latest steam games:', error);
    const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch latest steam games', details: errorMessage });
  }
});

// User-specific game backlog endpoints

// GET /api/user/games - Get user's game backlog
app.get('/api/user/games', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.$id;
    const databaseId = config.appwrite.databaseId!;
    const userGamesCollectionId = 'user_games';
    const gamesCollectionId = config.appwrite.gamesCollectionId!;

    // Get query parameters for filtering
    const { status, priority, search, limit = 20, offset = 0 } = req.query;

    let queries = [Query.equal('user_id', userId)];
    
    if (status) {
      queries.push(Query.equal('status', status as string));
    }
    if (priority) {
      queries.push(Query.equal('priority', parseInt(priority as string)));
    }
    
    queries.push(Query.limit(parseInt(limit as string)));
    queries.push(Query.offset(parseInt(offset as string)));
    queries.push(Query.orderDesc('updated_at'));

    const userGamesResponse = await appwriteDatabases.listDocuments(
      databaseId,
      userGamesCollectionId,
      queries
    );

    // Fetch full game details for each user game
    const gamesWithDetails = await Promise.all(
      userGamesResponse.documents.map(async (userGame) => {
        const gameResponse = await appwriteDatabases.listDocuments(
          databaseId,
          gamesCollectionId,
          [Query.equal('steam_appid', userGame.steam_appid)]
        );

        const gameDetails = gameResponse.documents[0] || null;
        
        return {
          ...userGame,
          game: gameDetails
        };
      })
    );

    res.json({
      documents: gamesWithDetails,
      total: userGamesResponse.total
    });
  } catch (error) {
    console.error('Error fetching user games:', error);
    const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch user games', details: errorMessage });
  }
});

app.get('/api/user/games/recently-played', requireAuth, async (req: Request, res: Response) => {
    const user = req.user as User;
    const { limit = 5 } = req.query;

    try {
        const response = await appwriteDatabases.listDocuments(
            config.appwrite.databaseId!,
            'user_games',
            [
                Query.equal('user_id', user.$id),
                Query.greaterThan('playtime_2weeks', 0),
                Query.orderDesc('playtime_2weeks'),
                Query.limit(parseInt(limit as string, 10)),
                Query.select(['$id', 'steam_appid', 'playtime_2weeks', 'game_id'])
            ]
        );
        
        // As the response does not automatically resolve the 'game' relation, we may need to fetch it.
        // Assuming the 'game' attribute is a related document ID.
        const gamesWithDetails = await Promise.all(response.documents.map(async (userGame) => {
            if (userGame.game_id) {
                try {
                    const gameDoc = await appwriteDatabases.getDocument(config.appwrite.databaseId!, config.appwrite.gamesCollectionId!, userGame.game_id);
                    return { ...userGame, game: gameDoc };
                } catch (e) {
                     return { ...userGame, game: null }; // Game details not found
                }
            }
            return userGame;
        }));

        res.json(gamesWithDetails);
    } catch (error) {
        console.error('Error fetching recently played games:', error);
        res.status(500).json({ message: 'Failed to fetch recently played games' });
    }
});

// POST /api/user/games - Add game to user's backlog
app.post('/api/user/games', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.$id;
    const { steam_appid, status, priority, user_notes, user_tags } = req.body;

    if (!steam_appid || !status) {
      res.status(400).json({ error: 'steam_appid and status are required' });
      return;
    }

    const databaseId = config.appwrite.databaseId!;
    const userGamesCollectionId = 'user_games';
    const gamesCollectionId = config.appwrite.gamesCollectionId!;

    // Verify the game exists
    const gameExists = await appwriteDatabases.listDocuments(
      databaseId,
      gamesCollectionId,
      [Query.equal('steam_appid', steam_appid)]
    );

    if (gameExists.documents.length === 0) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const gameId = gameExists.documents[0].$id;

    // Check if user already has this game
    const existingUserGame = await appwriteDatabases.listDocuments(
      databaseId,
      userGamesCollectionId,
      [
        Query.equal('user_id', userId),
        Query.equal('steam_appid', steam_appid)
      ]
    );

    const gameData = {
      user_id: userId,
      game_id: gameId,
      steam_appid: steam_appid,
      status: status,
      priority: priority || 3,
      user_notes: user_notes || '',
      user_tags: user_tags || [],
      hours_played: 0,
      completion_percentage: 0,
      is_favorite: false,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingUserGame.documents.length > 0) {
      // Update existing
      result = await appwriteDatabases.updateDocument(
        databaseId,
        userGamesCollectionId,
        existingUserGame.documents[0].$id,
        gameData
      );
      // Log activity
      logUserActivity(userId, 'game.updated', { gameName: gameExists.documents[0].name });
    } else {
      // Create new
      result = await appwriteDatabases.createDocument(
        databaseId,
        userGamesCollectionId,
        ID.unique(),
        {
          ...gameData,
          added_at: new Date().toISOString()
        }
      );
      // Log activity
      logUserActivity(userId, 'game.added', { gameName: gameExists.documents[0].name });
    }

    res.json(result);
  } catch (error) {
    console.error('Error adding game to backlog:', error);
    const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to add game to backlog', details: errorMessage });
  }
});

// PUT /api/user/games/:id - Update game status in user's backlog
app.put('/api/user/games/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.$id;
    const gameId = req.params.id;
    const { status, priority, user_rating, user_notes, user_tags, hours_played, completion_percentage, is_favorite } = req.bo    const userGame = await appwriteDatabases.getDocument(
      databaseId,
      userGamesCollectionId,
      gameId
    );

    if (userGame.user_id !== userId) {
      res.status(403).json({ error: 'Forbidden: Not your game' });
      return;
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only update provided fields
    if (status !== undefined) {
        updateData.status = status;
        // Log activity based on status change
        if (status === 'completed' || status === 'completed_100') {
            // Fetch game name for activity logging
            const gameResponse = await appwriteDatabases.listDocuments(
              databaseId,
              config.appwrite.gamesCollectionId!,
              [Query.equal('steam_appid', userGame.steam_appid)]
            );
            const gameName = gameResponse.documents[0]?.name || 'Unknown Game';
            logUserActivity(userId, 'game.completed', { gameName });
            updateData.completed_at = new Date().toISOString();
        } else if (status === 'currently_playing' && userGame.status !== 'currently_playing') {
            // Fetch game name for activity logging
            const gameResponse = await appwriteDatabases.listDocuments(
              databaseId,
              config.appwrite.gamesCollectionId!,
              [Query.equal('steam_appid', userGame.steam_appid)]
            );
            const gameName = gameResponse.documents[0]?.name || 'Unknown Game';
            logUserActivity(userId, 'game.started', { gameName });
        }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (user_rating !== undefined) updateData.user_rating = user_rating;
    if (user_notes !== undefined) updateData.user_notes = user_notes;
    if (user_tags !== undefined) updateData.user_tags = user_tags;
    if (hours_played !== undefined) updateData.hours_played = hours_played;
    if (completion_percentage !== undefined) updateData.completion_percentage = completion_percentage;
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite;

    // Set completion date if marking as completed
    if ((status === 'completed' || status === 'completed_100') && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    const result = await appwriteDatabases.updateDocument(
      databaseId,
      userGamesCollectionId,
      gameId,
      updateData
    );

    res.json(result);
  } catch (error) {
    console.error('Error updating user game:', error);
    const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to update game', details: errorMessage });
  }
});

// DELETE /api/user/games/:id - Remove game from user's backlog
app.delete('/api/user/games/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.$id;
    const gameId = req.params.id;

    const databaseId = config.appwrite.databaseId!;
    const userGamesCollectionId = 'user_games';

    // Verify ownership
    const userGame = await appwriteDatabases.getDocument(
      databaseId,
      userGamesCollectionId,
      gameId
    );

    if (userGame.user_id !== userId) {
      res.status(403).json({ error: 'Forbidden: Not your game' });
      return;
    }

    await appwriteDatabases.deleteDocument(
      databaseId,
      userGamesCollectionId,
      gameId
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing game from backlog:', error);
    const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to remove game from backlog', details: errorMessage });
  }
});

// GET /api/user/stats - Get user's gaming statistics
app.get('/api/user/stats', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.$id;
    const databaseId = config.appwrite.databaseId!;
    const userGamesCollectionId = 'user_games';

    // Get various stats in parallel
    const [
      totalGames,
      completedGames,
      currentlyPlaying,
      wantToPlay,
      onHold,
      dropped
    ] = await Promise.all([
      appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
        Query.equal('user_id', userId),
        Query.select(['$id'])
      ]),
      appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
        Query.equal('user_id', userId),
        Query.equal('status', 'completed'),
        Query.select(['$id'])
      ]),
      appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
        Query.equal('user_id', userId),
        Query.equal('status', 'currently_playing'),
        Query.select(['$id'])
      ]),
      appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
        Query.equal('user_id', userId),
        Query.equal('status', 'want_to_play'),
        Query.select(['$id'])
      ]),
      appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
        Query.equal('user_id', userId),
        Query.equal('status', 'on_hold'),
        Query.select(['$id'])
      ]),
      appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
        Query.equal('user_id', userId),
        Query.equal('status', 'dropped'),
        Query.select(['$id'])
      ])
    ]);

    const stats = {
      totalGames: totalGames.total,
      completedGames: completedGames.total,
      currentlyPlaying: currentlyPlaying.total,
      wantToPlay: wantToPlay.total,
      onHold: onHold.total,
      dropped: dropped.total,
      completionPercentage: totalGames.total > 0 
        ? Math.round((completedGames.total / totalGames.total) * 100) 
        : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch user stats', details: errorMessage });
  }
});

// Helper function to log user activity
async function logUserActivity(userId: string, type: string, metadata: object) {
    try {
        await appwriteDatabases.createDocument(
            config.appwrite.databaseId!,
            'user_activity', // Assuming this collection exists
            ID.unique(),
            {
                user_id: userId,
                type: type,
                timestamp: new Date().toISOString(),
                metadata_json: JSON.stringify(metadata)
            }
        );
    } catch (error) {
        console.error(`Failed to log user activity of type ${type} for user ${userId}:`, error);
    }
}

// GET /api/user/stats/extended - Get user's extended gaming statistics
app.get('/api/user/stats/extended', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.$id;
        const databaseId = config.appwrite.databaseId!;
        const userGamesCollectionId = 'user_games';

        const userGames = await appwriteDatabases.listDocuments(
            databaseId,
            userGamesCollectionId,
            [Query.equal('user_id', userId), Query.limit(5000)] // A high limit to get all games
        );

        const totalHoursPlayed = userGames.documents.reduce((sum, game) => sum + (game.hours_played || 0), 0);

        res.json({
            totalHoursPlayed: Math.round(totalHoursPlayed * 100) / 100, // Round to 2 decimal places
        });

    } catch (error) {
        console.error('Error fetching user extended stats:', error);
        const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch user extended stats', details: errorMessage });
    }
});

// GET /api/user/achievements/recent - Get user's most recent achievements
app.get('/api/user/achievements/recent', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.$id;
        const databaseId = config.appwrite.databaseId!;
        const userAchievementsCollectionId = 'user_achievements';
        const achievementsCollectionId = 'achievements';
        const gamesCollectionId = config.appwrite.gamesCollectionId!;

        // Fetch 5 most recent unlocked achievements
        const recentUserAchievements = await appwriteDatabases.listDocuments(
            databaseId,
            userAchievementsCollectionId,
            [
                Query.equal('user_id', userId),
                Query.equal('is_unlocked', true),
                Query.orderDesc('unlock_time'),
                Query.limit(5)
            ]
        );

        // Enhance with full achievement and game details
        const detailedAchievements = await Promise.all(
            recentUserAchievements.documents.map(async (userAch) => {
                // Fetch base achievement details
                const achievementDetails = await appwriteDatabases.listDocuments(
                    databaseId,
                    achievementsCollectionId,
                    [Query.equal('api_name', userAch.achievement_api_name), Query.limit(1)]
                );
                
                // Fetch game details
                const gameDetails = await appwriteDatabases.listDocuments(
                    databaseId,
                    gamesCollectionId,
                    [Query.equal('steam_appid', userAch.steam_appid), Query.limit(1)]
                );

                return {
                    ...userAch,
                    achievement: achievementDetails.documents[0] || null,
                    game: gameDetails.documents[0] || null,
                };
            })
        );

        res.json(detailedAchievements);

    } catch (error) {
        console.error('Error fetching recent achievements:', error);
        const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch recent achievements', details: errorMessage });
    }
});

// GET /api/user/activity - Get user's most recent activities
app.get('/api/user/activity', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.$id;
        const response = await appwriteDatabases.listDocuments(
            config.appwrite.databaseId!,
            'user_activity',
            [
                Query.equal('user_id', userId),
                Query.orderDesc('timestamp'),
                Query.limit(10)
            ]
        );
        res.json(response.documents);
    } catch (error) {
        console.error('Error fetching user activity:', error);
        const errorMessage = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch user activity', details: errorMessage });
    }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API server listening on port ${port}`);
});
