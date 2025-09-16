import SteamUser from 'steam-user';
import config from '../config';
import { driver as neo4jDriver } from '../neo4j/client';
import { GameDocument, WebApiData } from '../types/steam.types';

const steamUser = new SteamUser();
steamUser.setOptions({
    enablePicsCache: true, // Required for getProductInfo
    changelistUpdateInterval: 0 // We don't need automatic updates
});

const STEAM_API_KEY = config.steamApiKeys[config.worker.id] || config.steamApiKey;

if (!STEAM_API_KEY) {
    throw new Error(`[Worker ${config.worker.id}] Steam API key is missing. Ensure STEAM_API_KEY_${config.worker.id} or a fallback STEAM_API_KEY is defined in your .env file.`);
}

const STEAM_API_BASE_URL = "https://store.steampowered.com/api/appdetails";
const REVIEW_API_BASE_URL = "https://store.steampowered.com/appreviews";
const UPDATE_INTERVAL_DAYS = 7;
const GAMES_PER_MINUTE_LIMIT = 30; // Stay under the 100k/day Steam API limit
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;

async function fetchWithRetry(url: string, retries: number = 3, backoff: number = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return response;
            }
            if (response.status >= 400 && response.status < 500) {
                 console.warn(`Request to ${url} failed with status ${response.status}. Not retrying.`);
                 return response;
            }
             console.warn(`Request to ${url} failed with status ${response.status}. Retrying in ${backoff / 1000}s...`);
        } catch (error: any) {
            console.warn(`Request to ${url} failed with error: ${error.message}. Retrying in ${backoff / 1000}s...`);
        }
        await new Promise(resolve => setTimeout(resolve, backoff));
        backoff *= 2; // Exponential backoff
    }
    throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}

async function fetchGameDetailsFromSteam(steamAppId: number): Promise<WebApiData | null> {
  const appDetailsUrl = `${STEAM_API_BASE_URL}?appids=${steamAppId}&key=${STEAM_API_KEY}`;
  const reviewUrl = `${REVIEW_API_BASE_URL}/${steamAppId}?json=1&purchase_type=all`;

  try {
    const [appDetailsResponse, reviewResponse] = await Promise.all([
      fetchWithRetry(appDetailsUrl),
      fetchWithRetry(reviewUrl),
    ]);

    if (!appDetailsResponse.ok) {
      console.error(
        `Steam API request failed for appid ${steamAppId}: ${appDetailsResponse.status} ${appDetailsResponse.statusText}`
      );
      const errorBody = await appDetailsResponse.text();
      console.error(`Steam API Error Body: ${errorBody}`);
      return null;
    }
    
    const appDetailsData = await appDetailsResponse.json();
    const details = appDetailsData[steamAppId];

    if (!details || !details.success) {
        console.warn(`Steam indicated unsuccessful fetch for appid ${steamAppId}.`);
        return null;
    }

    const gameData: WebApiData = details.data;

    if (gameData.type && gameData.type !== 'game') {
        console.log(`AppID ${steamAppId} is a '${gameData.type}', not a game. Skipping full data processing.`);
        return null;
    }

    if (reviewResponse.ok) {
        const reviewJson = await reviewResponse.json();
        if (reviewJson.success) {
            gameData.review_summary = reviewJson.query_summary;
        }
    }

    return gameData;

  } catch (error) {
    console.error(`Error fetching game details for appid ${steamAppId} from Steam:`, error);
    return null;
  }
}

