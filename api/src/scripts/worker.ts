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
      console.log(`\n[Player Sync] Starting at ${new Date().toISOString()}`);
      await runPlayerCountSync();
      console.log(`[Player Sync] Finished at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[Player Sync] Error:', error);
    }
    console.log(
      `[Player Sync] Sleeping for ${PLAYER_SYNC_INTERVAL_MS / 60000} minutes...`
    );
    await new Promise(resolve => setTimeout(resolve, PLAYER_SYNC_INTERVAL_MS));
  }
}

async function runGameListSyncLoop() {
  console.log('Starting Game List Sync Loop...');
  while (true) {
    try {
      console.log(`\n[Game List Sync] Starting at ${new Date().toISOString()}`);
      await runSyncService();
      console.log(`[Game List Sync] Finished at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[Game List Sync] Error:', error);
    }
    console.log(
      `[Game List Sync] Sleeping for ${GAME_LIST_SYNC_INTERVAL_MS / 60000} minutes...`
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
      console.log(`\n[PICS Refresh] Starting at ${new Date().toISOString()}`);
      await runPicsRefreshService();
      console.log(`[PICS Refresh] Finished at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[PICS Refresh] Error:', error);
    }
    console.log(
      `[PICS Refresh] Sleeping for ${PICS_REFRESH_INTERVAL_MS / 60000} minutes...`
    );
    await new Promise(resolve => setTimeout(resolve, PICS_REFRESH_INTERVAL_MS));
  }
}

async function runTrendingSyncLoop() {
  console.log('Starting Trending Games Sync Loop...');
  while (true) {
    try {
      console.log(`\n[Trending Sync] Starting at ${new Date().toISOString()}`);
      await syncTrendingGames();
      console.log(`[Trending Sync] Finished at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[Trending Sync] Error:', error);
    }
    console.log(
      `[Trending Sync] Sleeping for ${TRENDING_SYNC_INTERVAL_MS / 60000} minutes...`
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
