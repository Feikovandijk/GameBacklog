import { runPlayerCountSync } from '../services/steam-player-count-sync-service';
import { runSyncService } from '../services/steam-sync-service';
import { enrichAllGames } from './enrich-all-games';

const PLAYER_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const GAME_LIST_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const ENRICHMENT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

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
        console.log(`[Player Sync] Sleeping for ${PLAYER_SYNC_INTERVAL_MS / 60000} minutes...`);
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
        console.log(`[Game List Sync] Sleeping for ${GAME_LIST_SYNC_INTERVAL_MS / 60000} minutes...`);
        await new Promise(resolve => setTimeout(resolve, GAME_LIST_SYNC_INTERVAL_MS));
    }
}

async function runEnrichmentLoop() {
    console.log('Starting Enrichment Loop...');
    while (true) {
        try {
            console.log(`\n[Enrichment] Starting at ${new Date().toISOString()}`);
            await enrichAllGames();
            console.log(`[Enrichment] Finished at ${new Date().toISOString()}`);
        } catch (error) {
            console.error('[Enrichment] Error:', error);
        }
        console.log(`[Enrichment] Sleeping for ${ENRICHMENT_INTERVAL_MS / 60000} minutes...`);
        await new Promise(resolve => setTimeout(resolve, ENRICHMENT_INTERVAL_MS));
    }
}

async function runWorker() {
    console.log('Starting Worker Service with multiple tasks...');

    // Run all loops concurrently
    await Promise.all([
        runPlayerCountLoop(),
        runGameListSyncLoop(),
        runEnrichmentLoop()
    ]);
}

void runWorker();