async function updateGameInNeo4j(steam_appid: number, steamData: WebApiData | null) {
    const session = neo4jDriver.session();
    try {
        if (steamData) {
            const isEarlyAccess = steamData.genres?.some(
                (genre) => genre.description === "Early Access"
            ) ?? false;

            let releaseDateForDb: string | undefined;
            const steamReleaseDate = steamData.release_date;

            if (steamReleaseDate && !steamReleaseDate.coming_soon && steamReleaseDate.date) {
                const parsedDate = new Date(steamReleaseDate.date);
                if (!isNaN(parsedDate.getTime())) {
                    releaseDateForDb = parsedDate.toISOString();
                }
            }

            const price = steamData.price_overview;
            const reviews = steamData.review_summary;
            const categories = steamData.categories?.map(c => c.description) ?? [];
            const hasSteamAchievements = categories.includes("Steam Achievements");
            const genres = steamData.genres ? steamData.genres.map(g => g.description) : [];

            const query = `
                MATCH (g:Game {steam_appid: $steam_appid})
                SET g += {
                    name: $name,
                    short_description: $short_description,
                    detailed_description: $detailed_description,
                    about_the_game: $about_the_game,
                    header_image: $header_image,
                    website: $website,
                    screenshots: $screenshots,
                    movies: $movies,
                    release_date: $release_date,
                    last_updated: timestamp(),
                    developers: $developers,
                    publishers: $publishers,
                    is_early_access: $is_early_access,
                    is_free: $is_free,
                    total_reviews: $total_reviews,
                    steam_app_type: 'game',
                    price_final: $price_final,
                    price_currency: $price_currency,
                    price_initial: $price_initial,
                    discount_percent: $discount_percent,
                    total_positive: $total_positive,
                    total_negative: $total_negative,
                    positive_rating_percentage: $positive_rating_percentage,
                    review_score_desc: $review_score_desc,
                    metacritic_score: $metacritic_score,
                    metacritic_url: $metacritic_url,
                    platforms_windows: $platforms_windows,
                    platforms_mac: $platforms_mac,
                    platforms_linux: $platforms_linux,
                    pc_requirements: $pc_requirements,
                    mac_requirements: $mac_requirements,
                    linux_requirements: $linux_requirements,
                    supported_languages: $supported_languages,
                    dlc: $dlc,
                    required_age: $required_age,
                    categories: $categories,
                    has_steam_achievements: $has_steam_achievements
                }
                WITH g
                UNWIND $genres AS genreName
                MERGE (gn:Genre {name: genreName})
                MERGE (g)-[:IN_GENRE]->(gn)
            `;

            await session.run(query, {
                steam_appid,
                name: steamData.name,
                short_description: steamData.short_description,
                detailed_description: steamData.detailed_description ?? null,
                about_the_game: steamData.about_the_game ?? null,
                header_image: steamData.header_image,
                website: steamData.website ?? null,
                screenshots: steamData.screenshots ? steamData.screenshots.map(s => s.path_full) : null,
                movies: steamData.movies ? steamData.movies.map(m => m.mp4.max) : null,
                release_date: releaseDateForDb ?? null,
                developers: steamData.developers,
                publishers: steamData.publishers,
                is_early_access: isEarlyAccess,
                is_free: steamData.is_free ?? false,
                total_reviews: reviews?.total_reviews ?? null,
                price_final: price?.final ?? null,
                price_currency: price?.currency ?? null,
                price_initial: price?.initial ?? null,
                discount_percent: price?.discount_percent ?? null,
                total_positive: reviews?.total_positive ?? null,
                total_negative: reviews?.total_negative ?? null,
                positive_rating_percentage: reviews?.total_reviews && reviews?.total_reviews > 0 ? Math.round((reviews.total_positive / reviews.total_reviews) * 100) : null,
                review_score_desc: reviews?.review_score_desc ?? null,
                genres,
                metacritic_score: steamData.metacritic?.score ?? null,
                metacritic_url: steamData.metacritic?.url ?? null,
                platforms_windows: steamData.platforms?.windows ?? null,
                platforms_mac: steamData.platforms?.mac ?? null,
                platforms_linux: steamData.platforms?.linux ?? null,
                pc_requirements: steamData.pc_requirements ?? null,
                mac_requirements: steamData.mac_requirements ?? null,
                linux_requirements: steamData.linux_requirements ?? null,
                supported_languages: steamData.supported_languages ?? null,
                dlc: steamData.dlc ?? null,
                required_age: steamData.required_age ?? null,
                categories: categories.length > 0 ? categories : null,
                has_steam_achievements: hasSteamAchievements,
            });

            if (hasSteamAchievements) {
              await syncGameAchievements(steam_appid);
            }

            return true;
        } else {
            await session.run(`
                MATCH (g:Game {steam_appid: $steam_appid})
                SET g.last_updated = timestamp(), g.steam_app_type = 'invalid'
            `, { steam_appid });
            return false;
        }
    } finally {
        await session.close();
    }
}

