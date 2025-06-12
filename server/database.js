const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_FILE = path.join(__dirname, 'steam-data.sqlite');

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) return console.error('Error opening database', err.message);

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      steam_id TEXT PRIMARY KEY,
      last_updated INTEGER,
      sync_status TEXT,
      sync_error_message TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_games (
      user_steam_id TEXT NOT NULL,
      appid INTEGER NOT NULL,
      name TEXT,
      playtime_forever INTEGER,
      img_icon_url TEXT,
      unlocked_achievements INTEGER DEFAULT 0,
      total_achievements INTEGER DEFAULT 0,
      PRIMARY KEY (user_steam_id, appid),
      FOREIGN KEY (user_steam_id) REFERENCES users(steam_id)
    )`);
  });
});

const CACHE_DURATION_HOURS = 24;
const CACHE_DURATION_MS = CACHE_DURATION_HOURS * 60 * 60 * 1000;

const getCacheStatus = (steamId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT last_updated, sync_status, sync_error_message FROM users WHERE steam_id = ?', [steamId], (err, row) => {
      if (err) return reject(err);
      resolve({
        lastUpdated: row ? row.last_updated : null,
        isRefreshAllowed: !row || (Date.now() - row.last_updated > CACHE_DURATION_MS),
        syncStatus: row ? row.sync_status : null,
        syncErrorMessage: row ? row.sync_error_message : null,
      });
    });
  });
};

const getCachedAchievements = async (steamId) => {
  const status = await getCacheStatus(steamId);
  if (status.isRefreshAllowed) return null;

  return new Promise((resolve, reject) => {
    db.all(`
      SELECT appid, name, playtime_forever, img_icon_url, unlocked_achievements, total_achievements 
      FROM user_games 
      WHERE user_steam_id = ? AND total_achievements > 0
    `, [steamId], (err, rows) => {
      if (err) return reject(err);
      const formattedData = rows.map(row => ({
        appid: row.appid,
        name: row.name,
        playtime_forever: row.playtime_forever,
        img_icon_url: row.img_icon_url,
        achievements: {
          unlocked: row.unlocked_achievements,
          total: row.total_achievements,
        }
      }));
      resolve(formattedData);
    });
  });
};

const setCachedAchievements = (steamId, gamesWithAchievements) => {
  const now = Date.now();
  
  db.serialize(() => {
    const userStmt = db.prepare('INSERT OR REPLACE INTO users (steam_id, last_updated, sync_status) VALUES (?, ?, ?)');
    userStmt.run(steamId, now, 'success');
    userStmt.finalize();

    const gameStmt = db.prepare(`
      INSERT OR REPLACE INTO user_games 
      (user_steam_id, appid, name, playtime_forever, img_icon_url, unlocked_achievements, total_achievements) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const game of gamesWithAchievements) {
      gameStmt.run(
        steamId,
        game.appid,
        game.name,
        game.playtime_forever,
        game.img_icon_url,
        game.achievements.unlocked,
        game.achievements.total
      );
    }
    gameStmt.finalize();
  });
};

const setSyncStatus = (steamId, status, message = null) => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET sync_status = ?, sync_error_message = ? WHERE steam_id = ?',
      [status, message, steamId],
      function (err) {
        if (err) return reject(err);
        // If no rows were updated, it means the user doesn't exist yet.
        // This can happen if the sync fails before the user row is created.
        if (this.changes === 0) {
          const now = Date.now();
          db.run(
            'INSERT INTO users (steam_id, last_updated, sync_status, sync_error_message) VALUES (?, ?, ?, ?)',
            [steamId, now, status, message],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        } else {
          resolve();
        }
      }
    );
  });
};

module.exports = {
  getCachedAchievements,
  setCachedAchievements,
  getCacheStatus,
  setSyncStatus,
}; 