const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { getCachedAchievements, setCachedAchievements, getCacheStatus, setSyncStatus, getWishlist, setWishlist, getGameDetails, setGameDetails } = require('./database');

const app = express();
const port = 3001;
const WORKER_URL = 'https://game-backlog-player-stats-worker.feikovandijk.workers.dev';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper function to add a delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchAndCacheAchievements = async (steamId) => {
  console.log(`[Worker] Fetching fresh achievements for ${steamId}...`);
  await setSyncStatus(steamId, 'in_progress');

  const gamesResponse = await fetch(`${WORKER_URL}?steamId=${steamId}&type=games`);
  if (!gamesResponse.ok) {
    await setSyncStatus(steamId, 'failed', 'Failed to fetch game list from worker');
    throw new Error('Failed to fetch game list from worker');
  }
  const gamesData = await gamesResponse.json();
  const ownedGames = gamesData.response?.games || [];

  const gamesWithAchievements = [];
  try {
    for (const game of ownedGames) {
      const achievementsResponse = await fetch(`${WORKER_URL}?steamId=${steamId}&type=achievements&appid=${game.appid}`);
      
      if (achievementsResponse.status === 429) {
        console.error(`[Worker] Rate limited while fetching achievements for appid ${game.appid}.`);
        throw new Error('RATE_LIMITED');
      }

      if (!achievementsResponse.ok) {
        // A 400 error from the worker often means the game has no achievements.
        // We'll log other errors, but not 400s, to keep the console clean.
        if (achievementsResponse.status !== 400) {
          console.error(`[Worker] Error fetching achievements for appid ${game.appid}. Status: ${achievementsResponse.status}`);
        }
        continue;
      }

      const achievementsData = await achievementsResponse.json();
      
      const achievements = achievementsData.playerstats?.achievements || [];
      if (achievements.length > 0) {
        gamesWithAchievements.push({
          appid: game.appid,
          name: game.name,
          playtime_forever: game.playtime_forever,
          img_icon_url: game.img_icon_url,
          achievements: {
            unlocked: achievements.filter(a => a.achieved).length,
            total: achievements.length,
          }
        });
      }
      await sleep(200); // Increased sleep time to be safer
    }
    
    setCachedAchievements(steamId, gamesWithAchievements);
    console.log(`[Cache SAVE] Saved fresh achievements for ${steamId}.`);
    return gamesWithAchievements;
  } catch (error) {
    console.error('An error occurred during achievement fetching loop:', error.message);
    // Even if there was an error, save the partial data we gathered
    if (gamesWithAchievements.length > 0) {
      console.log(`[Cache SAVE] Saving partial data for ${steamId} after error.`);
      setCachedAchievements(steamId, gamesWithAchievements);
    }

    if (error.message === 'RATE_LIMITED') {
      await setSyncStatus(steamId, 'failed', 'Steam API rate limit exceeded. Please try again later.');
    }
    
    // Re-throw the original error to be handled by the route
    throw error;
  }
}

app.get('/api/wishlist/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const wishlist = await getWishlist(steamId);
    res.json(wishlist);
  } catch (error) {
    console.error('Failed to get wishlist:', error);
    res.status(500).json({ error: 'Failed to get wishlist.' });
  }
});

app.post('/api/wishlist/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const games = req.body;
    await setWishlist(steamId, games);
    res.status(200).json({ message: 'Wishlist saved successfully.' });
  } catch (error) {
    console.error('Failed to save wishlist:', error);
    res.status(500).json({ error: 'Failed to save wishlist.' });
  }
});

