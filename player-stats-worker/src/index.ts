export interface Env {
	STEAM_API_KEY: string;
}

const getCorsHeaders = (request: Request) => ({
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
	'Access-Control-Max-Age': '86400',
	'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '',
});

async function handleGamesRequest(apiKey: string, steamId: string) {
	const url = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_appinfo=1`;
	const response = await fetch(url);
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to fetch owned games from Steam. Status: ${response.status} ${response.statusText}, Body: ${errorText}`);
	}
	return response.json();
}

async function handleAchievementsRequest(apiKey: string, steamId: string, appid: string) {
	const url = `http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appid}&key=${apiKey}&steamid=${steamId}`;
	const response = await fetch(url);
	if (!response.ok) {
		// Return empty achievements for games where this call fails (e.g., no stats)
		console.error(`Could not fetch achievements for appid ${appid}. Status: ${response.status} ${response.statusText}`);
		return { playerstats: { achievements: [] } };
	}
	return response.json();
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const corsHeaders = getCorsHeaders(request);

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			const url = new URL(request.url);
			const steamId = url.searchParams.get('steamId');
			const type = url.searchParams.get('type');
			const apiKey = env.STEAM_API_KEY;

			if (!steamId) return new Response('steamId is required', { status: 400, headers: corsHeaders });
			if (!apiKey) return new Response('STEAM_API_KEY is not configured', { status: 500, headers: corsHeaders });

			let data;
			switch (type) {
				case 'games':
					data = await handleGamesRequest(apiKey, steamId);
					break;
				case 'achievements':
					const appid = url.searchParams.get('appid');
					if (!appid) return new Response('appid is required for type=achievements', { status: 400, headers: corsHeaders });
					data = await handleAchievementsRequest(apiKey, steamId, appid);
					break;
				default:
					return new Response('Invalid type parameter', { status: 400, headers: corsHeaders });
			}

			return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

		} catch (error: unknown) {
			const err = error as Error;
			console.error('Worker error:', err.message, err.stack);
			return new Response('An internal error occurred.', { status: 500, headers: corsHeaders });
		}
	},
}; 