import type { ExecutionContext } from '@cloudflare/workers-types';

/**
 * This interface defines the expected structure of the environment variables.
 * Cloudflare automatically binds the `STEAM_API_KEY` secret to this `env` object.
 */
interface Env {
	STEAM_API_KEY: string;
}

/**
 * The main entry point for the Cloudflare Worker.
 */
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Browsers often request /favicon.ico. We should ignore these requests.
		if (url.pathname === '/favicon.ico') {
			return new Response(null, { status: 204 });
		}

		const params = url.searchParams;

		// Step 1: Validate the OpenID response from Steam.
		const validationResponseText = await validateSteamLogin(params);
		if (!validationResponseText.includes('is_valid:true')) {
			return new Response('Failed to validate Steam login.', { status: 401 });
		}

		// Step 2: Extract the user's Steam ID.
		const steamId = getSteamId(params);
		if (!steamId) {
			return new Response('Could not find or parse Steam ID.', { status: 400 });
		}

		// Step 3: Fetch the user's profile information using the Steam API.
		const userInfo = await getSteamUserInfo(steamId, env.STEAM_API_KEY);
		if (!userInfo) {
			return new Response('Could not retrieve user information from Steam.', { status: 500 });
		}
		
		// Step 4: Construct the final redirect URL and send the user back to the frontend app.
		const clientReturnTo = params.get('return_to');
		if (!clientReturnTo) {
			return new Response('Missing return_to parameter.', { status: 400 });
		}

		const redirectUrl = new URL(clientReturnTo);
		redirectUrl.searchParams.set('steamId', steamId);
		redirectUrl.searchParams.set('displayName', userInfo.personaname);
		redirectUrl.searchParams.set('avatarUrl', userInfo.avatarfull);

		return Response.redirect(redirectUrl.toString(), 302);
	},
};

/**
 * Validates the OpenID assertion with Steam's servers.
 * @param params The URL search parameters from the initial request.
 * @returns The text response from Steam's validation endpoint.
 */
async function validateSteamLogin(params: URLSearchParams): Promise<string> {
	const validationParams = new URLSearchParams(params.toString());
	validationParams.set('openid.mode', 'check_authentication');

	const response = await fetch('https://steamcommunity.com/openid/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: validationParams.toString(),
	});

	return response.text();
}

/**
 * Extracts the Steam ID from the `openid.claimed_id` parameter.
 * @param params The URL search parameters.
 * @returns The user's 64-bit Steam ID or null if not found.
 */
function getSteamId(params: URLSearchParams): string | null {
	const claimedId = params.get('openid.claimed_id');
	if (!claimedId) {
		return null;
	}
	const match = claimedId.match(/https:\/\/steamcommunity\.com\/openid\/id\/(\d+)/);
	return match ? match[1] : null;
}

/**
 * Fetches user profile data from the Steam Web API.
 * @param steamId The user's 64-bit Steam ID.
 * @param apiKey Your secret Steam Web API key.
 * @returns The player's profile data or null on failure.
 */
async function getSteamUserInfo(steamId: string, apiKey: string): Promise<any | null> {
	const apiUrl = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
	const response = await fetch(apiUrl);

	if (!response.ok) {
		return null;
	}

	const data = await response.json();
	if (data.response?.players?.length > 0) {
		return data.response.players[0];
	}

	return null;
} 