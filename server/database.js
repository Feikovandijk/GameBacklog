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

    db.run(`CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      user_steam_id TEXT NOT NULL,
      title TEXT NOT NULL,
      platform TEXT,
      status TEXT,
      ownership TEXT,
      dateAdded TEXT,
      dateModified TEXT,
      rating INTEGER,
      playtime INTEGER,
      genre TEXT,
      priority BOOLEAN,
      notes TEXT,
      FOREIGN KEY (user_steam_id) REFERENCES users(steam_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      imageUrl TEXT,
      releaseDate TEXT,
      developer TEXT,
      publisher TEXT,
      genre TEXT
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
        isRefreshAllowed: !row || row.sync_status !== 'success' || (Date.now() - row.last_updated > CACHE_DURATION_MS),
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
    const now = Date.now();
    db.serialize(() => {
      // Use INSERT OR IGNORE to create a user if they don't exist, without erroring if they do.
      // We set a placeholder `last_updated` which will be overwritten by the UPDATE.
      db.run('INSERT OR IGNORE INTO users (steam_id, last_updated) VALUES (?, ?)',
        [steamId, now],
        (err) => {
          if (err) return reject(err);
        }
      );

      // Now, update the user with the correct status and a fresh timestamp.
      // This works for both existing users and the one we may have just created.
      db.run(
        'UPDATE users SET sync_status = ?, sync_error_message = ?, last_updated = ? WHERE steam_id = ?',
        [status, message, now, steamId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  });
};

const getWishlist = (steamId) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM wishlist_items WHERE user_steam_id = ?', [steamId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

const setWishlist = (steamId, games) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Start a transaction
      db.run('BEGIN TRANSACTION');

      // Delete old wishlist for this user
      db.run('DELETE FROM wishlist_items WHERE user_steam_id = ?', [steamId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          return reject(err);
        }
      });

      // Insert new wishlist items
      const stmt = db.prepare(`
        INSERT INTO wishlist_items 
        (id, user_steam_id, title, platform, status, ownership, dateAdded, dateModified, rating, playtime, genre, priority, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let errorOccurred = false;
      for (const game of games) {
        stmt.run(
          game.id, steamId, game.title, game.platform, game.status, game.ownership,
          game.dateAdded, game.dateModified, game.rating, game.playtime, game.genre,
          game.priority, game.notes,
          (err) => {
            if (err) {
              console.error('Failed to insert wishlist item:', err);
              errorOccurred = true;
            }
          }
        );
      }
      stmt.finalize((err) => {
        if (err || errorOccurred) {
           db.run('ROLLBACK');
           return reject(err || new Error('Error during wishlist insertion.'));
        }
        // Commit transaction
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          resolve();
        });
      });
    });
  });
};

const getGameDetails = (appId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM games WHERE id = ?', [appId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

const setGameDetails = (gameData) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO games (id, title, description, imageUrl, releaseDate, developer, publisher, genre)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        description=excluded.description,
        imageUrl=excluded.imageUrl,
        releaseDate=excluded.releaseDate,
        developer=excluded.developer,
        publisher=excluded.publisher,
        genre=excluded.genre;
    `);

    stmt.run(
      gameData.id,
      gameData.title,
      gameData.description,
      gameData.imageUrl,
      gameData.releaseDate,
      gameData.developer,
      gameData.publisher,
      gameData.genre,
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
    stmt.finalize();
  });
};

module.exports = {
  getCachedAchievements,
  setCachedAchievements,
  getCacheStatus,
  setSyncStatus,
  getWishlist,
  setWishlist,
  getGameDetails,
  setGameDetails,
}; 