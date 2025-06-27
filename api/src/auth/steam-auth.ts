import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import { Client, Databases, Query, ID, AppwriteException, Models } from 'node-appwrite';
import config from '../config';
import { syncUserWithSteam } from '../services/user-steam-sync-service';

const appwriteClient = new Client()
    .setEndpoint(config.appwrite.endpoint!)
    .setProject(config.appwrite.projectId!)
    .setKey(config.appwrite.apiKey!);
const appwriteDatabases = new Databases(appwriteClient);

interface SteamProfile {
    identifier: string;
    steamid: string;
    displayName: string;
    avatar: {
        small: string;
        medium: string;
        large: string;
    };
    photos: Array<{ value: string }>;
    _json: {
        steamid: string;
        personaname: string;
        profileurl: string;
        avatar: string;
        avatarmedium: string;
        avatarfull: string;
        realname?: string;
        loccountrycode?: string;
        communityvisibilitystate: number;
    };
}

interface User extends Models.Document {
    steam_id: string;
    display_name: string;
    avatar_url: string;
    profile_url: string;
    real_name?: string;
    country_code?: string;
    is_public_profile: boolean;
    auto_import_steam_games: boolean;
    sync_steam_playtime: boolean;
    default_game_status: string;
    theme: string;
    default_view: string;
    created_at: string;
    last_steam_sync?: string;
    last_active?: string;
}

// Add a final check right before the strategy is configured
console.log(`--- STEAM AUTH DEBUG ---`);
console.log(`API Key used for SteamStrategy: ${config.steamApiKey ? `A key starting with "${config.steamApiKey.substring(0, 4)}..."` : 'undefined'}`);
console.log(`------------------------`);

// Configure Passport Steam strategy
passport.use(new SteamStrategy({
    returnURL: 'http://localhost:6543/auth/steam/return',
    realm: 'http://localhost:6543/',
    apiKey: config.steamApiKey!,
    passReqToCallback: true
}, async (req: any, identifier: string, profile: any, done: any) => {
    try {
        // More detailed logging
        console.log('Steam callback received. Headers:', JSON.stringify(req.headers, null, 2));

        // Extract Steam ID from identifier
        const steamId = identifier.split('/').pop()!;
        
        console.log('Steam auth callback for Steam ID:', steamId);
        console.log('Profile data:', JSON.stringify(profile._json, null, 2));
        
        // Create or update user
        const user = await createOrUpdateUser(profile);
        return done(null, user);
    } catch (error) {
        console.error('Steam auth error:', error);
        return done(error, false);
    }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
    done(null, user.$id);
});

// Deserialize user from session
passport.deserializeUser(async (userId: string, done) => {
    try {
        const user = await getUserById(userId);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

async function createOrUpdateUser(profile: any): Promise<User> {
    const databaseId = config.appwrite.databaseId!;
    const usersCollectionId = 'users';
    const steamId = profile._json.steamid;
    
    try {
        // Check if user already exists
        const existingUsers = await appwriteDatabases.listDocuments(
            databaseId,
            usersCollectionId,
            [Query.equal('steam_id', steamId)]
        );
        
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
            const updatedUser = await appwriteDatabases.updateDocument(
                databaseId,
                usersCollectionId,
                existingUser.$id,
                userData
            );
            
            console.log('Updated existing user:', updatedUser.$id);
            return updatedUser as User;
        } else {
            // Create new user
            const newUserData = {
                ...userData,
                auto_import_steam_games: true,
                sync_steam_playtime: true,
                default_game_status: 'want_to_play',
                theme: 'dark',
                default_view: 'grid',
                created_at: new Date().toISOString()
            };
            
            const newUser = await appwriteDatabases.createDocument(
                databaseId,
                usersCollectionId,
                ID.unique(),
                newUserData
            );
            
            console.log('Created new user:', newUser.$id);
            
            // Optionally import Steam library if auto_import is enabled
            if (newUserData.auto_import_steam_games) {
                console.log(`Auto-import enabled for ${newUser.display_name}. Starting sync in background.`);
                syncUserWithSteam(newUser as User); // Fire-and-forget
            }
            
            return newUser as User;
        }
    } catch (error) {
        console.error('Error creating/updating user:', error);
        throw error;
    }
}

async function getUserById(userId: string): Promise<User | null> {
    try {
        const user = await appwriteDatabases.getDocument(
            config.appwrite.databaseId!,
            'users',
            userId
        );
        return user as User;
    } catch (error) {
        if (error instanceof AppwriteException && error.code === 404) {
            return null;
        }
        throw error;
    }
}

async function getUserBySteamId(steamId: string): Promise<User | null> {
    try {
        const users = await appwriteDatabases.listDocuments(
            config.appwrite.databaseId!,
            'users',
            [Query.equal('steam_id', steamId)]
        );
        
        return users.documents.length > 0 ? users.documents[0] as User : null;
    } catch (error) {
        console.error('Error getting user by Steam ID:', error);
        return null;
    }
}

export { passport, createOrUpdateUser, getUserById, getUserBySteamId, User }; 