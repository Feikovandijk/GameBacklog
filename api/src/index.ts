import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import config from './config';
import { passport, User } from './auth/steam-auth';
import { syncUserWithSteam } from './services/user-steam-sync-service';
import { driver as neo4jDriver } from './neo4j/client';

const app = express();
app.set('trust proxy', 1);
const port = config.port;

// CORS Configuration
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: (origin, callback) => {
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
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface User {
            id: string;
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

// Authentication routes
app.get('/auth/steam', passport.authenticate('steam'));

app.get('/auth/steam/return',
    passport.authenticate('steam', { failureRedirect: '/' }),
    (req: Request, res: Response) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
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
        syncUserWithSteam(req.user as User);
        res.status(202).json({ message: 'Sync process started in the background.' });
    } catch (error: unknown) {
        console.error('Failed to start user sync:', error);
        res.status(500).json({ error: 'Failed to start sync process.' });
    }
});

// NEW: GET /api/stats - Retrieves stats about the games database
app.get('/api/stats', async (_req: Request, res: Response): Promise<void> => {
  const session = neo4jDriver.session();
  try {
    const totalGamesResult = await session.run('MATCH (g:Game) RETURN count(g) AS totalGames');
    const updatedGamesResult = await session.run('MATCH (g:Game) WHERE g.last_updated IS NOT NULL RETURN count(g) AS updatedGames');

    const totalGames = totalGamesResult.records[0].get('totalGames').low;
    const updatedGames = updatedGamesResult.records[0].get('updatedGames').low;

    res.json({
      totalGames: totalGames || 0,
      updatedGames: updatedGames || 0,
    });
  } catch (error: unknown) {
    console.error('Error fetching stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch stats', details: errorMessage });
  } finally {
    await session.close();
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
    const session = neo4jDriver.session();
    try {
        const releaseYearResult = await session.run(`
            MATCH (g:Game)
            WHERE g.release_date IS NOT NULL
            WITH g.release_date AS releaseDate
            RETURN substring(releaseDate, 0, 4) AS year, count(*) AS count
            ORDER BY year DESC
        `);

        const genreResult = await session.run(`
            MATCH (g:Game)-[:IN_GENRE]->(gn:Genre)
            RETURN gn.name AS name, count(g) AS count
            ORDER BY count DESC
            LIMIT 10
        `);

        const releaseYearDistribution = releaseYearResult.records.reduce((acc: Record<string, number>, record: any) => {
            acc[record.get('year')] = record.get('count').low;
            return acc;
        }, {});

        const genreDistribution = genreResult.records.map((record: any) => ({
            name: record.get('name'),
            count: record.get('count').low,
        }));

        const analyticsData = {
            releaseYearDistribution,
            genreDistribution,
        };

        analyticsCache = analyticsData;
        cacheTimestamp = Date.now();

        res.json(analyticsData);

    } catch (error: unknown) {
        console.error('Error fetching analytics:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch analytics', details: errorMessage });
    } finally {
        await session.close();
    }
});

app.get('/api/games/most-reviewed', async (_req: Request, res: Response): Promise<void> => {
  const session = neo4jDriver.session();
  try {
    const result = await session.run(`
      MATCH (g:Game)
      RETURN g
      ORDER BY g.total_reviews DESC
      LIMIT 10
    `);

    const games = result.records.map((record: any) => record.get('g').properties);

    res.json(games || []);
  } catch (error: unknown) {
    console.error('Error fetching most reviewed games:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch most reviewed games', details: errorMessage });
  } finally {
    await session.close();
  }
});

app.get('/api/games/search', async (req: Request, res: Response): Promise<void> => {
  const searchQuery = req.query.q as string;

  if (!searchQuery) {
    res.status(400).json({ error: 'Search query (q) is required' });
    return;
  }

  const session = neo4jDriver.session();
  try {
    const result = await session.run(`
      MATCH (g:Game)
      WHERE g.name CONTAINS $searchQuery AND g.steam_app_type = 'game'
      RETURN g
      LIMIT 5
    `, { searchQuery });

    const games = result.records.map((record: any) => record.get('g').properties);

    res.json(games || []);
  } catch (error: unknown) {
    console.error('Error searching games:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to search games', details: errorMessage });
  } finally {
    await session.close();
  }
});

