import type { ExecutionContext } from '@cloudflare/workers-types';

export interface Env {
  STEAM_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '',
    };
    
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      const url = new URL(request.url);
      const steamId = url.searchParams.get('steamId');
      const apiKey = env.STEAM_API_KEY;

      if (!steamId) {
        return new Response('steamId query parameter is required', { status: 400, headers: corsHeaders });
      }
      if (!apiKey) {
        return new Response('STEAM_API_KEY secret is not set in the worker environment.', { status: 500, headers: corsHeaders });
      }

      // Step 1: Fetch the user's wishlist to get a list of app IDs.
      const wishlistUrl = `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?key=${apiKey}&steamid=${steamId}`;
      const wishlistResponse = await fetch(wishlistUrl);

      if (!wishlistResponse.ok) {
        return new Response(`Failed to fetch wishlist from Steam API. Status: ${wishlistResponse.status}`, { status: wishlistResponse.status, headers: corsHeaders });
      }
      
      const wishlistJson = await wishlistResponse.json() as { response?: { items?: { appid: number }[] } };
      const wishlistAppIds = new Set(wishlistJson.response?.items?.map(item => item.appid) || []);

      if (wishlistAppIds.size === 0) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      // Step 2: Fetch the master list of all Steam apps. This is a large request.
      const appListUrl = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';
      const appListResponse = await fetch(appListUrl);

      if (!appListResponse.ok) {
        return new Response('Failed to fetch master app list from Steam.', { status: appListResponse.status, headers: corsHeaders });
      }

      const appListJson = await appListResponse.json() as { applist?: { apps?: { appid: number, name: string }[] } };
      const allSteamApps = appListJson.applist?.apps || [];
      
      // Step 3: Filter the master list to find games on the wishlist and format the response.
      const games = allSteamApps
        .filter(app => wishlistAppIds.has(app.appid))
        .map(app => ({
          id: String(app.appid),
          title: app.name,
          genre: '', // Genre data is not available from this endpoint
          notes: '',   // Description data is not available from this endpoint
        }));
      
      return new Response(JSON.stringify(games), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });

    } catch (error: unknown) {
      const err = error as Error;
      console.error('A critical error occurred in the wishlist worker:', err.message);
      console.error('Stack trace:', err.stack);
      return new Response('An internal error occurred within the worker. Please check the logs.', { status: 500, headers: corsHeaders });
    }
  },
}; 