app.get('/api/game-details/:appId', async (req, res) => {
  const { appId } = req.params;
  const { steamId } = req.query; // steamId is needed to get user-specific playtime

  try {
    const cachedDetails = await getGameDetails(appId);
    if (cachedDetails) {
      console.log(`[Cache HIT] Serving game details for ${appId} from cache.`);
      // We still need to fetch user-specific playtime as it's not in the generic 'games' table
      const playerStats = await fetch(`${WORKER_URL}?steamId=${steamId}&type=games`).then(res => res.ok ? res.json() : null);
      const gameInfo = playerStats?.response?.games?.find(g => g.appid.toString() === appId);
      
      return res.json({
        ...cachedDetails,
        playtime: gameInfo?.playtime_forever || 0,
        playtime2Weeks: gameInfo?.playtime_2weeks || 0,
      });
    }

    console.log(`[Cache MISS] Fetching fresh game details for ${appId}...`);
    const steamDetailsRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
    if (!steamDetailsRes.ok) throw new Error('Failed to fetch from Steam API');

    const steamDetailsData = await steamDetailsRes.json();
    const details = steamDetailsData[appId]?.data;

    if (!steamDetailsData[appId]?.success || !details) {
      return res.status(404).json({ error: 'Game not found on Steam store.' });
    }
    
    // Also fetch the user's playtime for this game
    const playerStats = await fetch(`${WORKER_URL}?steamId=${steamId}&type=games`).then(res => res.ok ? res.json() : null);
    const gameInfo = playerStats?.response?.games?.find(g => g.appid.toString() === appId);

    const gameData = {
      id: appId,
      title: details.name,
      description: details.short_description,
      imageUrl: details.header_image,
      releaseDate: details.release_date?.date || null,
      developer: details.developers?.[0] || null,
      publisher: details.publishers?.[0] || null,
      genre: details.genres?.map((g) => g.description).join(', ') || null,
      // User-specific data that is not cached in the 'games' table
      playtime: gameInfo?.playtime_forever || 0,
      playtime2Weeks: gameInfo?.playtime_2weeks || 0,
    };
    
    // Cache the non-user-specific details
    await setGameDetails({
      id: gameData.id,
      title: gameData.title,
      description: gameData.description,
      imageUrl: gameData.imageUrl,
      releaseDate: gameData.releaseDate,
      developer: gameData.developer,
      publisher: gameData.publisher,
      genre: gameData.genre,
    });
    console.log(`[Cache SAVE] Saved fresh game details for ${appId}.`);
    
    res.json(gameData);

  } catch (error) {
    console.error(`Error fetching game details for ${appId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch game details.' });
  }
});

app.post('/api/game-details/bulk', async (req, res) => {
  const { appIds, steamId } = req.body;

  if (!appIds || !Array.isArray(appIds)) {
    return res.status(400).json({ error: 'appIds array is required.' });
  }

  try {
    const results = {};
    const appIdsToFetchFromSteam = [];

    // 1. Check cache first for all games
    for (const appId of appIds) {
      const cachedDetails = await getGameDetails(appId);
      if (cachedDetails) {
        results[appId] = cachedDetails;
      } else {
        appIdsToFetchFromSteam.push(appId);
      }
    }
    
    console.log(`[Bulk Details] Cache hits: ${Object.keys(results).length}. Cache misses: ${appIdsToFetchFromSteam.length}`);

    // 2. Fetch missing details from Steam in batches
    if (appIdsToFetchFromSteam.length > 0) {
        const batchSize = 50; // Steam recommends not sending too many at once
        for (let i = 0; i < appIdsToFetchFromSteam.length; i += batchSize) {
            const batch = appIdsToFetchFromSteam.slice(i, i + batchSize);
            const appIdsString = batch.join(',');
            
            const steamDetailsRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appIdsString}&filters=basic,release_date`);
            if (!steamDetailsRes.ok) {
                console.error(`[Bulk Details] Failed to fetch batch from Steam. Status: ${steamDetailsRes.status}, Body: `, await steamDetailsRes.text().catch(() => 'Could not read body'));
                continue;
            }

            const steamDetailsData = await steamDetailsRes.json();

            for (const appId of batch) {
                const details = steamDetailsData[appId]?.data;
                if (steamDetailsData[appId]?.success && details) {
                    const gameData = {
                        id: appId,
                        title: details.name,
                        description: details.short_description,
                        imageUrl: details.header_image,
                        releaseDate: details.release_date?.date || null,
                        developer: details.developers?.[0] || null,
                        publisher: details.publishers?.[0] || null,
                        genre: details.genres?.map((g) => g.description).join(', ') || null,
                    };
                    
                    await setGameDetails(gameData); // Cache it
                    results[appId] = gameData;
                }
            }
            await sleep(500); // Delay between batches
        }
    }
    
    let userPlaytimeMap = {};
    if (steamId) {
        try {
            const playerStats = await fetch(`${WORKER_URL}?steamId=${steamId}&type=games`).then(res => res.ok ? res.json() : null);
            if (playerStats?.response?.games) {
                playerStats.response.games.forEach(game => {
                    userPlaytimeMap[game.appid] = {
                        playtime: game.playtime_forever || 0,
                        playtime2Weeks: game.playtime_2weeks || 0
                    };
                });
            }
        } catch (e) {
            console.error(`[Bulk Details] Could not fetch user playtime stats for ${steamId}: ${e.message}`);
        }
    }

    const finalResults = {};
    for (const appId of appIds) {
        if (results[appId]) {
            finalResults[appId] = {
                ...results[appId],
                playtime: userPlaytimeMap[appId]?.playtime || 0,
                playtime2Weeks: userPlaytimeMap[appId]?.playtime2Weeks || 0,
            };
        }
    }

    res.json(finalResults);

  } catch (error) {
    console.error(`Error fetching bulk game details:`, error.message);
    res.status(500).json({ error: 'Failed to fetch bulk game details.' });
  }
});

