import axios from 'axios';
import config from '../config';
import { User } from '../auth/steam-auth';
import { driver as neo4jDriver } from '../neo4j/client';

import { OwnedGame, PlayerAchievement, GameStats } from '../types/steam.types';

const STEAM_API_BASE = 'https://api.steampowered.com';

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
        return [];
    }
}

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
        return [];
    }
}

async function getUserBacklog(userId: string): Promise<Map<number, any>> {
    const session = neo4jDriver.session();
    const backlog = new Map<number, any>();
    try {
        const result = await session.run(`
            MATCH (u:User {id: $userId})-[r:OWNS]->(g:Game)
            RETURN g.steam_appid AS steam_appid, r AS relationship
        `, { userId });

        result.records.forEach((record: any) => {
            backlog.set(record.get('steam_appid').low, record.get('relationship').properties);
        });
    } finally {
        await session.close();
    }
    return backlog;
}

async function syncGameStats(steamId: string, userId: string, appId: number, apiKey: string) {
    const stats = await getUserStatsForGame(steamId, appId, apiKey);
    if (stats.length > 0) {
        const statsJson = JSON.stringify(stats);
        const session = neo4jDriver.session();
        try {
            await session.run(`
                MATCH (u:User {id: $userId})-[r:OWNS]->(g:Game {steam_appid: $appId})
                SET r.stats_json = $statsJson
            `, { userId, appId, statsJson });
        } finally {
            await session.close();
        }
    }
}

async function syncGameAchievements(steamId: string, userId: string, appId: number, apiKey: string) {
    const achievements = await getPlayerAchievements(steamId, appId, apiKey);
    if (achievements.length === 0) return;

    const session = neo4jDriver.session();
    try {
        const query = `
            UNWIND $achievements AS achievement
            MATCH (u:User {id: $userId})
            MATCH (a:Achievement {api_name: achievement.apiname})
            MERGE (u)-[r:UNLOCKED]->(a)
            SET r.is_unlocked = (achievement.achieved = 1),
                r.unlock_time = CASE WHEN achievement.achieved = 1 THEN datetime({epochSeconds: achievement.unlocktime}) ELSE null END
        `;
        await session.run(query, { userId, achievements });
    } finally {
        await session.close();
    }
}

export async function syncUserWithSteam(user: any) {
    console.log(`Starting Steam sync for user: ${user.display_name} (${user.steam_id})`);
    
    if (!config.steamApiKey) {
        console.error("Steam API key is not configured. Aborting sync.");
        return;
    }

    const ownedGames = await getOwnedGames(user.steam_id, config.steamApiKey);
    console.log(`Found ${ownedGames.length} owned games for user ${user.steam_id}.`);
    if (ownedGames.length === 0) return;

    const userBacklog = await getUserBacklog(user.id);
    console.log(`User has ${userBacklog.size} games in their backlog.`);

    const session = neo4jDriver.session();
    try {
        for (const game of ownedGames) {
            const existingGame = userBacklog.get(game.appid);
            const hoursPlayed = Math.round((game.playtime_forever / 60) * 100) / 100;
            const playtime2Weeks = game.playtime_2weeks || 0;

            if (existingGame) {
                const query = `
                    MATCH (u:User {id: $userId})-[r:OWNS]->(g:Game {steam_appid: $appId})
                    SET r.hours_played = $hoursPlayed,
                        r.playtime_2weeks = $playtime2Weeks,
                        r.updated_at = timestamp(),
                        r.img_icon_url = $img_icon_url,
                        r.img_logo_url = $img_logo_url
                `;
                await session.run(query, {
                    userId: user.id,
                    appId: game.appid,
                    hoursPlayed,
                    playtime2Weeks,
                    img_icon_url: game.img_icon_url,
                    img_logo_url: game.img_logo_url,
                });
            } else {
                const query = `
                    MATCH (u:User {id: $userId})
                    MATCH (g:Game {steam_appid: $appId})
                    MERGE (u)-[r:OWNS]->(g)
                    ON CREATE SET
                        r.status = 'want_to_play',
                        r.hours_played = $hoursPlayed,
                        r.playtime_2weeks = $playtime2Weeks,
                        r.added_at = timestamp(),
                        r.updated_at = timestamp(),
                        r.last_played = CASE WHEN $playtime2Weeks > 0 THEN timestamp() ELSE null END,
                        r.img_icon_url = $img_icon_url,
                        r.img_logo_url = $img_logo_url
                `;
                await session.run(query, {
                    userId: user.id,
                    appId: game.appid,
                    hoursPlayed,
                    playtime2Weeks,
                    img_icon_url: game.img_icon_url,
                    img_logo_url: game.img_logo_url,
                });
            }
            
            await Promise.all([
                syncGameAchievements(user.steam_id, user.id, game.appid, config.steamApiKey),
                syncGameStats(user.steam_id, user.id, game.appid, config.steamApiKey)
            ]);
        }
        
        await session.run(`
            MATCH (u:User {id: $userId})
            SET u.last_steam_sync = timestamp()
        `, { userId: user.id });

    } finally {
        await session.close();
    }

    console.log(`Sync for user ${user.display_name} completed.`);
}