async function runRefreshService() {
  console.log("Local Steam refresh service started. It will run continuously until all games are updated.");

  try {
    const session = neo4jDriver.session();
    let staleGames: any[] = [];
    try {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - UPDATE_INTERVAL_DAYS);

        const result = await session.run(`
            MATCH (g:Game)
            WHERE g.last_updated IS NULL OR g.last_updated < datetime({epochSeconds: ${Math.floor(thresholdDate.getTime() / 1000)}})
            RETURN g
        `);
        staleGames = result.records.map(record => record.get('g').properties);
    } finally {
        await session.close();
    }

    if (staleGames.length === 0) {
        console.log("No stale games found. Exiting.");
        return;
    }
      
    console.log(`Found ${staleGames.length} games to refresh. Starting batch processing...`);

    for (const [index, game] of staleGames.entries()) {
        if (!game.steam_appid) {
          console.warn(`Game ${game.name} has no steam_appid, skipping.`);
          continue;
        }

        console.log(`Processing game: ${game.name} (Steam AppID: ${game.steam_appid})`);
        const steamData = await fetchGameDetailsFromSteam(game.steam_appid.low);

        await updateGameInNeo4j(game.steam_appid.low, steamData);

        if (index < staleGames.length - 1) {
          console.log(`Waiting for ${DELAY_MS / 1000} seconds before next Steam API call...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }
      
    console.log("Steam refresh completed.");

  } catch (e) {
    const error = e as Error;
    console.error("Error in Steam refresh service:", error.message);
    process.exit(1);
  }
}

interface Achievement {
    name: string; // This is the API name
    displayName: string;
    description: string;
    hidden: boolean;
    icon: string;
    icongray: string;
    percent?: number; // from the global stats endpoint
}

async function syncGameAchievements(steamAppId: number) {
    const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${steamAppId}&l=english`;
    const percentagesUrl = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${steamAppId}`;

    try {
        const [schemaResponse, percentagesResponse] = await Promise.all([
            fetchWithRetry(schemaUrl),
            fetchWithRetry(percentagesUrl)
        ]);

        if (!schemaResponse.ok) {
            console.warn(`Could not fetch achievement schema for appid ${steamAppId}. Status: ${schemaResponse.status}`);
            return;
        }

        const schemaData = await schemaResponse.json();
        const achievements: Achievement[] = schemaData.game?.availableGameStats?.achievements ?? [];

        if (achievements.length === 0) {
            console.log(`No achievements found for appid ${steamAppId}.`);
            return;
        }

        const percentagesData: any = {};
        if (percentagesResponse.ok) {
            const percentagesJson = await percentagesResponse.json();
            if (percentagesJson?.achievementpercentages?.achievements) {
                percentagesJson.achievementpercentages.achievements.forEach((ach: { name: string; percent: any }) => {
                    const percentValue = parseFloat(ach.percent);
                    if (!isNaN(percentValue)) {
                        percentagesData[ach.name] = percentValue;
                    }
                });
            }
        }

        const achievementsToCreate = achievements.map(ach => ({
            steam_appid: steamAppId,
            api_name: ach.name,
            display_name: ach.displayName,
            description: ach.description || null,
            icon: ach.icon || null,
            icon_gray: ach.icongray || null,
            hidden: !!ach.hidden,
            global_percentage: percentagesData[ach.name] ?? null,
        }));

        const session = neo4jDriver.session();
        try {
            const query = `
                UNWIND $achievements AS achievement
                MATCH (g:Game {steam_appid: achievement.steam_appid})
                MERGE (a:Achievement {api_name: achievement.api_name})
                SET a += {
                    display_name: achievement.display_name,
                    description: achievement.description,
                    icon: achievement.icon,
                    icon_gray: achievement.icon_gray,
                    hidden: achievement.hidden,
                    global_percentage: achievement.global_percentage
                }
                MERGE (g)-[:HAS_ACHIEVEMENT]->(a)
            `;
            await session.run(query, { achievements: achievementsToCreate });
        } finally {
            await session.close();
        }

        console.log(`Successfully synced ${achievementsToCreate.length} achievements for appid ${steamAppId}.`);

    } catch (error) {
        console.error(`Error syncing achievements for appid ${steamAppId}:`, error);
    }
}

if (require.main === module) {
    runRefreshService();
}

export { runRefreshService };