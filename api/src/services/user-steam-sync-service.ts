import axios from 'axios';
import config from '../config';
import { supabase } from '../supabase/client';

import {
  fetchGameDetailsFromSteam,
  updateGameInSupabase,
} from './steam-refresh-service';
import { GameStats, OwnedGame, PlayerAchievement } from '../types/steam.types';

const STEAM_API_BASE = 'https://api.steampowered.com';

interface OwnedGamesResponse {
  response: {
    game_count: number;
    games: OwnedGame[];
  };
}

/**
 * Fetches the list of games owned by a user from the Steam API.
 */
async function getOwnedGames(
  steamId: string,
  apiKey: string
): Promise<OwnedGame[]> {
  const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/`;
  try {
    const response = await axios.get<OwnedGamesResponse>(url, {
      params: {
        key: apiKey,
        steamid: steamId,
        include_appinfo: true,
        include_played_free_games: true,
        format: 'json',
      },
    });
    return response.data.response.games || [];
  } catch (error) {
    console.error(`Error fetching owned games for steamId ${steamId}:`, error);
    return [];
  }
}

interface PlayerAchievementsResponse {
  playerstats: {
    steamID: string;
    gameName: string;
    achievements: PlayerAchievement[];
    success: boolean;
  };
}

/**
 * Fetches a user's achievements for a specific game.
 */
async function getPlayerAchievements(
  steamId: string,
  appId: number,
  apiKey: string
): Promise<PlayerAchievement[]> {
  const url = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/`;
  try {
    const response = await axios.get<PlayerAchievementsResponse>(url, {
      params: {
        key: apiKey,
        steamid: steamId,
        appid: appId,
        l: 'english',
      },
    });
    return response.data.playerstats.achievements || [];
  } catch {
    // It's common for this to fail (e.g., game has no stats), so we log softly
    // console.log(`Could not fetch achievements for appid ${appId}:`, error.response?.data?.playerstats?.error);
    return [];
  }
}

interface UserStatsForGameResponse {
  playerstats: {
    steamID: string;
    gameName: string;
    stats: GameStats[];
    achievements: {
      name: string;
      achieved: number;
    }[];
  };
}

/**
 * Fetches a user's stats for a specific game (e.g., kills, deaths).
 */
async function getUserStatsForGame(
  steamId: string,
  appId: number,
  apiKey: string
): Promise<GameStats[]> {
  const url = `${STEAM_API_BASE}/ISteamUserStats/GetUserStatsForGame/v2/`;
  try {
    const response = await axios.get<UserStatsForGameResponse>(url, {
      params: {
        key: apiKey,
        steamid: steamId,
        appid: appId,
      },
    });
    return response.data.playerstats.stats || [];
  } catch {
    // console.log(`Could not fetch user stats for appid ${appId}:`, error.response?.data?.playerstats?.error);
    return [];
  }
}

async function getUserBacklog(userId: string): Promise<Map<number, any>> {
  const backlog = new Map<number, any>();
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('user_games')
      .select('*, game:games(*)') // Fetch linked game data to check enrichment status
      .eq('user_id', userId)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error(
        `Error fetching user backlog page for user ${userId}:`,
        error
      );
      hasMore = false;
      break;
    }

    if (data.length > 0) {
      data.forEach(doc => backlog.set(Number(doc.steam_appid), doc));
      page++;
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return backlog;
}

async function syncGameStats(
  steamId: string,
  userId: string,
  gameId: string,
  appId: number,
  apiKey: string
): Promise<void> {
  const stats = await getUserStatsForGame(steamId, appId, apiKey);
  if (stats.length > 0) {
    const statsJson = JSON.stringify(stats);
    await supabase
      .from('user_games')
      .update({ stats_json: statsJson })
      .eq('id', gameId);
  }
}

async function syncGameAchievements(
  steamId: string,
  userId: string,
  appId: number,
  apiKey: string
): Promise<void> {
  const achievements = await getPlayerAchievements(steamId, appId, apiKey);
  if (achievements.length === 0) {
    return;
  }

  const recordsToUpsert = achievements.map(ach => ({
    user_id: userId,
    steam_appid: appId,
    achievement_api_name: ach.apiname,
    is_unlocked: ach.achieved === 1,
    unlock_time:
      ach.achieved === 1 ? new Date(ach.unlocktime * 1000).toISOString() : null,
  }));

  const { error } = await supabase
    .from('user_achievements')
    .upsert(recordsToUpsert, { onConflict: 'user_id,achievement_api_name' });

  if (error) {
    console.error(`Error syncing achievements for app ${appId}:`, error);
  }
}

