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
const config_1 = __importDefault(require("./config"));
const steam_auth_1 = require("./auth/steam-auth");
const steam_wishlist_service_1 = require("./services/steam-wishlist-service");
const user_steam_sync_service_1 = require("./services/user-steam-sync-service");
const client_1 = require("./supabase/client");
const app = (0, express_1.default)();
app.set('trust proxy', 1);
const port = config_1.default.port;
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
    credentials: true,
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
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
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
// Supabase client is imported from ./supabase/client
// Authentication routes
app.get('/auth/steam', steam_auth_1.passport.authenticate('steam'));
app.get('/auth/steam/return', steam_auth_1.passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
    // Successful authentication, redirect to dashboard
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/dashboard`);
});
app.post('/auth/logout', (req, res) => {
    req.logout(err => {
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
        res
            .status(202)
            .json({ message: 'Sync process started in the background.' });
    }
    catch (error) {
        console.error('Failed to start user sync:', error);
        res.status(500).json({ error: 'Failed to start sync process.' });
    }
}));
// NEW: GET /api/stats - Retrieves stats about the games database
app.get('/api/stats', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data: statsDocs, error } = yield client_1.supabase
            .from('statistics')
            .select('key, count');
        if (error) {
            throw error;
        }
        const stats = (statsDocs === null || statsDocs === void 0 ? void 0 : statsDocs.reduce((acc, doc) => {
            acc[doc.key] = doc.count;
            return acc;
        }, {})) || {};
        res.json({
            totalGames: stats.totalGames || 0,
            updatedGames: stats.updatedGames || 0,
        });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res
            .status(500)
            .json({ error: 'Failed to fetch stats', details: errorMessage });
    }
}));
let analyticsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
app.get('/api/analytics', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const { data: statsResponse, error } = yield client_1.supabase
            .from('statistics')
            .select('key, value')
            .in('key', keysToFetch);
        if (error) {
            throw error;
        }
        const stats = (statsResponse === null || statsResponse === void 0 ? void 0 : statsResponse.reduce((acc, doc) => {
            try {
                acc[doc.key] = JSON.parse(doc.value);
            }
            catch (e) {
                console.error(`Failed to parse stat value for key: ${doc.key}`, e);
                acc[doc.key] = {};
            }
            return acc;
        }, {})) || {};
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
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res
            .status(500)
            .json({ error: 'Failed to fetch analytics', details: errorMessage });
    }
}));
app.get('/api/games/most-reviewed', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data: games, error } = yield client_1.supabase
            .from('games')
            .select('id, name, header_image, total_reviews, steam_appid')
            .order('total_reviews', { ascending: false })
            .limit(10);
        if (error) {
            throw error;
        }
        res.json(games || []);
    }
    catch (error) {
        console.error('Error fetching most reviewed games:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to fetch most reviewed games',
            details: errorMessage,
        });
    }
}));
app.get('/api/games/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const searchQuery = req.query.q;
    if (!searchQuery) {
        res.status(400).json({ error: 'Search query (q) is required' });
        return;
    }
    try {
        const { data: games, error } = yield client_1.supabase
            .from('games')
            .select('*')
            .ilike('name', `%${searchQuery}%`)
            .eq('steam_app_type', 'game') // Only search for actual games
            .limit(5);
        if (error) {
            throw error;
        }
        res.json(games || []);
    }
    catch (error) {
        console.error('Error searching games:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res
            .status(500)
            .json({ error: 'Failed to search games', details: errorMessage });
    }
}));
app.get('/api/latest-games-with-achievements', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Fetch the 5 most recently updated games that have achievements
        const { data: latestGames, error: gamesError } = yield client_1.supabase
            .from('games')
            .select('id, name, steam_appid, last_updated')
            .eq('has_steam_achievements', true)
            .order('last_updated', { ascending: false })
            .limit(5);
        if (gamesError) {
            throw gamesError;
        }
        // 2. For each game, fetch its achievements
        const gamesWithAchievements = yield Promise.all((latestGames || []).map((game) => __awaiter(void 0, void 0, void 0, function* () {
            const { data: achievements, error: achievementsError } = yield client_1.supabase
                .from('achievements')
                .select('*')
                .eq('steam_appid', game.steam_appid)
                .limit(500); // Assuming a game won't have more than 500 achievements
            if (achievementsError) {
                console.error(`Error fetching achievements for game ${game.steam_appid}:`, achievementsError);
            }
            return Object.assign(Object.assign({}, game), { achievements: achievements || [] });
        })));
        res.json(gamesWithAchievements);
    }
    catch (error) {
        console.error('Error fetching latest games with achievements:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to fetch latest games with achievements',
            details: errorMessage,
        });
    }
}));
app.get('/api/latest-synced-games', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Fetch the 10 most recently updated games
        const { data: latestGames, error: gamesError } = yield client_1.supabase
            .from('games')
            .select('*')
            .not('last_updated', 'is', null) // Ensure the game has been synced at least once
            .order('last_updated', { ascending: false })
            .limit(10);
        if (gamesError) {
            throw gamesError;
        }
        // 2. For each game, fetch its achievements if it has any
        const gamesWithDetails = yield Promise.all((latestGames || []).map((game) => __awaiter(void 0, void 0, void 0, function* () {
            let achievements = [];
            if (game.has_steam_achievements) {
                const { data: achievementsData, error: achievementsError } = yield client_1.supabase
                    .from('achievements')
                    .select('*')
                    .eq('steam_appid', game.steam_appid)
                    .limit(1000); // Generous limit for achievements
                if (achievementsError) {
                    console.error(`Error fetching achievements for game ${game.steam_appid}:`, achievementsError);
                }
                else {
                    achievements = achievementsData || [];
                }
            }
            return Object.assign(Object.assign({}, game), { achievements });
        })));
        res.json(gamesWithDetails);
    }
    catch (error) {
        console.error('Error fetching latest synced games:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to fetch latest synced games',
            details: errorMessage,
        });
    }
}));
app.get('/api/latest-steam-games', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data: games, error } = yield client_1.supabase
            .from('games')
            .select('name, steam_appid, header_image, total_reviews, release_date')
            .order('release_date', { ascending: false })
            .limit(10);
        if (error) {
            throw error;
        }
        res.json(games || []);
    }
    catch (error) {
        console.error('Error fetching latest steam games:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to fetch latest steam games',
            details: errorMessage,
        });
    }
}));
app.get('/api/user/wishlist', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wishlist = yield (0, steam_wishlist_service_1.getWishlist)(req.user.steam_id);
        res.json(wishlist);
    }
    catch (error) {
        console.error('Error fetching user wishlist:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res
            .status(500)
            .json({ error: 'Failed to fetch user wishlist', details: errorMessage });
    }
}));
// User-specific game backlog endpoints
// GET /api/user/games - Get user's game backlog
app.get('/api/user/games', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Get query parameters for filtering
        const { status, priority, limit = 20, offset = 0 } = req.query;
        let query = client_1.supabase
            .from('user_games')
            .select(`
        *,
        game:games(*)
      `)
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
        if (status) {
            query = query.eq('status', status);
        }
        if (priority) {
            query = query.eq('priority', parseInt(priority));
        }
        const { data: userGames, error, count } = yield query;
        if (error) {
            throw error;
        }
        res.json({
            documents: userGames || [],
            total: count || 0,
        });
    }
    catch (error) {
        console.error('Error fetching user games:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res
            .status(500)
            .json({ error: 'Failed to fetch user games', details: errorMessage });
    }
}));
app.get('/api/user/games/recently-played', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const { limit = 5 } = req.query;
    try {
        const { data: userGames, error } = yield client_1.supabase
            .from('user_games')
            .select(`
                id,
                steam_appid,
                playtime_2weeks,
                game_id,
                game:games(*)
            `)
            .eq('user_id', user.id)
            .gt('playtime_2weeks', 0)
            .order('playtime_2weeks', { ascending: false })
            .limit(parseInt(limit, 10));
        if (error) {
            throw error;
        }
        res.json(userGames || []);
    }
    catch (error) {
        console.error('Error fetching recently played games:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to fetch recently played games',
            details: errorMessage,
        });
    }
}));
// POST /api/user/games - Add game to user's backlog
app.post('/api/user/games', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { steam_appid, status, priority, user_notes, user_tags } = req.body;
        if (!steam_appid || !status) {
            res.status(400).json({ error: 'steam_appid and status are required' });
            return;
        }
        // Verify the game exists
        const { data: gameExists, error: gameError } = yield client_1.supabase
            .from('games')
            .select('id, name')
            .eq('steam_appid', steam_appid)
            .single();
        if (gameError || !gameExists) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }
        // Check if user already has this game
        const { data: existingUserGame, error: existingError } = yield client_1.supabase
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
            const { data: updateResult, error: updateError } = yield client_1.supabase
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
        }
        else {
            // Create new
            const { data: createResult, error: createError } = yield client_1.supabase
                .from('user_games')
                .insert(Object.assign(Object.assign({}, gameData), { added_at: new Date().toISOString() }))
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
    }
    catch (error) {
        console.error('Error adding game to backlog:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to add game to backlog',
            details: errorMessage,
        });
    }
}));
// PUT /api/user/games/:id - Update game status in user's backlog
app.put('/api/user/games/:id', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const gameId = req.params.id;
        const { status, priority, user_rating, user_notes, user_tags, hours_played, completion_percentage, is_favorite, } = req.body;
        // Verify ownership
        const { data: userGame, error: userGameError } = yield client_1.supabase
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
        const updateData = {
            updated_at: new Date().toISOString(),
        };
        // Only update provided fields
        if (status !== undefined) {
            updateData.status = status;
            // Log activity based on status change
            if (status === 'completed' || status === 'completed_100') {
                // Fetch game name for activity logging
                const { data: gameData } = yield client_1.supabase
                    .from('games')
                    .select('name')
                    .eq('steam_appid', userGame.steam_appid)
                    .single();
                const gameName = (gameData === null || gameData === void 0 ? void 0 : gameData.name) || 'Unknown Game';
                logUserActivity(userId, 'game.completed', { gameName });
                updateData.completed_at = new Date().toISOString();
            }
            else if (status === 'currently_playing' &&
                userGame.status !== 'currently_playing') {
                // Fetch game name for activity logging
                const { data: gameData } = yield client_1.supabase
                    .from('games')
                    .select('name')
                    .eq('steam_appid', userGame.steam_appid)
                    .single();
                const gameName = (gameData === null || gameData === void 0 ? void 0 : gameData.name) || 'Unknown Game';
                logUserActivity(userId, 'game.started', { gameName });
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
        if ((status === 'completed' || status === 'completed_100') &&
            !updateData.completed_at) {
            updateData.completed_at = new Date().toISOString();
        }
        const { data: result, error: updateError } = yield client_1.supabase
            .from('user_games')
            .update(updateData)
            .eq('id', gameId)
            .select()
            .single();
        if (updateError) {
            throw updateError;
        }
        res.json(result);
    }
    catch (error) {
        console.error('Error updating user game:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res
            .status(500)
            .json({ error: 'Failed to update game', details: errorMessage });
    }
}));
// DELETE /api/user/games/:id - Remove game from user's backlog
app.delete('/api/user/games/:id', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const gameId = req.params.id;
        // Verify ownership
        const { data: userGame, error: userGameError } = yield client_1.supabase
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
        const { error: deleteError } = yield client_1.supabase
            .from('user_games')
            .delete()
            .eq('id', gameId);
        if (deleteError) {
            throw deleteError;
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error removing game from backlog:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to remove game from backlog',
            details: errorMessage,
        });
    }
}));
// GET /api/user/stats - Get user's gaming statistics
app.get('/api/user/stats', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Get various stats in parallel
        const [{ count: totalGames }, { count: completedGames }, { count: currentlyPlaying }, { count: wantToPlay }, { count: onHold }, { count: dropped },] = yield Promise.all([
            client_1.supabase
                .from('user_games')
                .select('id', { count: 'exact' })
                .eq('user_id', userId),
            client_1.supabase
                .from('user_games')
                .select('id', { count: 'exact' })
                .eq('user_id', userId)
                .eq('status', 'completed'),
            client_1.supabase
                .from('user_games')
                .select('id', { count: 'exact' })
                .eq('user_id', userId)
                .eq('status', 'currently_playing'),
            client_1.supabase
                .from('user_games')
                .select('id', { count: 'exact' })
                .eq('user_id', userId)
                .eq('status', 'want_to_play'),
            client_1.supabase
                .from('user_games')
                .select('id', { count: 'exact' })
                .eq('user_id', userId)
                .eq('status', 'on_hold'),
            client_1.supabase
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
            completionPercentage: (totalGames || 0) > 0
                ? Math.round(((completedGames || 0) / (totalGames || 0)) * 100)
                : 0,
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching user stats:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res
            .status(500)
            .json({ error: 'Failed to fetch user stats', details: errorMessage });
    }
}));
// Helper function to log user activity
function logUserActivity(userId, type, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield client_1.supabase.from('user_activity').insert({
                user_id: userId,
                type: type,
                timestamp: new Date().toISOString(),
                metadata_json: JSON.stringify(metadata),
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
        const userId = req.user.id;
        const { data: userGames, error } = yield client_1.supabase
            .from('user_games')
            .select('hours_played')
            .eq('user_id', userId)
            .limit(5000); // A high limit to get all games
        if (error) {
            throw error;
        }
        const totalHoursPlayed = (userGames || []).reduce((sum, game) => sum + (game.hours_played || 0), 0);
        res.json({
            totalHoursPlayed: Math.round(totalHoursPlayed * 100) / 100, // Round to 2 decimal places
        });
    }
    catch (error) {
        console.error('Error fetching user extended stats:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to fetch user extended stats',
            details: errorMessage,
        });
    }
}));
// GET /api/user/achievements/recent - Get user's most recent achievements
app.get('/api/user/achievements/recent', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Fetch 5 most recent unlocked achievements with related data
        const { data: recentUserAchievements, error: achievementsError } = yield client_1.supabase
            .from('user_achievements')
            .select(`
                *,
                achievement:achievements(*),
                game:games(*)
            `)
            .eq('user_id', userId)
            .eq('is_unlocked', true)
            .order('unlock_time', { ascending: false })
            .limit(5);
        if (achievementsError) {
            throw achievementsError;
        }
        res.json(recentUserAchievements || []);
    }
    catch (error) {
        console.error('Error fetching recent achievements:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to fetch recent achievements',
            details: errorMessage,
        });
    }
}));
// GET /api/user/activity - Get user's most recent activities
app.get('/api/user/activity', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { data: activities, error } = yield client_1.supabase
            .from('user_activity')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(10);
        if (error) {
            throw error;
        }
        res.json(activities || []);
    }
    catch (error) {
        console.error('Error fetching user activity:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to fetch user activity',
            details: errorMessage,
        });
    }
}));
app.listen(port, '0.0.0.0', () => {
    console.log(`API server listening on port ${port}`);
});
