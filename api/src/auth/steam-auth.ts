import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import { Request } from 'express';
import config from '../config';
import { supabase } from '../supabase/client';
import { syncUserWithSteam } from '../services/user-steam-sync-service';
import { User } from '../types/steam.types';
import { logger } from '../utils/logger';
import {
  AuthError,
  SessionError,
  SteamAuthError,
  UserCreationError,
} from '../errors/AuthErrors';

/**
 * Steam profile data returned from OAuth callback
 */
interface SteamProfile {
  _json: {
    steamid: string;
    personaname: string;
    profileurl: string;
    avatarfull: string;
    avatarmedium: string;
    avatar: string;
    realname?: string;
    loccountrycode?: string;
    communityvisibilitystate: number;
  };
  displayName: string;
}

/**
 * Express request with optional correlation ID override
 */
type SteamCallbackRequest = Request & { id?: string };

/**
 * Passport done callback function type
 */
type PassportDoneFunction = (error: Error | null, user?: User | false) => void;

// Define return path constant to avoid magic strings
const STEAM_RETURN_PATH = '/auth/steam/return';

// API_URL may be set to the nginx proxy base (e.g. https://gamelog.feiko.org/api).
// Steam OAuth callbacks are handled via the /auth/ nginx location, so we must
// strip any trailing /api path — identical to how the frontend api.ts strips it
// from VITE_API_URL.  The result is the scheme+host the browser reaches.
const API_URL = (process.env.API_URL || `http://localhost:${config.port}`)
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

// Configure Passport Steam strategy
passport.use(
  new SteamStrategy(
    {
      returnURL: `${API_URL}${STEAM_RETURN_PATH}`,
      realm: `${API_URL}/`,
      apiKey: config.steamApiKey!,
      passReqToCallback: true,
    },
    (
      req: Request,
      identifier: string,
      profile: SteamProfile,
      done: PassportDoneFunction
    ) => {
      // Handle async operations with proper error handling
      void (async () => {
        const steamReq = req as SteamCallbackRequest;
        const requestId = steamReq.id || 'unknown';

        try {
          // Extract Steam ID from identifier
          const steamId = identifier.split('/').pop();

          if (!steamId) {
            throw new SteamAuthError(
              'Invalid Steam identifier received from OAuth callback',
              'INVALID_STEAM_ID',
              { identifier }
            );
          }

          logger.auth('Steam OAuth callback received', {
            requestId,
            steamId,
          });

          // Create or update user
          const user = await createOrUpdateUser(profile, requestId);

          logger.auth('User authenticated successfully via Steam', {
            requestId,
            userId: user.id,
            steamId: user.steam_id,
          });

          return done(null, user);
        } catch (error) {
          const authMeta =
            error instanceof AuthError ? error.metadata : undefined;
          const errorCode =
            error instanceof AuthError ? error.errorCode : undefined;
          logger.error(
            'Steam authentication failed',
            error as Error,
            { requestId, identifier, errorCode },
            authMeta
          );
          return done(error as Error, false);
        }
      })();
    }
  )
);

// Serialize user for session
passport.serializeUser(
  (user: Express.User, done: (err: Error | null, id?: string) => void) => {
    const typedUser = user as User;

    if (!typedUser.id) {
      logger.error(
        'Attempted to serialize user without ID',
        new Error('Missing user ID'),
        { steamId: typedUser.steam_id }
      );
      return done(
        new SessionError(
          'Invalid user object - missing ID',
          'MISSING_USER_ID',
          {
            steamId: typedUser.steam_id,
          }
        )
      );
    }

    logger.debug('User serialized to session', {
      userId: typedUser.id,
      steamId: typedUser.steam_id,
    });

    done(null, typedUser.id);
  }
);

// Deserialize user from session
passport.deserializeUser(
  (userId: string, done: (err: Error | null, user?: User | false) => void) => {
    // Handle async operations with proper error handling
    void (async () => {
      try {
        const user = await getUserById(userId);

        if (!user) {
          logger.warn('User not found during deserialization', {
            userId,
          });
          return done(null, false); // Invalid session, force re-login
        }

        logger.debug('User deserialized from session', {
          userId: user.id,
          steamId: user.steam_id,
        });

        done(null, user);
      } catch (error) {
        logger.error('Error deserializing user', error as Error, {
          userId,
        });
        done(error as Error, false);
      }
    })();
  }
);

/**
 * Creates a new user or updates an existing user from Steam profile data
 *
 * @param profile - Steam profile data from OAuth callback
 * @param requestId - Request correlation ID for logging
 * @returns User object with database ID
 * @throws {UserCreationError} If user creation/update fails
 * @throws {SteamAuthError} If profile data is invalid
 */
