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
    // Check if a valid cache exists
    if (analyticsCache && (Date.now() - cacheTimestamp < CACHE_DURATION_MS)) {
        console.log("Serving analytics from cache.");
        return res.json(analyticsCache);
    }

    console.log("Generating new analytics data. This may take a while...");
    try {
        const databaseId = config.appwrite.databaseId!;
        const gamesCollectionId = config.appwrite.gamesCollectionId!;

        const allGames = await fetchAllDocuments(
            databaseId, 
            gamesCollectionId,
            [Query.equal('steam_app_type', 'game')]
        );

        // Calculate analytics
        const earlyAccessCount = allGames.filter(g => g.is_early_access).length;

        const releaseYearDistribution = allGames.reduce((acc, game) => {
            if (game.release_date) {
                const year = new Date(game.release_date).getFullYear();
                if (year && year > 1980 && year <= new Date().getFullYear()) { // Filter out invalid or future dates
                    acc[year] = (acc[year] || 0) + 1;
                }
            }
            return acc;
        }, {} as Record<string, number>);

        const developerDistribution = allGames.reduce((acc, game) => {
            if (game.developers) {
                game.developers.forEach((dev: string) => {
                    acc[dev] = (acc[dev] || 0) + 1;
                });
            }
            return acc;
        }, {} as Record<string, number>);
        
        const publisherDistribution = allGames.reduce((acc, game) => {
            if (game.publishers) {
                game.publishers.forEach((pub: string) => {
                    acc[pub] = (acc[pub] || 0) + 1;
                });
            }
            return acc;
        }, {} as Record<string, number>);

        // Filter out blocklisted developers/publishers for a cleaner list
        const DEVELOPER_BLOCKLIST = ['', ''];
        const PUBLISHER_BLOCKLIST = ['', ''];

        const getTopN = (dist: Record<string, number>, n: number, blocklist: string[] = []) => {
            return Object.entries(dist)
                .filter(([name]) => !blocklist.includes(name))
                .sort(([, a], [, b]) => b - a)
                .slice(0, n)
                .map(([name, count]) => ({ name, count }));
        };

        const analyticsData = {
            earlyAccessCount,
            releaseYearDistribution,
            developerDistribution: getTopN(developerDistribution, 10, DEVELOPER_BLOCKLIST),
            publisherDistribution: getTopN(publisherDistribution, 10, PUBLISHER_BLOCKLIST)
        };
        
        // Store in cache
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
