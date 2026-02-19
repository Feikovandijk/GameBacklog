import { supabase } from '../supabase/client';
import {
  fetchGameDetailsFromSteam,
  updateGameInSupabase,
} from './steam-refresh-service';

export interface TopSellerGame {
  steam_appid: number;
  name: string;
  header_image: string;
  price_final: number;
  price_currency: string;
  developers: string[];
  genres: string[];
  rank: number;
}

/**
 * Fetches the current top selling games from Steam.
 * Note: Steam doesn't have a direct "Top Sellers" JSON API that returns 50+ games easily without a key or store scraping.
 * We'll use a combination of known endpoints and fallback to trending if needed.
 * For this implementation, we'll use the Steam Charts service which is public.
 */
export async function getSteamTopSellers(): Promise<TopSellerGame[]> {
  console.log('Fetching Steam Top Sellers...');

  try {
    // This endpoint returns the top games by concurrent players which is a good proxy for "trending/top"
    // For actual "top sellers", the store page is usually scraped or we use the ISteamChartsService
    const url = `https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch top sellers: ${response.statusText}`);
    }

    const data: any = await response.json();
    const ranks: any[] = data.response?.ranks || [];

    if (ranks.length === 0) {
      console.log('No top sellers found in response.');
      return [];
    }

    const topGames: TopSellerGame[] = [];
    const limit = 20;

    for (const rankItem of ranks.slice(0, limit)) {
      const appId = Number(rankItem.appid);

      // Try to find the game in our database first
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('steam_appid', appId)
        .single();

      if (game) {
        topGames.push({
          steam_appid: appId,
          name: game.name || 'Unknown Game',
          header_image:
            game.header_image ||
            `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
          price_final: game.price_final || 0,
          price_currency: game.price_currency || 'USD',
          developers: game.developers || [],
          genres: game.genres || [],
          rank: rankItem.rank || topGames.length + 1,
        });
      } else {
        // If not in DB, we could fetch details, but to keep it fast for this request,
        // we'll just provide a stub and let the background refresh worker handle it later.
        topGames.push({
          steam_appid: appId,
          name: `Game ${appId}`,
          header_image: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
          price_final: 0,
          price_currency: 'USD',
          developers: [],
          genres: [],
          rank: rankItem.rank || topGames.length + 1,
        });

        // Proactively fetch and update details in background (non-blocking)
        void (async () => {
          try {
            const steamData = await fetchGameDetailsFromSteam(appId);
            if (steamData) {
              const { data: newGame, error } = await supabase
                .from('games')
                .upsert(
                  {
                    steam_appid: appId,
                    name: steamData.name || `App ${appId}`,
                    steam_app_type: 'game',
                    last_updated: new Date().toISOString(),
                  },
                  { onConflict: 'steam_appid' }
                )
                .select()
                .single();

              if (newGame && !error) {
                await updateGameInSupabase(String(newGame.id), steamData);
              }
            }
          } catch {
            // Silently fail for background tasks to keep server logs clean
          }
        })();
      }
    }

    return topGames;
  } catch (error) {
    console.error('Error in getSteamTopSellers:', error);
    return [];
  }
}
