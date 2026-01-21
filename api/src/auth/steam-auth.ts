import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import config from '../config';
import { supabase } from '../supabase/client';
import { syncUserWithSteam } from '../services/user-steam-sync-service';
import { User } from '../types/steam.types';

// Supabase client is imported from ../supabase/client

// SteamProfile interface removed as it's not currently used

// Add a final check right before the strategy is configured
console.log(`--- STEAM AUTH DEBUG ---`);
console.log(
  `API Key used for SteamStrategy: ${config.steamApiKey ? `A key starting with "${config.steamApiKey.substring(0, 4)}..."` : 'undefined'}`
);
console.log(`------------------------`);

// Define return path constant to avoid magic strings
const STEAM_RETURN_PATH = '/api/auth/steam/return';

// Configure Passport Steam strategy
passport.use(
  new SteamStrategy(
    {
      returnURL: `${config.frontendUrl}${STEAM_RETURN_PATH}`,
      realm: `${config.frontendUrl}/`,
      apiKey: config.steamApiKey!,
      passReqToCallback: true,
    },
    (req: any, identifier: string, profile: any, done: any) => {
      // Handle async operations with proper error handling
      void (async () => {
        try {
          // More detailed logging
          console.log(
            'Steam callback received. Headers:',
            JSON.stringify(req.headers, null, 2)
          );

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
      })();
    }
  )
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((userId: string, done) => {
  // Handle async operations with proper error handling
  void (async () => {
    try {
      const user = await getUserById(userId);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  })();
});

async function createOrUpdateUser(profile: any): Promise<User> {
  const steamId = profile._json.steamid;

  try {
    // Check if user already exists
    const { data: existingUsers, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('steam_id', steamId);

    if (fetchError) {
      throw fetchError;
    }

    const userData = {
      steam_id: steamId,
      display_name: profile.displayName || profile._json.personaname,
      avatar_url:
        profile._json.avatarfull ||
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
      const { data: updatedUser, error: updateError } = await supabase
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

      if (
        updatedUser.auto_import_steam_games &&
        (!lastSync || lastSync < twentyFourHoursAgo)
      ) {
        console.log(
          `Auto-import enabled and sync due for ${updatedUser.display_name}. Starting sync in background.`
        );
        void syncUserWithSteam(updatedUser as unknown as User); // Fire-and-forget
      }

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
        created_at: new Date().toISOString(),
      };

      const { data: newUser, error: createError } = await supabase
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
        console.log(
          `Auto-import enabled for ${newUser.display_name}. Starting sync in background.`
        );
        void syncUserWithSteam(newUser as unknown as User); // Fire-and-forget
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
    const { data: user, error } = await supabase
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

    return user as User;
  } catch (error: unknown) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

async function getUserBySteamId(steamId: string): Promise<User | null> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('steam_id', steamId);

    if (error) {
      throw error;
    }

    return users && users.length > 0 ? (users[0] as User) : null;
  } catch (error) {
    console.error('Error getting user by Steam ID:', error);
    return null;
  }
}

export { passport, createOrUpdateUser, getUserById, getUserBySteamId, User };
