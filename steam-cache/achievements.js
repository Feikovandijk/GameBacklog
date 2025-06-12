const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const DB_FILE = 'steam-apps.sqlite';
const ACHIEVEMENTS_URL = (appid, key) => `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${key}&appid=${appid}`;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fetch and cache Steam achievements for a given appid.
 * @param {number} appid - Steam App ID
 * @param {string} steamApiKey - Your Steam Web API key
 * @returns {Promise<object>} - Achievements schema
 */
async function getAchievements(appid, steamApiKey) {
  const db = new sqlite3.Database(DB_FILE);
  const now = Date.now();
  const freshCutoff = now - 7 * DAY_MS;

  // Ensure table exists
  await new Promise((resolve, reject) => {
    db.run('CREATE TABLE IF NOT EXISTS achievements (appid INTEGER PRIMARY KEY, data TEXT, last_updated INTEGER)', err => err ? reject(err) : resolve());
  });

  // Check cache
  const cached = await new Promise((resolve, reject) => {
    db.get('SELECT data, last_updated FROM achievements WHERE appid=?', [appid], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
  if (cached && cached.last_updated > freshCutoff) {
    db.close();
    return JSON.parse(cached.data);
  }

  // Rate limit: wait 1s
  await new Promise(res => setTimeout(res, 1000));

  // Fetch from Steam
  const url = ACHIEVEMENTS_URL(appid, steamApiKey);
  const res = await fetch(url);
  if (!res.ok) {
    db.close();
    throw new Error(`Failed to fetch achievements for appid ${appid}`);
  }
  const data = await res.json();

  // Store in DB
  await new Promise((resolve, reject) => {
    db.run('INSERT OR REPLACE INTO achievements (appid, data, last_updated) VALUES (?, ?, ?)', [appid, JSON.stringify(data), now], err => err ? reject(err) : resolve());
  });
  db.close();
  return data;
}

module.exports = { getAchievements }; 