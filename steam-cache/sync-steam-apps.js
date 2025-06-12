const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const DB_FILE = 'steam-apps.sqlite';
const STEAM_APP_LIST_URL = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';

async function fetchSteamApps() {
  const res = await fetch(STEAM_APP_LIST_URL);
  if (!res.ok) throw new Error('Failed to fetch Steam app list');
  const data = await res.json();
  return data.applist.apps || [];
}

function upsertAppsToDb(apps) {
  const db = new sqlite3.Database(DB_FILE);
  db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS apps (appid INTEGER PRIMARY KEY, name TEXT)');
    const stmt = db.prepare('INSERT OR REPLACE INTO apps (appid, name) VALUES (?, ?)');
    for (const app of apps) {
      stmt.run(app.appid, app.name);
    }
    stmt.finalize();
  });
  db.close();
}

(async () => {
  try {
    console.log('Fetching Steam app list...');
    const apps = await fetchSteamApps();
    console.log(`Fetched ${apps.length} apps. Updating database...`);
    upsertAppsToDb(apps);
    console.log('Database updated.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})(); 