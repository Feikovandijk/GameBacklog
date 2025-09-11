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
const express_session_1 = __importDefault(require("express-session"));
const cors_1 = __importDefault(require("cors"));
const node_appwrite_1 = require("node-appwrite");
const config_1 = __importDefault(require("./config"));
const steam_auth_1 = require("./auth/steam-auth");
const user_steam_sync_service_1 = require("./services/user-steam-sync-service");
const app = (0, express_1.default)();
app.set('trust proxy', 1);
const port = config_1.default.port;
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
// Session configuration
app.use((0, express_session_1.default)({
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
app.use(steam_auth_1.passport.initialize());
app.use(steam_auth_1.passport.session());
// Authentication middleware
function requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Authentication required' });
}
// Appwrite Client Setup
const appwriteClient = new node_appwrite_1.Client()
    .setEndpoint(config_1.default.appwrite.endpoint)
    .setProject(config_1.default.appwrite.projectId)
    .setKey(config_1.default.appwrite.apiKey);
const appwriteDatabases = new node_appwrite_1.Databases(appwriteClient);
// Authentication routes
app.get('/auth/steam', steam_auth_1.passport.authenticate('steam'));
app.get('/auth/steam/return', steam_auth_1.passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
    // Successful authentication, redirect to dashboard
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard`);
});
app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});
app.get('/auth/me', (req, res) => {
    if (req.isAuthenticated() && req.user) {
        res.json(req.user);
    }
    else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});
app.post('/api/user/sync', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Trigger the sync in the background and return immediately
        (0, user_steam_sync_service_1.syncUserWithSteam)(req.user);
        res.status(202).json({ message: 'Sync process started in the background.' });
    }
    catch (error) {
        console.error('Failed to start user sync:', error);
        res.status(500).json({ error: 'Failed to start sync process.' });
    }
}));
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
// User-specific game backlog endpoints
// GET /api/user/games - Get user's game backlog
app.get('/api/user/games', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.$id;
        const databaseId = config_1.default.appwrite.databaseId;
        const userGamesCollectionId = 'user_games';
        const gamesCollectionId = config_1.default.appwrite.gamesCollectionId;
        // Get query parameters for filtering
        const { status, priority, search, limit = 20, offset = 0 } = req.query;
        let queries = [node_appwrite_1.Query.equal('user_id', userId)];
        if (status) {
            queries.push(node_appwrite_1.Query.equal('status', status));
        }
        if (priority) {
            queries.push(node_appwrite_1.Query.equal('priority', parseInt(priority)));
        }
        queries.push(node_appwrite_1.Query.limit(parseInt(limit)));
        queries.push(node_appwrite_1.Query.offset(parseInt(offset)));
        queries.push(node_appwrite_1.Query.orderDesc('updated_at'));
        const userGamesResponse = yield appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, queries);
        // Fetch full game details for each user game
        const gamesWithDetails = yield Promise.all(userGamesResponse.documents.map((userGame) => __awaiter(void 0, void 0, void 0, function* () {
            const gameResponse = yield appwriteDatabases.listDocuments(databaseId, gamesCollectionId, [node_appwrite_1.Query.equal('steam_appid', userGame.steam_appid)]);
            const gameDetails = gameResponse.documents[0] || null;
            return Object.assign(Object.assign({}, userGame), { game: gameDetails });
        })));
        res.json({
            documents: gamesWithDetails,
            total: userGamesResponse.total
        });
    }
    catch (error) {
        console.error('Error fetching user games:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch user games', details: errorMessage });
    }
}));
app.get('/api/user/games/recently-played', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const { limit = 5 } = req.query;
    try {
        const response = yield appwriteDatabases.listDocuments(config_1.default.appwrite.databaseId, 'user_games', [
            node_appwrite_1.Query.equal('user_id', user.$id),
            node_appwrite_1.Query.greaterThan('playtime_2weeks', 0),
            node_appwrite_1.Query.orderDesc('playtime_2weeks'),
            node_appwrite_1.Query.limit(parseInt(limit, 10)),
            node_appwrite_1.Query.select(['$id', 'steam_appid', 'playtime_2weeks', 'game_id'])
        ]);
        // As the response does not automatically resolve the 'game' relation, we may need to fetch it.
        // Assuming the 'game' attribute is a related document ID.
        const gamesWithDetails = yield Promise.all(response.documents.map((userGame) => __awaiter(void 0, void 0, void 0, function* () {
            if (userGame.game_id) {
                try {
                    const gameDoc = yield appwriteDatabases.getDocument(config_1.default.appwrite.databaseId, config_1.default.appwrite.gamesCollectionId, userGame.game_id);
                    return Object.assign(Object.assign({}, userGame), { game: gameDoc });
                }
                catch (e) {
                    return Object.assign(Object.assign({}, userGame), { game: null }); // Game details not found
                }
            }
            return userGame;
        })));
        res.json(gamesWithDetails);
    }
    catch (error) {
        console.error('Error fetching recently played games:', error);
        res.status(500).json({ message: 'Failed to fetch recently played games' });
    }
}));
// POST /api/user/games - Add game to user's backlog
app.post('/api/user/games', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.$id;
        const { steam_appid, status, priority, user_notes, user_tags } = req.body;
        if (!steam_appid || !status) {
            res.status(400).json({ error: 'steam_appid and status are required' });
            return;
        }
        const databaseId = config_1.default.appwrite.databaseId;
        const userGamesCollectionId = 'user_games';
        const gamesCollectionId = config_1.default.appwrite.gamesCollectionId;
        // Verify the game exists
        const gameExists = yield appwriteDatabases.listDocuments(databaseId, gamesCollectionId, [node_appwrite_1.Query.equal('steam_appid', steam_appid)]);
        if (gameExists.documents.length === 0) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }
        const gameId = gameExists.documents[0].$id;
        // Check if user already has this game
        const existingUserGame = yield appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
            node_appwrite_1.Query.equal('user_id', userId),
            node_appwrite_1.Query.equal('steam_appid', steam_appid)
        ]);
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
            result = yield appwriteDatabases.updateDocument(databaseId, userGamesCollectionId, existingUserGame.documents[0].$id, gameData);
            // Log activity
            logUserActivity(userId, 'game.updated', { gameName: gameExists.documents[0].name });
        }
        else {
            // Create new
            result = yield appwriteDatabases.createDocument(databaseId, userGamesCollectionId, node_appwrite_1.ID.unique(), Object.assign(Object.assign({}, gameData), { added_at: new Date().toISOString() }));
            // Log activity
            logUserActivity(userId, 'game.added', { gameName: gameExists.documents[0].name });
        }
        res.json(result);
    }
    catch (error) {
        console.error('Error adding game to backlog:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to add game to backlog', details: errorMessage });
    }
}));
// PUT /api/user/games/:id - Update game status in user's backlog
app.put('/api/user/games/:id', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.$id;
        const gameId = req.params.id;
        const { status, priority, user_rating, user_notes, user_tags, hours_played, completion_percentage, is_favorite } = req.body;
        const databaseId = config_1.default.appwrite.databaseId;
        const userGamesCollectionId = 'user_games';
        // Verify ownership
        const userGame = yield appwriteDatabases.getDocument(databaseId, userGamesCollectionId, gameId);
        if (userGame.user_id !== userId) {
            res.status(403).json({ error: 'Forbidden: Not your game' });
            return;
        }
        const updateData = {
            updated_at: new Date().toISOString()
        };
        // Only update provided fields
        if (status !== undefined) {
            updateData.status = status;
            // Log activity based on status change
            if (status === 'completed' || status === 'completed_100') {
                logUserActivity(userId, 'game.completed', { gameName: userGame.name });
                updateData.completed_at = new Date().toISOString();
            }
            else if (status === 'currently_playing' && userGame.status !== 'currently_playing') {
                logUserActivity(userId, 'game.started', { gameName: userGame.name });
            }
        }
        if (priority !== undefined)
            updateData.priority = priority;
        if (user_rating !== undefined)
            updateData.user_rating = user_rating;
        if (user_notes !== undefined)
            updateData.user_notes = user_notes;
        if (user_tags !== undefined)
            updateData.user_tags = user_tags;
        if (hours_played !== undefined)
            updateData.hours_played = hours_played;
        if (completion_percentage !== undefined)
            updateData.completion_percentage = completion_percentage;
        if (is_favorite !== undefined)
            updateData.is_favorite = is_favorite;
        // Set completion date if marking as completed
        if ((status === 'completed' || status === 'completed_100') && !updateData.completed_at) {
            updateData.completed_at = new Date().toISOString();
        }
        const result = yield appwriteDatabases.updateDocument(databaseId, userGamesCollectionId, gameId, updateData);
        res.json(result);
    }
    catch (error) {
        console.error('Error updating user game:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to update game', details: errorMessage });
    }
}));
// DELETE /api/user/games/:id - Remove game from user's backlog
app.delete('/api/user/games/:id', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.$id;
        const gameId = req.params.id;
        const databaseId = config_1.default.appwrite.databaseId;
        const userGamesCollectionId = 'user_games';
        // Verify ownership
        const userGame = yield appwriteDatabases.getDocument(databaseId, userGamesCollectionId, gameId);
        if (userGame.user_id !== userId) {
            res.status(403).json({ error: 'Forbidden: Not your game' });
            return;
        }
        yield appwriteDatabases.deleteDocument(databaseId, userGamesCollectionId, gameId);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error removing game from backlog:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to remove game from backlog', details: errorMessage });
    }
}));
// GET /api/user/stats - Get user's gaming statistics
app.get('/api/user/stats', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.$id;
        const databaseId = config_1.default.appwrite.databaseId;
        const userGamesCollectionId = 'user_games';
        // Get various stats in parallel
        const [totalGames, completedGames, currentlyPlaying, wantToPlay, onHold, dropped] = yield Promise.all([
            appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
                node_appwrite_1.Query.equal('user_id', userId),
                node_appwrite_1.Query.select(['$id'])
            ]),
            appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
                node_appwrite_1.Query.equal('user_id', userId),
                node_appwrite_1.Query.equal('status', 'completed'),
                node_appwrite_1.Query.select(['$id'])
            ]),
            appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
                node_appwrite_1.Query.equal('user_id', userId),
                node_appwrite_1.Query.equal('status', 'currently_playing'),
                node_appwrite_1.Query.select(['$id'])
            ]),
            appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
                node_appwrite_1.Query.equal('user_id', userId),
                node_appwrite_1.Query.equal('status', 'want_to_play'),
                node_appwrite_1.Query.select(['$id'])
            ]),
            appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
                node_appwrite_1.Query.equal('user_id', userId),
                node_appwrite_1.Query.equal('status', 'on_hold'),
                node_appwrite_1.Query.select(['$id'])
            ]),
            appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [
                node_appwrite_1.Query.equal('user_id', userId),
                node_appwrite_1.Query.equal('status', 'dropped'),
                node_appwrite_1.Query.select(['$id'])
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
    }
    catch (error) {
        console.error('Error fetching user stats:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch user stats', details: errorMessage });
    }
}));
// Helper function to log user activity
function logUserActivity(userId, type, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield appwriteDatabases.createDocument(config_1.default.appwrite.databaseId, 'user_activity', // Assuming this collection exists
            node_appwrite_1.ID.unique(), {
                user_id: userId,
                type: type,
                timestamp: new Date().toISOString(),
                metadata_json: JSON.stringify(metadata)
            });
        }
        catch (error) {
            console.error(`Failed to log user activity of type ${type} for user ${userId}:`, error);
        }
    });
}
// GET /api/user/stats/extended - Get user's extended gaming statistics
app.get('/api/user/stats/extended', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.$id;
        const databaseId = config_1.default.appwrite.databaseId;
        const userGamesCollectionId = 'user_games';
        const userGames = yield appwriteDatabases.listDocuments(databaseId, userGamesCollectionId, [node_appwrite_1.Query.equal('user_id', userId), node_appwrite_1.Query.limit(5000)] // A high limit to get all games
        );
        const totalHoursPlayed = userGames.documents.reduce((sum, game) => sum + (game.hours_played || 0), 0);
        res.json({
            totalHoursPlayed: Math.round(totalHoursPlayed * 100) / 100, // Round to 2 decimal places
        });
    }
    catch (error) {
        console.error('Error fetching user extended stats:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch user extended stats', details: errorMessage });
    }
}));
// GET /api/user/achievements/recent - Get user's most recent achievements
app.get('/api/user/achievements/recent', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.$id;
        const databaseId = config_1.default.appwrite.databaseId;
        const userAchievementsCollectionId = 'user_achievements';
        const achievementsCollectionId = 'achievements';
        const gamesCollectionId = config_1.default.appwrite.gamesCollectionId;
        // Fetch 5 most recent unlocked achievements
        const recentUserAchievements = yield appwriteDatabases.listDocuments(databaseId, userAchievementsCollectionId, [
            node_appwrite_1.Query.equal('user_id', userId),
            node_appwrite_1.Query.equal('is_unlocked', true),
            node_appwrite_1.Query.orderDesc('unlock_time'),
            node_appwrite_1.Query.limit(5)
        ]);
        // Enhance with full achievement and game details
        const detailedAchievements = yield Promise.all(recentUserAchievements.documents.map((userAch) => __awaiter(void 0, void 0, void 0, function* () {
            // Fetch base achievement details
            const achievementDetails = yield appwriteDatabases.listDocuments(databaseId, achievementsCollectionId, [node_appwrite_1.Query.equal('api_name', userAch.achievement_api_name), node_appwrite_1.Query.limit(1)]);
            // Fetch game details
            const gameDetails = yield appwriteDatabases.listDocuments(databaseId, gamesCollectionId, [node_appwrite_1.Query.equal('steam_appid', userAch.steam_appid), node_appwrite_1.Query.limit(1)]);
            return Object.assign(Object.assign({}, userAch), { achievement: achievementDetails.documents[0] || null, game: gameDetails.documents[0] || null });
        })));
        res.json(detailedAchievements);
    }
    catch (error) {
        console.error('Error fetching recent achievements:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch recent achievements', details: errorMessage });
    }
}));
// GET /api/user/activity - Get user's most recent activities
app.get('/api/user/activity', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.$id;
        const response = yield appwriteDatabases.listDocuments(config_1.default.appwrite.databaseId, 'user_activity', [
            node_appwrite_1.Query.equal('user_id', userId),
            node_appwrite_1.Query.orderDesc('timestamp'),
            node_appwrite_1.Query.limit(10)
        ]);
        res.json(response.documents);
    }
    catch (error) {
        console.error('Error fetching user activity:', error);
        const errorMessage = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to fetch user activity', details: errorMessage });
    }
}));
app.listen(port, "0.0.0.0", () => {
    console.log(`API server listening on port ${port}`);
});