app.get('/api/latest-games-with-achievements', async (_req: Request, res: Response): Promise<void> => {
  const session = neo4jDriver.session();
  try {
    const result = await session.run(`
      MATCH (g:Game)
      WHERE g.has_steam_achievements = true
      WITH g
      ORDER BY g.last_updated DESC
      LIMIT 5
      MATCH (g)-[:HAS_ACHIEVEMENT]->(a:Achievement)
      RETURN g, collect(a) AS achievements
    `);

    const gamesWithAchievements = result.records.map((record: any) => {
      const game = record.get('g').properties;
      const achievements = record.get('achievements').map((achievement: any) => achievement.properties);
      return {
        ...game,
        achievements,
      };
    });

    res.json(gamesWithAchievements);

  } catch (error: unknown) {
    console.error('Error fetching latest games with achievements:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch latest games with achievements', details: errorMessage });
  } finally {
    await session.close();
  }
});

app.get('/api/latest-synced-games', async (_req: Request, res: Response): Promise<void> => {
  const session = neo4jDriver.session();
  try {
    const result = await session.run(`
      MATCH (g:Game)
      WHERE g.last_updated IS NOT NULL
      WITH g
      ORDER BY g.last_updated DESC
      LIMIT 10
      OPTIONAL MATCH (g)-[:HAS_ACHIEVEMENT]->(a:Achievement)
      RETURN g, collect(a) AS achievements
    `);

    const gamesWithDetails = result.records.map((record: any) => {
      const game = record.get('g').properties;
      const achievements = record.get('achievements').map((achievement: any) => achievement.properties);
      return {
        ...game,
        achievements,
      };
    });

    res.json(gamesWithDetails);

  } catch (error: unknown) {
    console.error('Error fetching latest synced games:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch latest synced games', details: errorMessage });
  } finally {
    await session.close();
  }
});

app.get('/api/latest-steam-games', async (_req: Request, res: Response): Promise<void> => {
  const session = neo4jDriver.session();
  try {
    const result = await session.run(`
      MATCH (g:Game)
      RETURN g
      ORDER BY g.release_date DESC
      LIMIT 10
    `);

    const games = result.records.map((record: any) => record.get('g').properties);

    res.json(games || []);
  } catch (error: unknown) {
    console.error('Error fetching latest steam games:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch latest steam games', details: errorMessage });
  } finally {
    await session.close();
  }
});

// User-specific game backlog endpoints

// GET /api/user/games - Get user's game backlog
app.get('/api/user/games', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const session = neo4jDriver.session();
  try {
    const userId = req.user!.id;
    const { status, priority, limit = 20, offset = 0 } = req.query;

    const query = `
      MATCH (u:User {id: $userId})-[r:OWNS]->(g:Game)
      ${status ? 'WHERE r.status = $status' : ''}
      ${priority ? 'WHERE r.priority = $priority' : ''}
      RETURN g, r
      ORDER BY r.updated_at DESC
      SKIP $offset
      LIMIT $limit
    `;

    const countQuery = `
      MATCH (u:User {id: $userId})-[r:OWNS]->(g:Game)
      ${status ? 'WHERE r.status = $status' : ''}
      ${priority ? 'WHERE r.priority = $priority' : ''}
      RETURN count(g) AS total
    `;

    const result = await session.run(query, { userId, status, priority: priority ? parseInt(priority as string) : undefined, offset: parseInt(offset as string), limit: parseInt(limit as string) });
    const countResult = await session.run(countQuery, { userId, status, priority: priority ? parseInt(priority as string) : undefined });

    const userGames = result.records.map((record: any) => {
      const game = record.get('g').properties;
      const relationship = record.get('r').properties;
      return {
        ...relationship,
        game,
      };
    });

    const total = countResult.records[0].get('total').low;

    res.json({
      documents: userGames || [],
      total: total || 0
    });
  } catch (error: unknown) {
    console.error('Error fetching user games:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch user games', details: errorMessage });
  } finally {
    await session.close();
  }
});

