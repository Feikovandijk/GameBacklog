"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const node_appwrite_1 = require("node-appwrite");
const config_1 = __importDefault(require("./config"));
const app = (0, express_1.default)();
const port = config_1.default.port;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Appwrite Client Setup
const appwriteClient = new node_appwrite_1.Client()
    .setEndpoint(config_1.default.appwrite.endpoint)
    .setProject(config_1.default.appwrite.projectId)
    .setKey(config_1.default.appwrite.apiKey);
const appwriteDatabases = new node_appwrite_1.Databases(appwriteClient);
// NEW: GET /api/stats - Retrieves stats about the games database
app.get('/api/stats', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const databaseId = config_1.default.appwrite.databaseId;
        const statsCollectionId = 'statistics';
        const statsDocs = yield appwriteDatabases.listDocuments(databaseId, statsCollectionId);
        const stats = statsDocs.documents.reduce((acc, doc) => {
            acc[doc.key] = doc.count;
            return acc;
        }, {});
        res.json({
            totalGames: stats.totalGames || 0,
            updatedGames: stats.updatedGames || 0,
        });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch stats', details: errorMessage });
    }
}));
let analyticsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
app.get('/api/analytics', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (analyticsCache && (Date.now() - cacheTimestamp < CACHE_DURATION_MS)) {
        console.log("Serving analytics from cache.");
        return res.json(analyticsCache);
    }
    console.log("Fetching pre-calculated analytics data...");
    try {
        const databaseId = config_1.default.appwrite.databaseId;
        const statsCollectionId = 'statistics';
        const keysToFetch = [
            'analytics_releaseYearDistribution',
            'analytics_genreDistribution'
        ];
        const statsResponse = yield appwriteDatabases.listDocuments(databaseId, statsCollectionId, [node_appwrite_1.Query.equal('key', keysToFetch)]);
        const stats = statsResponse.documents.reduce((acc, doc) => {
            try {
                acc[doc.key] = JSON.parse(doc.value);
            }
            catch (e) {
                console.error(`Failed to parse stat value for key: ${doc.key}`, e);
                acc[doc.key] = {};
            }
            return acc;
        }, {});
        const getTopN = (dist, n) => {
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
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch analytics', details: errorMessage });
    }
}));
app.get('/api/games/most-reviewed', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const databaseId = config_1.default.appwrite.databaseId;
        const gamesCollectionId = config_1.default.appwrite.gamesCollectionId;
        const response = yield appwriteDatabases.listDocuments(databaseId, gamesCollectionId, [
            node_appwrite_1.Query.orderDesc('total_reviews'),
            node_appwrite_1.Query.limit(10),
            node_appwrite_1.Query.select(['$id', 'name', 'header_image', 'total_reviews', 'steam_appid'])
        ]);
        res.json(response.documents);
    }
    catch (error) {
        console.error('Error fetching most reviewed games:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch most reviewed games', details: errorMessage });
    }
}));
app.get('/api/games/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const searchQuery = req.query.q;
    if (!searchQuery) {
        res.status(400).json({ error: 'Search query (q) is required' });
        return;
    }
    try {
        const databaseId = config_1.default.appwrite.databaseId;
        const gamesCollectionId = config_1.default.appwrite.gamesCollectionId;
        const response = yield appwriteDatabases.listDocuments(databaseId, gamesCollectionId, [
            node_appwrite_1.Query.search('name', searchQuery),
            node_appwrite_1.Query.equal('steam_app_type', 'game'), // Only search for actual games
            node_appwrite_1.Query.limit(5)
        ]);
        res.json(response.documents);
    }
    catch (error) {
        console.error('Error searching games:', error);
        res.status(500).json({ error: 'Failed to search games', details: error.message });
    }
}));
app.get('/api/latest-games-with-achievements', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const databaseId = config_1.default.appwrite.databaseId;
        const gamesCollectionId = config_1.default.appwrite.gamesCollectionId;
        const achievementsCollectionId = 'achievements'; // As seen in steam-refresh-service
        // 1. Fetch the 5 most recently updated games that have achievements
        const latestGamesResponse = yield appwriteDatabases.listDocuments(databaseId, gamesCollectionId, [
            node_appwrite_1.Query.orderDesc('last_updated'),
            node_appwrite_1.Query.equal('has_steam_achievements', true),
            node_appwrite_1.Query.limit(5),
            node_appwrite_1.Query.select(['$id', 'name', 'steam_appid', 'last_updated'])
        ]);
        const latestGames = latestGamesResponse.documents;
        // 2. For each game, fetch its achievements
        const gamesWithAchievements = yield Promise.all(latestGames.map((game) => __awaiter(void 0, void 0, void 0, function* () {
            const achievementsResponse = yield appwriteDatabases.listDocuments(databaseId, achievementsCollectionId, [
                node_appwrite_1.Query.equal('steam_appid', game.steam_appid),
                node_appwrite_1.Query.limit(500) // Assuming a game won't have more than 500 achievements
            ]);
            return Object.assign(Object.assign({}, game), { achievements: achievementsResponse.documents });
        })));
        res.json(gamesWithAchievements);
    }
    catch (error) {
        console.error('Error fetching latest games with achievements:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch latest games with achievements', details: errorMessage });
    }
}));
app.get('/api/latest-synced-games', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const databaseId = config_1.default.appwrite.databaseId;
        const gamesCollectionId = config_1.default.appwrite.gamesCollectionId;
        const achievementsCollectionId = 'achievements';
        // 1. Fetch the 10 most recently updated games
        const latestGamesResponse = yield appwriteDatabases.listDocuments(databaseId, gamesCollectionId, [
            node_appwrite_1.Query.isNotNull('last_updated'), // Ensure the game has been synced at least once
            node_appwrite_1.Query.orderDesc('last_updated'),
            node_appwrite_1.Query.limit(10),
        ]);
        const latestGames = latestGamesResponse.documents;
        // 2. For each game, fetch its achievements if it has any
        const gamesWithDetails = yield Promise.all(latestGames.map((game) => __awaiter(void 0, void 0, void 0, function* () {
            let achievements = [];
            if (game.has_steam_achievements) {
                const achievementsResponse = yield appwriteDatabases.listDocuments(databaseId, achievementsCollectionId, [
                    node_appwrite_1.Query.equal('steam_appid', game.steam_appid),
                    node_appwrite_1.Query.limit(1000) // Generous limit for achievements
                ]);
                achievements = achievementsResponse.documents;
            }
            return Object.assign(Object.assign({}, game), { achievements });
        })));
        res.json(gamesWithDetails);
    }
    catch (error) {
        console.error('Error fetching latest synced games:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch latest synced games', details: errorMessage });
    }
}));
app.get('/api/latest-steam-games', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const databaseId = config_1.default.appwrite.databaseId;
        const gamesCollectionId = config_1.default.appwrite.gamesCollectionId;
        const response = yield appwriteDatabases.listDocuments(databaseId, gamesCollectionId, [
            node_appwrite_1.Query.orderDesc('release_date'),
            node_appwrite_1.Query.limit(10),
            node_appwrite_1.Query.select([
                'name',
                'steam_appid',
                'header_image',
                'total_reviews',
                'release_date'
            ])
        ]);
        res.json(response.documents);
    }
    catch (error) {
        console.error('Error fetching latest steam games:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch latest steam games', details: errorMessage });
    }
}));
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
