import config from '../config';

async function checkSteamListSize() {
  if (!config.steamApiKey) {
    console.log('Steam API key is missing.');
    return;
  }

  const url = `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${config.steamApiKey}&include_games=true&include_dlc=false&include_software=false&include_videos=false&include_hardware=false`;

  console.log(`Fetching from: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const apps = data.response.apps;
    console.log(`Total apps returned: ${apps.length}`);

    if (data.response.last_appid) {
      console.log(`Response contains last_appid: ${data.response.last_appid}`);
    }

    if (apps.length === 10000) {
      console.log(
        'WARNING: Exactly 10,000 apps returned. Pagination is likely required.'
      );
    }
  } catch (error) {
    console.log('Failed to fetch Steam games list:', error);
  }
}

void checkSteamListSize();