app.get('/api/user/games/recently-played', requireAuth, async (req: Request, res: Response) => {
    const user = req.user as User;
    const { limit = 5 } = req.query;
    const session = neo4jDriver.session();

    try {
        const result = await session.run(`
            MATCH (u:User {id: $userId})-[r:OWNS]->(g:Game)
            WHERE r.playtime_2weeks > 0
            RETURN g, r
            ORDER BY r.playtime_2weeks DESC
            LIMIT $limit
        `, { userId: user.id, limit: parseInt(limit as string, 10) });

        const userGames = result.records.map((record: any) => {
            const game = record.get('g').properties;
            const relationship = record.get('r').properties;
            return {
                ...relationship,
                game,
            };
        });

        res.json(userGames || []);
    } catch (error: unknown) {
        console.error('Error fetching recently played games:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch recently played games', details: errorMessage });
    } finally {
        await session.close();
    }
});

// POST /api/user/games - Add game to user's backlog
app.post('/api/user/games', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const session = neo4jDriver.session();
  try {
    const userId = req.user!.id;
    const { steam_appid, status, priority, user_notes, user_tags } = req.body;

    if (!steam_appid || !status) {
      res.status(400).json({ error: 'steam_appid and status are required' });
      return;
    }

    const query = `
      MATCH (u:User {id: $userId})
      MATCH (g:Game {steam_appid: $steam_appid})
      MERGE (u)-[r:OWNS]->(g)
      ON CREATE SET
        r.status = $status,
        r.priority = $priority,
        r.user_notes = $user_notes,
        r.user_tags = $user_tags,
        r.hours_played = 0,
        r.completion_percentage = 0,
        r.is_favorite = false,
        r.added_at = timestamp(),
        r.updated_at = timestamp()
      ON MATCH SET
        r.status = $status,
        r.priority = $priority,
        r.user_notes = $user_notes,
        r.user_tags = $user_tags,
        r.updated_at = timestamp()
      RETURN r
    `;

    const result = await session.run(query, {
      userId,
      steam_appid,
      status,
      priority: priority || 3,
      user_notes: user_notes || '',
      user_tags: user_tags || [],
    });

    const newRelation = result.records[0].get('r').properties;

    res.json(newRelation);
  } catch (error: unknown) {
    console.error('Error adding game to backlog:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to add game to backlog', details: errorMessage });
  } finally {
    await session.close();
  }
});

// PUT /api/user/games/:id - Update game status in user's backlog
app.put('/api/user/games/:steam_appid', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const session = neo4jDriver.session();
  try {
    const userId = req.user!.id;
    const steam_appid = parseInt(req.params.steam_appid);
    const { status, priority, user_rating, user_notes, user_tags, hours_played, completion_percentage, is_favorite } = req.body;

    const query = `
      MATCH (u:User {id: $userId})-[r:OWNS]->(g:Game {steam_appid: $steam_appid})
      SET
        r.status = $status,
        r.priority = $priority,
        r.user_rating = $user_rating,
        r.user_notes = $user_notes,
        r.user_tags = $user_tags,
        r.hours_played = $hours_played,
        r.completion_percentage = $completion_percentage,
        r.is_favorite = $is_favorite,
        r.updated_at = timestamp()
      RETURN r
    `;

    const result = await session.run(query, {
      userId,
      steam_appid,
      status,
      priority,
      user_rating,
      user_notes,
      user_tags,
      hours_played,
      completion_percentage,
      is_favorite,
    });

    if (result.records.length === 0) {
      res.status(404).json({ error: 'Game not found in user backlog' });
      return;
    }

    const updatedRelation = result.records[0].get('r').properties;

    res.json(updatedRelation);
  } catch (error: unknown) {
    console.error('Error updating user game:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to update game', details: errorMessage });
  } finally {
    await session.close();
  }
});

// DELETE /api/user/games/:id - Remove game from user's backlog
app.delete('/api/user/games/:steam_appid', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const session = neo4jDriver.session();
  try {
    const userId = req.user!.id;
    const steam_appid = parseInt(req.params.steam_appid);

    const query = `
      MATCH (u:User {id: $userId})-[r:OWNS]->(g:Game {steam_appid: $steam_appid})
      DELETE r
    `;

    await session.run(query, { userId, steam_appid });

    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Error removing game from backlog:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to remove game from backlog', details: errorMessage });
  } finally {
    await session.close();
  }
});

