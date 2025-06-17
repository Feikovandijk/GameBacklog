import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { Client, Databases, Query } from 'node-appwrite';
import config from './config';

interface AuthenticatedRequest extends Request {
  user?: any; // You can define a more specific type for user
}

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

// Supabase client (can be removed if fully migrated)
// const supabase = createClient(config.supabaseUrl!, config.supabaseAnonKey!);

// Middleware to authenticate user (currently Supabase)
/*
const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header missing' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token missing' });
    return;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token', details: error?.message });
    return;
  }
  req.user = user; // Add user to request object
  next();
};
*/

// NEW: GET /api/stats - Retrieves stats about the games database
app.get('/api/stats', async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
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
