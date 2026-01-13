import SteamUser from 'steam-user';
import config from '../config';
import { supabase } from '../supabase/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const steamUser = new SteamUser();
steamUser.setOptions({
  enablePicsCache: true,
  changelistUpdateInterval: 0,
});

const STEAM_API_KEY = config.steamApiKey;
if (!STEAM_API_KEY) {
  throw new Error(
    `Steam API key is missing. Ensure STEAM_API_KEY is defined in your .env file.`
  );
}

const STEAM_API_BASE_URL = 'https://store.steampowered.com/api/appdetails';
const REVIEW_API_BASE_URL = 'https://store.steampowered.com/appreviews';
const GAMES_PER_MINUTE_LIMIT = 40; // Stay under the 100k/day Steam API limit
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;
let rateLimitRetryCount = 0; // State for exponential backoff on 429s

import { GameDocument, WebApiData } from '../types/steam.types';

// --- Re-used Type Definitions & Functions from steam-pics-refresh-service ---

async function fetchWithRetry(
  url: string,
  retries: number = 3,
  backoff: number = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        rateLimitRetryCount = 0; // Reset on a successful request
        return response;
      }

      if (response.status === 429) {
        const backoffMinutes = 5 * Math.pow(2, rateLimitRetryCount);
        rateLimitRetryCount++;
        console.warn(
          `Rate limit hit (429). Pausing for ${backoffMinutes} minutes...`
        );
        await new Promise(resolve =>
          setTimeout(resolve, backoffMinutes * 60 * 1000)
        );
        i--; // This makes the loop retry the current attempt after the long pause
        continue;
      }

      if (response.status >= 400 && response.status < 500) {
        console.warn(
          `Request to ${url.replace(STEAM_API_KEY!, 'YOUR_STEAM_KEY')} failed with status ${response.status}. Not retrying.`
        );
        return response;
      }
      console.warn(
        `Request to ${url.replace(STEAM_API_KEY!, 'YOUR_STEAM_KEY')} failed with status ${response.status}. Retrying...`
      );
    } catch (error: any) {
      console.warn(
        `Request failed for ${url.replace(STEAM_API_KEY!, 'YOUR_STEAM_KEY')}: ${error.message}. Retrying...`
      );
    }
    await new Promise(resolve => setTimeout(resolve, backoff));
    backoff *= 2;
  }
  throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}

async function fetchGameDetailsFromWebAPI(
  steamAppId: number
): Promise<WebApiData | null> {
  const appDetailsUrl = `${STEAM_API_BASE_URL}?appids=${steamAppId}&key=${STEAM_API_KEY}`;
  const reviewUrl = `${REVIEW_API_BASE_URL}/${steamAppId}?json=1&purchase_type=all`;

  try {
    const [appDetailsResponse, reviewResponse] = await Promise.all([
      fetchWithRetry(appDetailsUrl),
      fetchWithRetry(reviewUrl),
    ]);

    if (!appDetailsResponse.ok) {
      return null;
    }
    const appDetailsJson = await appDetailsResponse.json();
    const appDetails = appDetailsJson[steamAppId];
    if (!appDetails?.success) {
      return null;
    }

    const gameData: WebApiData = appDetails.data;
    if (reviewResponse.ok) {
      const reviewJson = await reviewResponse.json();
      if (reviewJson.success) {
        gameData.review_summary = reviewJson.query_summary;
      }
    }
    return gameData;
  } catch (error) {
    console.error(`Error fetching from Web API for ${steamAppId}:`, error);
    return null;
  }
}