async function createOrUpdateUser(
  profile: SteamProfile,
  requestId: string
): Promise<User> {
  const steamId = profile._json.steamid;

  // Validate profile data
  if (!steamId || !profile._json.personaname) {
    throw new SteamAuthError(
      'Incomplete profile data from Steam',
      'INVALID_PROFILE',
      {
        hasSteamId: !!steamId,
        hasPersonaName: !!profile._json.personaname,
      }
    );
  }

  try {
    // Check if user already exists
    const { data: existingUsers, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('steam_id', steamId);

    if (fetchError) {
      throw new UserCreationError(
        'Failed to check existing user',
        'DB_QUERY_ERROR',
        {
          steamId,
          dbError: fetchError.message,
          dbCode: fetchError.code,
          dbDetails: fetchError.details,
          dbHint: fetchError.hint,
        }
      );
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
      is_public_profile: profile._json.communityvisibilitystate === 3,
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
        throw new UserCreationError(
          'Failed to update user',
          'DB_UPDATE_ERROR',
          {
            steamId,
            userId: existingUser.id,
            dbError: updateError.message,
            dbCode: updateError.code,
            dbDetails: updateError.details,
            dbHint: updateError.hint,
          }
        );
      }

      logger.info('Existing user updated', {
        requestId,
        userId: updatedUser.id,
        steamId: updatedUser.steam_id,
      });

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
        logger.info(
          'Auto-import enabled and sync due, starting background sync',
          {
            requestId,
            userId: updatedUser.id,
            displayName: updatedUser.display_name,
          }
        );
        void syncUserWithSteam(updatedUser as unknown as User);
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
        throw new UserCreationError(
          'Failed to create user',
          'DB_INSERT_ERROR',
          {
            steamId,
            dbError: createError.message,
            dbCode: createError.code,
            dbDetails: createError.details,
            dbHint: createError.hint,
          }
        );
      }

      logger.info('New user created', {
        requestId,
        userId: newUser.id,
        steamId: newUser.steam_id,
        displayName: newUser.display_name,
      });

      // Import Steam library if auto_import is enabled
      if (newUserData.auto_import_steam_games) {
        logger.info(
          'Auto-import enabled for new user, starting background sync',
          {
            requestId,
            userId: newUser.id,
            displayName: newUser.display_name,
          }
        );
        void syncUserWithSteam(newUser as unknown as User);
      }

      return newUser as User;
    }
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof SteamAuthError || error instanceof UserCreationError) {
      throw error;
    }

    // Wrap unexpected errors
    logger.error('Unexpected error in createOrUpdateUser', error as Error, {
      requestId,
      steamId,
    });

    throw new UserCreationError(
      'Failed to create or update user',
      'UNKNOWN_ERROR',
      { steamId, originalError: (error as Error).message }
    );
  }
}

/**
 * Retrieves a user by their database ID
 *
 * @param userId - User's database ID
 * @returns User object or null if not found
 * @throws {UserCreationError} If database query fails (not including "not found")
 */
async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // PGRST116 = no rows returned (not an error, just not found)
      if (error.code === 'PGRST116') {
        logger.debug('User not found by ID', { userId });
        return null;
      }

      // Actual database error
      throw new UserCreationError(
        'Failed to retrieve user by ID',
        'DB_QUERY_ERROR',
        {
          userId,
          dbError: error.message,
        }
      );
    }

    return user as User;
  } catch (error: unknown) {
    if (error instanceof UserCreationError) {
      throw error;
    }

    logger.error('Unexpected error getting user by ID', error as Error, {
      userId,
    });
    return null;
  }
}

/**
 * Retrieves a user by their Steam ID
 *
 * @param steamId - User's Steam ID
 * @returns User object or null if not found
 * @throws {UserCreationError} If database query fails
 */
async function getUserBySteamId(steamId: string): Promise<User | null> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('steam_id', steamId);

    if (error) {
      throw new UserCreationError(
        'Failed to retrieve user by Steam ID',
        'DB_QUERY_ERROR',
        { steamId, dbError: error.message }
      );
    }

    if (!users || users.length === 0) {
      logger.debug('User not found by Steam ID', { steamId });
      return null;
    }

    return users[0] as User;
  } catch (error) {
    if (error instanceof UserCreationError) {
      throw error;
    }

    logger.error('Unexpected error getting user by Steam ID', error as Error, {
      steamId,
    });
    return null;
  }
}

export { passport, createOrUpdateUser, getUserById, getUserBySteamId, User };