/**
 * The main service function to sync a user's Steam library with Supabase.
 */
export async function syncUserWithSteam(user: any): Promise<void> {
  console.log(
    `Starting Steam sync for user: ${user.display_name} (${user.steam_id})`
  );

  if (!config.steamApiKey) {
    console.error('Steam API key is not configured. Aborting sync.');
    return;
  }

  // 1. Fetch all owned games from Steam
  const ownedGames = await getOwnedGames(
    String(user.steam_id),
    config.steamApiKey
  );
  console.log(
    `Found ${ownedGames.length} owned games for user ${user.steam_id}.`
  );
  if (ownedGames.length === 0) {
    return;
  }

  // 2. Get user's existing backlog from Supabase
  const userBacklog = await getUserBacklog(String(user.id));
  console.log(`User has ${userBacklog.size} games in their backlog.`);

  const gamesToSyncDetails: { gameId: string; appId: number }[] = [];
  const gamesToEnrich: { gameId: string; appId: number; name: string }[] = [];
  const newGames: OwnedGame[] = [];

  // 3. Separate existing vs new games
  for (const game of ownedGames) {
    const existingGame = userBacklog.get(game.appid);

    if (existingGame) {
      // Existing Game Logic (Updates)
      const hoursPlayed = Math.round((game.playtime_forever / 60) * 100) / 100;
      const playtime2Weeks = game.playtime_2weeks || 0;
      const gameId = existingGame.id;

      const updatePayload: any = {};
      let needsUpdate = false;

      // Check if playtime stats updated
      if (existingGame.hours_played !== hoursPlayed) {
        updatePayload.hours_played = hoursPlayed;
        needsUpdate = true;
        // If playtime changed, queue for detail sync (stats/achievements)
        gamesToSyncDetails.push({ gameId, appId: game.appid });
      }
      if (existingGame.playtime_2weeks !== playtime2Weeks) {
        updatePayload.playtime_2weeks = playtime2Weeks;
        needsUpdate = true;
      }
      if (playtime2Weeks > 0) {
        updatePayload.last_played = new Date().toISOString();
        needsUpdate = true;
      }

      // Update icon/logo if they changed or were missing
      if (
        game.img_icon_url &&
        existingGame.img_icon_url !== game.img_icon_url
      ) {
        updatePayload.img_icon_url = game.img_icon_url;
        needsUpdate = true;
      }
      if (
        game.img_logo_url &&
        existingGame.img_logo_url !== game.img_logo_url
      ) {
        updatePayload.img_logo_url = game.img_logo_url;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updatePayload.updated_at = new Date().toISOString();
        // Fire and forget individual updates to not block main flow, or collect?
        // For now, fire and forget to keep it simple, or we could batch updates if supabase supported it easily.
        // Given existing games are usually few relative to initial import, invalidating "fast sync" isn't as big of a deal.
        // But for massive updates, parallel is better.
        void supabase
          .from('user_games')
          .update(updatePayload)
          .eq('id', gameId)
          .then();
      }

      // Check enrichment
      if (
        existingGame.game &&
        (!existingGame.game.header_image || !existingGame.game.last_updated)
      ) {
        gamesToEnrich.push({
          gameId: existingGame.game.id,
          appId: game.appid,
          name: game.name,
        });
      }
    } else {
      newGames.push(game);
    }
  }

  // 4. Batch Process New Games
  if (newGames.length > 0) {
    console.log(
      `Found ${newGames.length} new games to add. Processing batch...`
    );

    // Batch fetch master games for new games
    const newAppIds = newGames.map(g => g.appid);
    const masterGameMap = new Map<number, string>(); // appId -> gameId

    // Supabase .in() limit is usually high (e.g. 65535 parameters), but let's chunk to be safe
    const LOOKUP_CHUNK_SIZE = 500;
    for (let i = 0; i < newAppIds.length; i += LOOKUP_CHUNK_SIZE) {
      const chunk = newAppIds.slice(i, i + LOOKUP_CHUNK_SIZE);
      const { data: masterGames } = await supabase
        .from('games')
        .select('id, steam_appid')
        .in('steam_appid', chunk);

      masterGames?.forEach((mg: any) => {
        if (mg.steam_appid) { masterGameMap.set(mg.steam_appid as number, mg.id as string); }
      });
    }

    const userGamesToInsert: any[] = [];

    for (const game of newGames) {
      const masterGameId = masterGameMap.get(game.appid);
      // Only add if master game exists (or we could separate logic to create master games, but that's what steam refresh service is for)
      if (masterGameId) {
        const hoursPlayed =
          Math.round((game.playtime_forever / 60) * 100) / 100;
        const playtime2Weeks = game.playtime_2weeks || 0;

        userGamesToInsert.push({
          user_id: user.id,
          game_id: masterGameId,
          steam_appid: game.appid,
          status: 'want_to_play', // Default
          hours_played: hoursPlayed,
          playtime_2weeks: playtime2Weeks,
          added_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_played:
            playtime2Weeks > 0 ? new Date().toISOString() : undefined,
          img_icon_url: game.img_icon_url,
          img_logo_url: game.img_logo_url,
        });

        // Queue for enrichment since it's new
        gamesToEnrich.push({
          gameId: masterGameId,
          appId: game.appid,
          name: game.name,
        });
      } else {
        // Optional: Log missing master game
        // console.log(`Skipping ${game.name} - Master game not found`);
      }
    }

    if (userGamesToInsert.length > 0) {
      // Bulk insert user games
      const INSERT_CHUNK_SIZE = 100;
      for (let i = 0; i < userGamesToInsert.length; i += INSERT_CHUNK_SIZE) {
        const chunk = userGamesToInsert.slice(i, i + INSERT_CHUNK_SIZE);
        const { data: inserted, error } = await supabase
          .from('user_games')
          .insert(chunk)
          .select('id, steam_appid');

        if (error) {
          console.error('Error batch inserting user games', error);
        } else if (inserted) {
          // Queue for detailed sync
          inserted.forEach((ig: any) => {
            gamesToSyncDetails.push({ gameId: ig.id, appId: ig.steam_appid });
          });
        }
      }
      console.log(
        `Successfully batch inserted ${userGamesToInsert.length} games.`
      );
    }
  }

  console.log(
    `Phase 1 completed. ${gamesToSyncDetails.length} games need detail sync.`
  );

  // 5. Update the user's `last_steam_sync` timestamp immediately
  await supabase
    .from('users')
    .update({ last_steam_sync: new Date().toISOString() })
    .eq('id', user.id);

  // 6. Background: Sync Achievements & Stats & Enrichment
  // We do NOT await this, effectively allowing the "main" sync to "complete" regarding the list view
  void (async () => {
    console.log('Starting background detail sync...');

    // Sync Details
    const CHUNK_SIZE = 5;
    for (let i = 0; i < gamesToSyncDetails.length; i += CHUNK_SIZE) {
      const chunk = gamesToSyncDetails.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(item =>
          Promise.all([
            syncGameAchievements(
              String(user.steam_id),
              String(user.id),
              item.appId,
              config.steamApiKey!
            ),
            syncGameStats(
              String(user.steam_id),
              String(user.id),
              item.gameId,
              item.appId,
              config.steamApiKey!
            ),
          ])
        )
      );
    }

    // Enrich Data
    if (gamesToEnrich.length > 0) {
      console.log(`Enriching metadata for ${gamesToEnrich.length} games...`);
      const ENRICH_CHUNK_SIZE = 5;
      const DELAY_MS = 1000;

      for (let i = 0; i < gamesToEnrich.length; i += ENRICH_CHUNK_SIZE) {
        const chunk = gamesToEnrich.slice(i, i + ENRICH_CHUNK_SIZE);
        await Promise.all(
          chunk.map(async item => {
            try {
              const steamData = await fetchGameDetailsFromSteam(item.appId);
              if (steamData) {
                await updateGameInSupabase(item.gameId, steamData);
              }
            } catch (e) {
              console.error(`Failed to enrich game ${item.name}:`, e);
            }
          })
        );
        if (i + ENRICH_CHUNK_SIZE < gamesToEnrich.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }
    }
    console.log('Background detail sync completed.');
  })();

  console.log(`Main sync for user ${user.display_name} completed.`);
}
