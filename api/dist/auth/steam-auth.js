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
const node_appwrite_1 = require("node-appwrite");
const config_1 = __importDefault(require("../config"));
const user_steam_sync_service_1 = require("../services/user-steam-sync-service");
const appwriteClient = new node_appwrite_1.Client()
    .setEndpoint(config_1.default.appwrite.endpoint)
    .setProject(config_1.default.appwrite.projectId)
    .setKey(config_1.default.appwrite.apiKey);
const appwriteDatabases = new node_appwrite_1.Databases(appwriteClient);
// Add a final check right before the strategy is configured
console.log(`--- STEAM AUTH DEBUG ---`);
console.log(`API Key used for SteamStrategy: ${config_1.default.steamApiKey ? `A key starting with "${config_1.default.steamApiKey.substring(0, 4)}..."` : 'undefined'}`);
console.log(`------------------------`);
// Configure Passport Steam strategy
passport_1.default.use(new passport_steam_1.Strategy({
    returnURL: 'http://localhost:6543/auth/steam/return',
    realm: 'http://localhost:6543/',
    apiKey: config_1.default.steamApiKey,
    passReqToCallback: true
}, (req, identifier, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
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
})));
// Serialize user for session
passport_1.default.serializeUser((user, done) => {
    done(null, user.$id);
});
// Deserialize user from session
passport_1.default.deserializeUser((userId, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield getUserById(userId);
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
}));
function createOrUpdateUser(profile) {
    return __awaiter(this, void 0, void 0, function* () {
        const databaseId = config_1.default.appwrite.databaseId;
        const usersCollectionId = 'users';
        const steamId = profile._json.steamid;
        try {
            // Check if user already exists
            const existingUsers = yield appwriteDatabases.listDocuments(databaseId, usersCollectionId, [node_appwrite_1.Query.equal('steam_id', steamId)]);
            const userData = {
                steam_id: steamId,
                display_name: profile.displayName || profile._json.personaname,
                avatar_url: profile._json.avatarfull || profile._json.avatarmedium || profile._json.avatar,
                profile_url: profile._json.profileurl,
                real_name: profile._json.realname || undefined,
                country_code: profile._json.loccountrycode || undefined,
                is_public_profile: profile._json.communityvisibilitystate === 3, // 3 = public profile
                last_active: new Date().toISOString()
            };
            if (existingUsers.documents.length > 0) {
                // Update existing user
                const existingUser = existingUsers.documents[0];
                const updatedUser = yield appwriteDatabases.updateDocument(databaseId, usersCollectionId, existingUser.$id, userData);
                console.log('Updated existing user:', updatedUser.$id);
                return updatedUser;
            }
            else {
                // Create new user
                const newUserData = Object.assign(Object.assign({}, userData), { auto_import_steam_games: true, sync_steam_playtime: true, default_game_status: 'want_to_play', theme: 'dark', default_view: 'grid', created_at: new Date().toISOString() });
                const newUser = yield appwriteDatabases.createDocument(databaseId, usersCollectionId, node_appwrite_1.ID.unique(), newUserData);
                console.log('Created new user:', newUser.$id);
                // Optionally import Steam library if auto_import is enabled
                if (newUserData.auto_import_steam_games) {
                    console.log(`Auto-import enabled for ${newUser.display_name}. Starting sync in background.`);
                    (0, user_steam_sync_service_1.syncUserWithSteam)(newUser); // Fire-and-forget
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
            const user = yield appwriteDatabases.getDocument(config_1.default.appwrite.databaseId, 'users', userId);
            return user;
        }
        catch (error) {
            if (error instanceof node_appwrite_1.AppwriteException && error.code === 404) {
                return null;
            }
            throw error;
        }
    });
}
function getUserBySteamId(steamId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const users = yield appwriteDatabases.listDocuments(config_1.default.appwrite.databaseId, 'users', [node_appwrite_1.Query.equal('steam_id', steamId)]);
            return users.documents.length > 0 ? users.documents[0] : null;
        }
        catch (error) {
            console.error('Error getting user by Steam ID:', error);
            return null;
        }
    });
}