// GET /api/user/stats - Get user's gaming statistics
app.get('/api/user/stats', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const session = neo4jDriver.session();
  try {
    const userId = req.user!.id;

    const query = `
      MATCH (u:User {id: $userId})-[r:OWNS]->(g:Game)
      RETURN r.status AS status, count(g) AS count
    `;

    const result = await session.run(query, { userId });

    const stats = result.records.reduce((acc: Record<string, number>, record: any) => {
      acc[record.get('status')] = record.get('count').low;
      return acc;
    }, {});

    const totalGames = Object.values(stats).reduce((sum, count) => sum + count, 0);

    res.json({
      totalGames: totalGames || 0,
      completedGames: stats.completed || 0,
      currentlyPlaying: stats.currently_playing || 0,
      wantToPlay: stats.want_to_play || 0,
      onHold: stats.on_hold || 0,
      dropped: stats.dropped || 0,
      completionPercentage: totalGames > 0
        ? Math.round((stats.completed / totalGames) * 100)
        : 0
    });
  } catch (error: unknown) {
    console.error('Error fetching user stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch user stats', details: errorMessage });
  } finally {
    await session.close();
  }
});

// Helper function to log user activity
async function logUserActivity(userId: string, type: string, metadata: object) {
    const session = neo4jDriver.session();
    try {
        const query = `
            MATCH (u:User {id: $userId})
            CREATE (ua:UserActivity {
                user_id: $userId,
                timestamp: timestamp(),
                type: $type,
                metadata_json: $metadata
            })
            MERGE (u)-[:HAS_ACTIVITY]->(ua)
        `;
        await session.run(query, { userId, type, metadata: JSON.stringify(metadata) });
    } catch (error: unknown) {
        console.error(`Failed to log user activity of type ${type} for user ${userId}:`, error);
    } finally {
        await session.close();
    }
}

// GET /api/user/stats/extended - Get user's extended gaming statistics
app.get('/api/user/stats/extended', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const session = neo4jDriver.session();
    try {
        const userId = req.user!.id;

        const query = `
            MATCH (u:User {id: $userId})-[r:OWNS]->(g:Game)
            RETURN sum(r.hours_played) AS totalHoursPlayed
        `;

        const result = await session.run(query, { userId });

        const totalHoursPlayed = result.records[0].get('totalHoursPlayed').low;

        res.json({
            totalHoursPlayed: Math.round(totalHoursPlayed * 100) / 100, // Round to 2 decimal places
        });

    } catch (error: unknown) {
        console.error('Error fetching user extended stats:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch user extended stats', details: errorMessage });
    } finally {
        await session.close();
    }
});

// GET /api/user/achievements/recent - Get user's most recent achievements
app.get('/api/user/achievements/recent', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const session = neo4jDriver.session();
    try {
        const userId = req.user!.id;

        const query = `
            MATCH (u:User {id: $userId})-[r:UNLOCKED]->(a:Achievement)<-[:HAS_ACHIEVEMENT]-(g:Game)
            WHERE r.is_unlocked = true
            RETURN a, r, g
            ORDER BY r.unlock_time DESC
            LIMIT 5
        `;

        const result = await session.run(query, { userId });

        const recentUserAchievements = result.records.map((record: any) => {
            const achievement = record.get('a').properties;
            const relationship = record.get('r').properties;
            const game = record.get('g').properties;
            return {
                ...relationship,
                achievement,
                game,
            };
        });

        res.json(recentUserAchievements || []);

    } catch (error: unknown) {
        console.error('Error fetching recent achievements:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch recent achievements', details: errorMessage });
    } finally {
        await session.close();
    }
});

// GET /api/user/activity - Get user's most recent activities
app.get('/api/user/activity', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const session = neo4jDriver.session();
    try {
        const userId = req.user!.id;
        const query = `
            MATCH (u:User {id: $userId})-[:HAS_ACTIVITY]->(ua:UserActivity)
            RETURN ua
            ORDER BY ua.timestamp DESC
            LIMIT 10
        `;
        const result = await session.run(query, { userId });

        const activities = result.records.map((record: any) => record.get('ua').properties);

        res.json(activities || []);
    } catch (error: unknown) {
        console.error('Error fetching user activity:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch user activity', details: errorMessage });
    } finally {
        await session.close();
    }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API server listening on port ${port}`);
});