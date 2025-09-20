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
exports.passport = void 0;
exports.createOrUpdateUser = createOrUpdateUser;
exports.getUserById = getUserById;
exports.getUserBySteamId = getUserBySteamId;
const passport_1 = __importDefault(require("passport"));
exports.passport = passport_1.default;
const passport_steam_1 = require("passport-steam");
const config_1 = __importDefault(require("../config"));
const client_1 = require("../supabase/client");
const user_steam_sync_service_1 = require("../services/user-steam-sync-service");
// Supabase client is imported from ../supabase/client
// SteamProfile interface removed as it's not currently used
// Add a final check right before the strategy is configured
console.log(`--- STEAM AUTH DEBUG ---`);
console.log(`API Key used for SteamStrategy: ${config_1.default.steamApiKey ? `A key starting with "${config_1.default.steamApiKey.substring(0, 4)}..."` : 'undefined'}`);
console.log(`------------------------`);
// Configure Passport Steam strategy
passport_1.default.use(new passport_steam_1.Strategy({
    returnURL: 'http://localhost:6543/auth/steam/return',
    realm: 'http://localhost:6543/',
    apiKey: config_1.default.steamApiKey,
    passReqToCallback: true,
}, (req, identifier, profile, done) => {
    // Handle async operations with proper error handling
    void (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // More detailed logging
            console.log('Steam callback received. Headers:', JSON.stringify(req.headers, null, 2));
            // Extract Steam ID from identifier
            const steamId = identifier.split('/').pop();
            console.log('Steam auth callback for Steam ID:', steamId);
            console.log('Profile data:', JSON.stringify(profile._json, null, 2));
            // Create or update user
            const user = yield createOrUpdateUser(profile);
            return done(null, user);
        }
        catch (error) {
            console.error('Steam auth error:', error);
            return done(error, false);
        }
    }))();
}));
// Serialize user for session
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
// Deserialize user from session
passport_1.default.deserializeUser((userId, done) => {
    // Handle async operations with proper error handling
    void (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const user = yield getUserById(userId);
            done(null, user);
        }
        catch (error) {
            done(error, null);
        }
    }))();
});
function createOrUpdateUser(profile) {
    return __awaiter(this, void 0, void 0, function* () {
        const steamId = profile._json.steamid;
        try {
            // Check if user already exists
            const { data: existingUsers, error: fetchError } = yield client_1.supabase
                .from('users')
                .select('*')
                .eq('steam_id', steamId);
            if (fetchError) {
                throw fetchError;
            }
            const userData = {
                steam_id: steamId,
                display_name: profile.displayName || profile._json.personaname,
                avatar_url: profile._json.avatarfull ||
                    profile._json.avatarmedium ||
                    profile._json.avatar,
                profile_url: profile._json.profileurl,
                real_name: profile._json.realname || undefined,
                country_code: profile._json.loccountrycode || undefined,
                is_public_profile: profile._json.communityvisibilitystate === 3, // 3 = public profile
                last_active: new Date().toISOString(),
            };
            if (existingUsers && existingUsers.length > 0) {
                // Update existing user
                const existingUser = existingUsers[0];
                const { data: updatedUser, error: updateError } = yield client_1.supabase
                    .from('users')
                    .update(userData)
                    .eq('id', existingUser.id)
                    .select()
                    .single();
                if (updateError) {
                    throw updateError;
                }
                console.log('Updated existing user:', updatedUser.id);
                // Check if sync is due for existing user
                const now = new Date();
                const lastSync = updatedUser.last_steam_sync
                    ? new Date(String(updatedUser.last_steam_sync))
                    : null;
                const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                if (updatedUser.auto_import_steam_games &&
                    (!lastSync || lastSync < twentyFourHoursAgo)) {
                    console.log(`Auto-import enabled and sync due for ${updatedUser.display_name}. Starting sync in background.`);
                    void (0, user_steam_sync_service_1.syncUserWithSteam)(updatedUser); // Fire-and-forget
                }
                return updatedUser;
            }
            else {
                // Create new user
                const newUserData = Object.assign(Object.assign({}, userData), { auto_import_steam_games: true, sync_steam_playtime: true, default_game_status: 'want_to_play', theme: 'dark', default_view: 'grid', created_at: new Date().toISOString() });
                const { data: newUser, error: createError } = yield client_1.supabase
                    .from('users')
                    .insert(newUserData)
                    .select()
                    .single();
                if (createError) {
                    throw createError;
                }
                console.log('Created new user:', newUser.id);
                // Optionally import Steam library if auto_import is enabled
                if (newUserData.auto_import_steam_games) {
                    console.log(`Auto-import enabled for ${newUser.display_name}. Starting sync in background.`);
                    void (0, user_steam_sync_service_1.syncUserWithSteam)(newUser); // Fire-and-forget
                }
                return newUser;
            }
        }
        catch (error) {
            console.error('Error creating/updating user:', error);
            throw error;
        }
    });
}
function getUserById(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { data: user, error } = yield client_1.supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return null;
                }
                throw error;
            }
            return user;
        }
        catch (error) {
            console.error('Error getting user by ID:', error);
            return null;
        }
    });
}
function getUserBySteamId(steamId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { data: users, error } = yield client_1.supabase
                .from('users')
                .select('*')
                .eq('steam_id', steamId);
            if (error) {
                throw error;
            }
            return users && users.length > 0 ? users[0] : null;
        }
        catch (error) {
            console.error('Error getting user by Steam ID:', error);
            return null;
        }
    });
}
