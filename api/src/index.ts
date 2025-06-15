import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import config from './config';

interface AuthenticatedRequest extends Request {
  user?: any; // You can define a more specific type for user
}

const app = express();
const port = config.port;

app.use(cors());
app.use(express.json());

const supabase = createClient(config.supabaseUrl!, config.supabaseAnonKey!);

// Middleware to authenticate user
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

// GET /api/games - Retrieves all games for the currently authenticated user
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

// POST /api/user_games - Allows an authenticated user to upsert a game's status
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

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
