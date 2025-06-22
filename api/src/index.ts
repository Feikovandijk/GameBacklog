import express, { Request, Response } from 'express';
import cors from 'cors';
import { Client, Databases, Query, AppwriteException } from 'node-appwrite';
import config from './config';

const app = express();
const port = config.port;

app.use(cors());
app.use(express.json());

// Appwrite Client Setup
const appwriteClient = new Client()
    .setEndpoint(config.appwrite.endpoint!)
    .setProject(config.appwrite.projectId!)
    .setKey(config.appwrite.apiKey!);
const appwriteDatabases = new Databases(appwriteClient);

// Helper to fetch all documents from a collection with pagination
async function fetchAllDocuments(databaseId: string, collectionId: string, queries: any[] = []) {
    const documents: any[] = [];
    let cursor: string | undefined = undefined;

    while (true) {
        const currentQueries = [...queries, Query.limit(1000)]; // Fetch in batches of 1000
        if (cursor) {
            currentQueries.push(Query.cursorAfter(cursor));
        }

        const response = await appwriteDatabases.listDocuments(databaseId, collectionId, currentQueries);

        if (response.documents.length === 0) {
            break;
        }

        documents.push(...response.documents);
        cursor = response.documents[response.documents.length - 1].$id;
    }

    return documents;
}

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

// GET /api/games - Retrieves all games for the currently authenticated user
/*
app.get('/api/games', authenticateUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('user_games')
      .select(`
        status,
        games (
          game_id,
          name,
          steam_appid,
          short_description,
          header_image,
          release_date,
          genres ( name ),
          screenshots ( path_thumbnail ),
          platforms ( name )
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games', details: error.message });
  }
});
*/

// POST /api/user_games - Allows an authenticated user to upsert a game's status
/*
app.post('/api/user_games', authenticateUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { game_id, status } = req.body;

  if (!game_id || !status) {
    res.status(400).json({ error: 'game_id and status are required' });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('user_games')
      .upsert({ user_id: userId, game_id, status }, { onConflict: 'user_id,game_id' })
      .select();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error upserting user game status:', error);
    res.status(500).json({ error: 'Failed to upsert game status', details: error.message });
  }
});
*/

app.listen(port, "0.0.0.0", () => {
  console.log(`API server listening on port ${port}`);
});
