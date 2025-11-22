import { runPlayerCountSync } from '../services/steam-player-count-sync-service';

const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function runWorker() {
    console.log('Starting Player Sync Worker...');

    while (true) {
        try {
            console.log(`\n--- Starting Sync at ${new Date().toISOString()} ---`);
            await runPlayerCountSync();
            console.log(`--- Sync Finished at ${new Date().toISOString()} ---`);
        } catch (error) {
            console.error('Error in worker loop:', error);
        }

        console.log(`Sleeping for ${INTERVAL_MS / 60000} minutes...`);
        await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    }
}

void runWorker();