app.get('/api/player-game-stats/:steamId/:appId', async (req, res) => {
  const { steamId, appId } = req.params;
  try {
    let playtime_forever = 0;
    let playtime_2weeks = 0;
    // Try to get playtime, but don't fail the whole request if this part fails.
    try {
      const gamesResponse = await fetch(`${WORKER_URL}?steamId=${steamId}&type=games`);
      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        const ownedGames = gamesData.response?.games || [];
        const gameInfo = ownedGames.find(g => g.appid === parseInt(appId, 10));
        if (gameInfo) {
          playtime_forever = gameInfo.playtime_forever;
          playtime_2weeks = gameInfo.playtime_2weeks || 0;
        }
      }
    } catch(e) {
      console.error(`Could not fetch owned games for playtime stats: ${e.message}`);
    }

    // Second, get the achievements for that specific game.
    const achievementsResponse = await fetch(`${WORKER_URL}?steamId=${steamId}&type=achievements&appid=${appId}`);
    
    let achievements = { unlocked: 0, total: 0 };
    if (achievementsResponse.ok) {
      const achievementsData = await achievementsResponse.json();
      const achievementList = achievementsData.playerstats?.achievements || [];
      if (achievementList.length > 0) {
        achievements = {
          unlocked: achievementList.filter(a => a.achieved).length,
          total: achievementList.length,
        };
      }
    }
    // If fetching achievements fails, we still proceed but with 0 achievements, which is fine.

    res.json({
      appid: parseInt(appId, 10),
      playtime_forever,
      playtime_2weeks,
      achievements,
    });
  } catch (error) {
    console.error(`Error fetching single game stats for ${steamId}/${appId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch game stats.' });
  }
});

app.get('/api/achievements/:steamId/status', async (req, res) => {
  try {
    const { steamId } = req.params;
    const status = await getCacheStatus(steamId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache status.' });
  }
});

app.get('/api/achievements/:steamId', async (req, res) => {
  const { steamId } = req.params;
  const { force } = req.query;

  try {
    if (!force) {
      const cachedData = await getCachedAchievements(steamId);
      if (cachedData && cachedData.length > 0) {
        console.log(`[Cache HIT] Serving achievements for ${steamId} from cache.`);
        return res.json(cachedData);
      }
    }

    const freshData = await fetchAndCacheAchievements(steamId);
    res.json(freshData);

  } catch (error) {
    console.error('Error in route handler:', error.message);
    if (error.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'Steam API rate limit exceeded. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to fetch achievements.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
}); 