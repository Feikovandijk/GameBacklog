import type { ExecutionContext } from '@cloudflare/workers-types';

export default {
	async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Browsers often request /favicon.ico. We should ignore these requests.
		if (url.pathname === '/favicon.ico') {
			return new Response(null, { status: 204 });
		}

		const params = url.searchParams;

		// We need to validate the OpenID response from Steam
		const validationParams = new URLSearchParams(params.toString());
		validationParams.set('openid.mode', 'check_authentication');

		const validationResponse = await fetch('https://steamcommunity.com/openid/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: validationParams.toString(),
		});

		const validationText = await validationResponse.text();
    
		if (!validationText.includes('is_valid:true')) {
			return new Response('Failed to validate Steam login.', { status: 401 });
		}

		// If valid, extract the Steam ID from the original callback params
		const claimedId = params.get('openid.claimed_id');
		if (!claimedId) {
			return new Response('Could not find Steam ID in callback.', { status: 400 });
		}

		const steamIdMatch = claimedId.match(/https:\/\/steamcommunity\.com\/openid\/id\/(\d+)/);
		if (!steamIdMatch || !steamIdMatch[1]) {
			return new Response('Could not parse Steam ID from claimed_id.', { status: 400 });
		}

		const steamId = steamIdMatch[1];
    
    // For development, we redirect to localhost.
    // For production, you would replace this with your actual app's URL.
    const appUrl = 'http://localhost:5173';

		// Redirect back to the main app with the Steam ID
		const redirectUrl = new URL(appUrl);
		redirectUrl.searchParams.set('steamId', steamId);
		redirectUrl.searchParams.set('login_success', 'true');

		return Response.redirect(redirectUrl.toString(), 302);
	},
}; 