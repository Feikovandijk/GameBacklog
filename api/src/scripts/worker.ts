import { runPlayerCountSync } from '../services/steam-player-count-sync-service';
import { runSyncService } from '../services/steam-sync-service';
import { runPicsRefreshService } from '../services/steam-pics-refresh-service';

import { syncTrendingGames } from '../services/steam-discovery-service';

const PLAYER_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const GAME_LIST_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const PICS_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const TRENDING_SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function runPlayerCountLoop() {
  console.log('Starting Player Count Sync Loop...');
  while (true) {
    try {
      console.log(`\nPlayer sync started at ${new Date().toISOString()}`);
      await runPlayerCountSync();
      console.log(`Player sync finished at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Player sync error (caught):', error);
    }
    console.log(
      `Player sync sleeping for ${PLAYER_SYNC_INTERVAL_MS / 60000} minutes...`
    );
    await new Promise(resolve => setTimeout(resolve, PLAYER_SYNC_INTERVAL_MS));
  }
}

async function runGameListSyncLoop() {
  console.log('Starting Game List Sync Loop...');
  while (true) {
    try {
      console.log(`\nGame list sync started at ${new Date().toISOString()}`);
      await runSyncService();
      console.log(`Game list sync finished at ${new Date().toISOString()}`);
    } catch (error) {
      console.log('Game list sync error (caught):', error);
    }
    console.log(
      `Game list sync sleeping for ${GAME_LIST_SYNC_INTERVAL_MS / 60000} minutes...`
    );
    await new Promise(resolve =>
      setTimeout(resolve, GAME_LIST_SYNC_INTERVAL_MS)
    );
  }
}

async function runPicsRefreshLoop() {
  console.log('Starting PICS Refresh Loop...');
  while (true) {
    try {
      console.log(`\nPICS refresh started at ${new Date().toISOString()}`);
      await runPicsRefreshService();
      console.log(`PICS refresh finished at ${new Date().toISOString()}`);
    } catch (error) {
      console.log('PICS refresh error:', error);
    }
    console.log(
      `PICS refresh sleeping for ${PICS_REFRESH_INTERVAL_MS / 60000} minutes...`
    );
    await new Promise(resolve => setTimeout(resolve, PICS_REFRESH_INTERVAL_MS));
  }
}

async function runTrendingSyncLoop() {
  console.log('Starting Trending Games Sync Loop...');
  while (true) {
    try {
      console.log(`\nTrending sync started at ${new Date().toISOString()}`);
      await syncTrendingGames();
      console.log(`Trending sync finished at ${new Date().toISOString()}`);
    } catch (error) {
      console.log('Trending sync error:', error);
    }
    console.log(
      `Trending sync sleeping for ${TRENDING_SYNC_INTERVAL_MS / 60000} minutes...`
    );
    await new Promise(resolve =>
      setTimeout(resolve, TRENDING_SYNC_INTERVAL_MS)
    );
  }
}

async function runWorker() {
  console.log('Starting Worker Service with multiple tasks...');

  // Run all loops concurrently
  await Promise.all([
    runPlayerCountLoop(),
    runGameListSyncLoop(),
    runPicsRefreshLoop(),
    runTrendingSyncLoop(),
  ]);
}

void runWorker();