function formatPicsDataToGameDocument(
  appId: number,
  picsData: any
): Partial<GameDocument> {
  const common = picsData.appinfo?.common ?? {};
  const developers: string[] = [],
    publishers: string[] = [];
  if (common.associations) {
    Object.values(common.associations as Record<string, unknown>).forEach(
      (assoc: any) => {
        if (assoc.type === 'developer') {
          developers.push(String(assoc.name));
        } else if (assoc.type === 'publisher') {
          publishers.push(String(assoc.name));
        }
      }
    );
  }
  const oslist = common.oslist?.split(',') || [];
  let releaseDateForDb: string | null = null;
  const ts = common.steam_release_date;
  if (ts) {
    releaseDateForDb = new Date(parseInt(String(ts), 10) * 1000).toISOString();
  }

  const tags = common.store_tags
    ? Object.values(common.store_tags as Record<string, unknown>).map(String)
    : [];
  const categories = common.category
    ? Object.keys(common.category as Record<string, unknown>)
    : [];
  const has_steam_achievements = categories.includes('category_22');
  let headerImageUrl: string | null = null;
  if (common.header_image?.english) {
    headerImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/${common.header_image.english}`;
  }

  return {
    steam_appid: appId,
    name: common.name,
    last_updated: new Date().toISOString(),
    steam_app_type: common.type?.toLowerCase() ?? 'unknown',
    developers: developers.length > 0 ? developers : null,
    publishers: publishers.length > 0 ? publishers : null,
    release_date: releaseDateForDb,
    header_image: headerImageUrl,
    platforms_windows: oslist.includes('windows'),
    platforms_mac: oslist.includes('macos'),
    platforms_linux: oslist.includes('linux'),
    tags,
    categories,
    has_steam_achievements,
    controller_support: common.controller_support ?? null,
    metacritic_score: common.metacritic?.score ?? null,
    metacritic_url: common.metacritic?.url ?? null,
    is_early_access: common.releasestate === 'prerelease',
    positive_rating_percentage: common.review_percentage
      ? parseInt(String(common.review_percentage), 10)
      : null,
  };
}

function mergeApiData(
  picsData: Partial<GameDocument>,
  webData: WebApiData | null
): Partial<GameDocument> {
  const mergedData = { ...picsData };
  if (!webData) {
    return mergedData;
  }
  const reviews = webData.review_summary;
  const price = webData.price_overview;

  mergedData.short_description =
    webData.short_description ?? mergedData.short_description;
  mergedData.total_reviews = reviews?.total_reviews ?? null;
  mergedData.price_final = price?.final ?? null;
  mergedData.price_currency = price?.currency ?? null;
  mergedData.price_initial = price?.initial ?? null;
  mergedData.discount_percent = price?.discount_percent ?? null;
  mergedData.total_positive = reviews?.total_positive ?? null;
  mergedData.total_negative = reviews?.total_negative ?? null;
  mergedData.review_score_desc = reviews?.review_score_desc ?? null;
  mergedData.metacritic_score =
    webData.metacritic?.score ?? mergedData.metacritic_score;
  mergedData.metacritic_url =
    webData.metacritic?.url ?? mergedData.metacritic_url;
  mergedData.genres = webData.genres
    ? webData.genres.map(g => g.description)
    : null;

  // Add all new fields
  mergedData.detailed_description = webData.detailed_description ?? null;
  mergedData.about_the_game = webData.about_the_game ?? null;
  mergedData.website = webData.website ?? null;
  mergedData.screenshots = webData.screenshots
    ? webData.screenshots.map(s => s.path_full)
    : null;
  mergedData.movies = webData.movies
    ? webData.movies.map(m => m.mp4?.max).filter((url): url is string => !!url)
    : null;
  mergedData.is_free = webData.is_free ?? false;
  mergedData.pc_requirements = webData.pc_requirements ?? null;
  mergedData.mac_requirements = webData.mac_requirements ?? null;
  mergedData.linux_requirements = webData.linux_requirements ?? null;
  mergedData.supported_languages = webData.supported_languages ?? null;
  mergedData.dlc = webData.dlc ?? null;
  mergedData.required_age = webData.required_age ?? null;

  if (
    reviews?.total_reviews &&
    reviews.total_reviews > 0 &&
    typeof reviews.total_positive === 'number'
  ) {
    mergedData.positive_rating_percentage = Math.round(
      (reviews.total_positive / reviews.total_reviews) * 100
    );
  }
  return mergedData;
}

// --- Main Backfill Logic ---

export async function enrichAllGames() {
  console.log(`Starting one-time enrichment...`);
  let totalUpdatedCount = 0;
  let totalProcessedCount = 0;

  try {
    console.log(`Logging into Steam anonymously...`);
    steamUser.logOn({ anonymous: true });

    await new Promise<void>((resolve, reject) => {
      steamUser.on('loggedOn', () => {
        console.log(`Logged into Steam successfully.`);
        resolve();
      });
      steamUser.on('error', err => {
        console.error(`Steam login error:`, err);
        reject(err);
      });
    });

    const BATCH_SIZE = 100;
    let lastId: any = null;
    let hasMore = true;

    while (hasMore) {
      console.log(
        `\nFetching batch of games... (processed: ${totalProcessedCount})`
      );

      let query = supabase
        .from('games')
        .select('*')
        .is('about_the_game', null)
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);

      if (lastId) {
        query = query.gt('id', lastId);
      }

      const { data: gameBatch, error: batchError } = await query;

      if (batchError) {
        console.error('Error fetching games batch:', batchError);
        break;
      }

      if (!gameBatch || gameBatch.length === 0) {
        hasMore = false;
        continue;
      }

      // Update cursor for next batch
      lastId = gameBatch[gameBatch.length - 1].id;

      for (let index = 0; index < gameBatch.length; index++) {
        const game = gameBatch[index];
        if (!game.steam_appid) {
          console.warn(
            `Game document ${game.id} has no steam_appid, skipping.`
          );
          continue;
        }

        console.log(
          `(${totalProcessedCount + 1}) Processing game: ${game.name} (ID: ${game.steam_appid})`
        );

        const picsPromise = new Promise(resolve => {
          void steamUser.getProductInfo(
            [Number(game.steam_appid)],
            [],
            false,
            (err, apps) => resolve(apps?.[game.steam_appid] ?? null)
          );
        });
        const webApiPromise = fetchGameDetailsFromWebAPI(
          Number(game.steam_appid)
        );

        const [picsData, webApiData] = await Promise.all([
          picsPromise,
          webApiPromise,
        ]);

        if (picsData) {
          const formattedPicsData = formatPicsDataToGameDocument(
            Number(game.steam_appid),
            picsData
          );
          const finalGameData = mergeApiData(formattedPicsData, webApiData);

          const { error: updateError } = await supabase
            .from('games')
            .update(finalGameData)
            .eq('id', game.id);

          if (updateError) {
            console.error(`Error updating game ${game.name}:`, updateError);
          } else {
            totalUpdatedCount++;
          }
        } else {
          console.warn(
            `Could not get PICS data for ${game.name}, skipping update.`
          );
        }

        totalProcessedCount++;

        if (index < gameBatch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }
    }

    console.log(
      `\nEnrichment complete! Processed: ${totalProcessedCount}, Updated: ${totalUpdatedCount}`
    );
    steamUser.logOff();
  } catch (e) {
    const error = e as Error;
    console.error(`\nError during enrichment service:`, error.message);
    console.error(error.stack);
    steamUser.logOff();
    // Only exit if running standalone
    if (require.main === module) {
      process.exit(1);
    }
  }
}

// Execute the enrichment process if running directly
if (require.main === module) {
  void enrichAllGames();
}
