/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm install -D @cloudflare/workers-types` to add types for R2, KV, D1, etc.
 * - Run `wrangler deploy` to deploy this worker.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request: Request): Promise<Response> {
		const { searchParams } = new URL(request.url);
		const steamId = searchParams.get('steamId');

		if (!steamId) {
			return new Response(JSON.stringify({ error: 'Steam ID is required' }), {
				status: 400,
				headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        },
			});
		}

		const targetUrl = `https://store.steampowered.com/wishlist/profiles/${steamId}/wishlistdata/`;

		try {
			// Re-create the request to Steam to avoid passing through Cloudflare-specific headers
			const steamRequest = new Request(targetUrl, {
				headers: {
					'User-Agent': 'Cloudflare-Worker-Game-Backlog-Importer/1.0',
				},
			});

			const response = await fetch(steamRequest);
			const responseText = await response.text();

			if (!response.ok) {
				throw new Error(`Steam API responded with status: ${response.status}. Body: ${responseText}`);
			}
			
			let data;
			try {
				data = JSON.parse(responseText);
			} catch (e) {
				throw new Error(`Failed to parse JSON from Steam's response. Response snippet: ${responseText.substring(0, 200)}...`);
			}

			return new Response(JSON.stringify(data), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, OPTIONS',
				},
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
			return new Response(JSON.stringify({ error: errorMessage }), {
				status: 500,
				headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
			});
		}
	},
}; 