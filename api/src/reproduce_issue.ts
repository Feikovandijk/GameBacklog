async function fetchWithRetry(
  url: string,
  retries: number = 3,
  backoff: number = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Fetching ${url}...`);
      const response = await fetch(url);
      console.log(`Status: ${response.status}`);
      if (response.ok) {
        return response;
      }
      if (response.status >= 400 && response.status < 500) {
        console.warn(
          `Request to ${url} failed with status ${response.status}. Not retrying.`
        );
        return response;
      }
      console.warn(
        `Request to ${url} failed with status ${response.status}. Retrying in ${backoff / 1000}s...`
      );
    } catch (error: any) {
      console.warn(
        `Request to ${url} failed with error: ${error.message}. Retrying in ${backoff / 1000}s...`
      );
    }
    await new Promise(resolve => setTimeout(resolve, backoff));
    backoff *= 2;
  }
  throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}

async function getPlayerCount(steamAppId: number): Promise<number | null> {
  const playersUrl = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${steamAppId}`;
  try {
    const playersResponse = await fetchWithRetry(playersUrl);
    if (playersResponse.ok) {
      const playersJson = await playersResponse.json();
      console.log('Response JSON:', JSON.stringify(playersJson, null, 2));
      if (playersJson.response?.result === 1) {
        return playersJson.response.player_count;
      }
    } else {
      const text = await playersResponse.text();
      console.log('Error body:', text);
    }
    return null;
  } catch (error) {
    console.error(
      `Error fetching player count for appid ${steamAppId}:`,
      error
    );
    return null;
  }
}

async function run() {
  console.log('Testing with App ID 440 (Team Fortress 2)...');
  const count = await getPlayerCount(440);
  console.log('Player count:', count);

  console.log('Testing with App ID 99999999 (Invalid)...');
  const countInvalid = await getPlayerCount(99999999);
  console.log('Player count (invalid):', countInvalid);
}

run();
