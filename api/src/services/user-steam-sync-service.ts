import axios from 'axios';
import config from '../config';
import { User } from '../auth/steam-auth';
import { supabase } from '../supabase/client';

import { OwnedGame, PlayerAchievement, GameStats, Achievement, AchievementDocument } from '../types/steam.types';

const STEAM_API_BASE = 'https://api.steampowered.com';

/**
 * Fetches the list of games owned by a user from the Steam API.
 */
async function getOwnedGames(steamId: string, apiKey: string): Promise<OwnedGame[]> {
    const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/`;
    try {
        const response = await axios.get(url, {
            params: {
                key: apiKey,
                steamid: steamId,
                include_appinfo: true,
                include_played_free_games: true,
                format: 'json'
            }
        });
        return response.data.response.games || [];
    } catch (error) {
        console.error(`Error fetching owned games for steamId ${steamId}:`, error);
        return [];
    }
}

/**
 * Fetches a user's achievements for a specific game.
 */
async function getPlayerAchievements(steamId: string, appId: number, apiKey: string): Promise<PlayerAchievement[]> {
    const url = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/`;
    try {
        const response = await axios.get(url, {
            params: {
                key: apiKey,
                steamid: steamId,
                appid: appId,
                l: 'english'
            }
        });
        return response.data.playerstats.achievements || [];
    } catch {
        // It's common for this to fail (e.g., game has no stats), so we log softly
        // console.log(`Could not fetch achievements for appid ${appId}:`, error.response?.data?.playerstats?.error);
        return [];
    }
}

/**
 * Fetches a user's stats for a specific game (e.g., kills, deaths).
 */
async function getUserStatsForGame(steamId: string, appId: number, apiKey: string): Promise<GameStats[]> {
     const url = `${STEAM_API_BASE}/ISteamUserStats/GetUserStatsForGame/v2/`;
    try {
        const response = await axios.get(url, {
            params: {
                key: apiKey,
                steamid: steamId,
                appid: appId
            }
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

    while(hasMore) {
        const { data, error } = await supabase
            .from('user_games')
            .select('*')
            .eq('user_id', userId)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error(`Error fetching user backlog page for user ${userId}:`, error);
            hasMore = false;
            break;
        }

        if (data.length > 0) {
            data.forEach(doc => backlog.set(doc.steam_appid, doc));
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



async function syncGameStats(steamId: string, userId: string, gameId: string, appId: number, apiKey: string) {
    const stats = await getUserStatsForGame(steamId, appId, apiKey);
    if (stats.length > 0) {
        const statsJson = JSON.stringify(stats);
        await supabase
            .from('user_games')
            .update({ stats_json: statsJson })
            .eq('id', gameId);
    }
}

async function syncGameAchievements(steamId: string, userId: string, appId: number, apiKey: string) {
    const achievements = await getPlayerAchievements(steamId, appId, apiKey);
    if (achievements.length === 0) return;

    const recordsToUpsert = achievements.map(ach => ({
        user_id: userId,
        steam_appid: appId,
        achievement_api_name: ach.apiname,
        is_unlocked: ach.achieved === 1,
        unlock_time: ach.achieved === 1 ? new Date(ach.unlocktime * 1000).toISOString() : null
    }));

    const { error } = await supabase.from('user_achievements').upsert(recordsToUpsert, { onConflict: 'user_id,achievement_api_name' });

    if (error) {
        console.error(`Error syncing achievements for app ${appId}:`, error);
    }
}

/**
 * The main service function to sync a user's Steam library with Supabase.
 */
export async function syncUserWithSteam(user: any) {
    console.log(`Starting Steam sync for user: ${user.display_name} (${user.steam_id})`);
    
    if (!config.steamApiKey) {
        console.error("Steam API key is not configured. Aborting sync.");
        return;
    }

    // 1. Fetch all owned games from Steam
    const ownedGames = await getOwnedGames(user.steam_id, config.steamApiKey);
    console.log(`Found ${ownedGames.length} owned games for user ${user.steam_id}.`);
    if (ownedGames.length === 0) return;

    // 2. Get user's existing backlog from Supabase
    const userBacklog = await getUserBacklog(user.id);
    console.log(`User has ${userBacklog.size} games in their backlog.`);

    // 3. Process each game
    for (const game of ownedGames) {
        const existingGame = userBacklog.get(game.appid);
        const hoursPlayed = Math.round((game.playtime_forever / 60) * 100) / 100;
        const playtime2Weeks = game.playtime_2weeks || 0;

        if (existingGame) {
            // Game is already in backlog, update playtime
            const updatePayload: { hours_played: number; playtime_2weeks: number; updated_at: string; last_played?: string; img_icon_url?: string; img_logo_url?: string; } = {
                hours_played: hoursPlayed,
                playtime_2weeks: playtime2Weeks,
                updated_at: new Date().toISOString(),
                img_icon_url: game.img_icon_url,
                img_logo_url: game.img_logo_url,
            };

            if (playtime2Weeks > 0) {
                updatePayload.last_played = new Date().toISOString();
            }

            if (existingGame.hours_played !== hoursPlayed || existingGame.playtime_2weeks !== playtime2Weeks) {
                await supabase.from('user_games').update(updatePayload).eq('id', existingGame.id);
                console.log(`Updated playtime for ${game.name} to ${hoursPlayed} hours (${playtime2Weeks} mins in last 2 weeks).`);
            }
        } else {
            // Game is not in backlog, add it
            try {
                // First, find the master game document to link to
                const { data: masterGameResponse, error } = await supabase.from('games').select('id').eq('steam_appid', game.appid).single();
                if (masterGameResponse) {
                    const masterGameId = masterGameResponse.id;
                    await supabase.from('user_games').insert({
                        user_id: user.id,
                        game_id: masterGameId,
                        steam_appid: game.appid,
                        status: 'want_to_play', // Assuming a default status
                        hours_played: hoursPlayed,
                        playtime_2weeks: playtime2Weeks,
                        added_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        last_played: playtime2Weeks > 0 ? new Date().toISOString() : undefined,
                        img_icon_url: game.img_icon_url,
                        img_logo_url: game.img_logo_url,
                    });
                     console.log(`Added new game to backlog: ${game.name}`);
                }
                if(error) {
                    console.error(`Error finding master game for ${game.name}:`, error);
                }
            } catch (error) {
                console.error(`Error adding new game ${game.name} to backlog:`, error);
            }
        }
        
        // 4. Sync Achievements & Stats for the game (can be done in parallel)
        const { data: gameDocument, error } = await supabase.from('user_games').select('id').eq('user_id', user.id).eq('steam_appid', game.appid).single();
        if(gameDocument) {
            await Promise.all([
                syncGameAchievements(user.steam_id, user.id, game.appid, config.steamApiKey),
                syncGameStats(user.steam_id, user.id, gameDocument.id, game.appid, config.steamApiKey)
            ]);
        }
        if(error) {
            console.error(`Error finding game document for ${game.name}:`, error);
        }
    }
    
    // 5. Update the user's `last_steam_sync` timestamp
    await supabase.from('users').update({ last_steam_sync: new Date().toISOString() }).eq('id', user.id);

    console.log(`Sync for user ${user.display_name} completed.`);
}