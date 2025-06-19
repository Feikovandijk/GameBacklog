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
