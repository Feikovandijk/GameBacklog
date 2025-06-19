import { Client, Databases, IndexType, AppwriteException } from 'node-appwrite';
import config from '../config';

// This script sets up the 'games' collection in your Appwrite database.
// It creates the collection, defines all necessary attributes, and sets up a unique index.
// Run this once to initialize your database schema.

async function setupAppwrite() {
    console.log('Starting Appwrite database setup...');

    const client = new Client();
    client
        .setEndpoint(config.appwrite.endpoint!)
        .setProject(config.appwrite.projectId!)
        .setKey(config.appwrite.apiKey!);

    const databases = new Databases(client);

    const databaseId = config.appwrite.databaseId!;
    const collectionId = config.appwrite.gamesCollectionId!;
    const collectionName = 'Games';

    try {
        // 1. Check if collection exists.
        try {
            await databases.getCollection(databaseId, collectionId);
            console.log(`Collection '${collectionName}' (${collectionId}) already exists. Proceeding to check attributes...`);
        } catch (e) {
            const error = e as AppwriteException;
            if (error.code === 404) { // Not found
                 console.log(`Collection '${collectionName}' not found. Creating...`);
                 await databases.createCollection(databaseId, collectionId, collectionName);
                 console.log(`Collection '${collectionName}' created successfully.`);
                 // Wait a moment for collection to be ready before adding attributes
                 await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.error("An unexpected error occurred while checking for the collection:");
                throw error;
            }
        }

        // 2. Define and create attributes
        console.log('\nChecking and creating attributes...');
        const attributes = [
            { id: 'steam_appid', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'steam_appid', true) },
            { id: 'name', create: () => databases.createStringAttribute(databaseId, collectionId, 'name', 255, true) },
            { id: 'short_description', create: () => databases.createStringAttribute(databaseId, collectionId, 'short_description', 1000, false) },
            { id: 'header_image', create: () => databases.createUrlAttribute(databaseId, collectionId, 'header_image', false) },
            { id: 'release_date', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'release_date', false) },
            { id: 'last_updated', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'last_updated', false) },
            { id: 'developers', create: () => databases.createStringAttribute(databaseId, collectionId, 'developers', 255, false, undefined, true) },
            { id: 'publishers', create: () => databases.createStringAttribute(databaseId, collectionId, 'publishers', 255, false, undefined, true) },
            { id: 'is_early_access', create: () => databases.createBooleanAttribute(databaseId, collectionId, 'is_early_access', false, false) },
            { id: 'total_reviews', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'total_reviews', false) },
            { id: 'steam_app_type', create: () => databases.createStringAttribute(databaseId, collectionId, 'steam_app_type', 32, false) },
            { id: 'price_final', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'price_final', false) },
            { id: 'price_currency', create: () => databases.createStringAttribute(databaseId, collectionId, 'price_currency', 8, false) },
            { id: 'price_initial', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'price_initial', false) },
            { id: 'discount_percent', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'discount_percent', false) },
            { id: 'total_positive', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'total_positive', false) },
            { id: 'total_negative', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'total_negative', false) },
            { id: 'review_score_desc', create: () => databases.createStringAttribute(databaseId, collectionId, 'review_score_desc', 64, false) },
            { id: 'current_players', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'current_players', false) },
            { id: 'tags', create: () => databases.createStringAttribute(databaseId, collectionId, 'tags', 64, false, undefined, true) },
            { id: 'controller_support', create: () => databases.createStringAttribute(databaseId, collectionId, 'controller_support', 32, false) },
            { id: 'metacritic_score', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'metacritic_score', false) },
            { id: 'metacritic_url', create: () => databases.createUrlAttribute(databaseId, collectionId, 'metacritic_url', false) },
            { id: 'platforms_windows', create: () => databases.createBooleanAttribute(databaseId, collectionId, 'platforms_windows', false) },
            { id: 'platforms_mac', create: () => databases.createBooleanAttribute(databaseId, collectionId, 'platforms_mac', false) },
            { id: 'platforms_linux', create: () => databases.createBooleanAttribute(databaseId, collectionId, 'platforms_linux', false) },
            { id: 'categories', create: () => databases.createStringAttribute(databaseId, collectionId, 'categories', 128, false, undefined, true) },
            { id: 'has_steam_achievements', create: () => databases.createBooleanAttribute(databaseId, collectionId, 'has_steam_achievements', false) },
        ];

        for (const attr of attributes) {
            try {
                await attr.create();
                console.log(`- Attribute '${attr.id}' created successfully.`);
                // Appwrite needs some time to process attribute creation before creating the next one
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                const error = e as AppwriteException;
                if (error.code === 409) { // Conflict - attribute already exists
                    console.log(`- Attribute '${attr.id}' already exists. Skipping.`);
                } else {
                    console.error(`\nError creating attribute '${attr.id}':`);
                    throw error; // Stop script on other errors
                }
            }
        }

        // 3. Define and create index
        console.log('\nChecking and creating index...');
        try {
            // Key for the index, type, attributes array, orders array (optional)
            await databases.createIndex(databaseId, collectionId, 'steam_appid_unique', IndexType.Unique, ['steam_appid']);
            console.log("- Index on 'steam_appid' created successfully.");
        } catch (e) {
             const error = e as AppwriteException;
             if (error.code === 409) { // Conflict - index already exists
                 console.log("- Index on 'steam_appid' already exists. Skipping.");
             } else {
                 console.error("\nError creating index on 'steam_appid':");
                 throw error;
             }
        }

        try {
            await databases.createIndex(databaseId, collectionId, 'last_updated_idx', IndexType.Key, ['last_updated']);
            console.log("- Index on 'last_updated' created successfully.");
        } catch (e) {
            const error = e as AppwriteException;
            if (error.code === 409) {
                console.log("- Index on 'last_updated' already exists. Skipping.");
            } else {
                console.error("\nError creating index on 'last_updated':");
                throw error;
            }
        }
        
        console.log('\nAppwrite database setup completed successfully!');

    } catch (error) {
        console.error('\nAn error occurred during Appwrite setup:');
        if (error instanceof AppwriteException) {
          console.error('Error Code:', error.code);
          console.error('Error Message:', error.message);
          if (error.response) {
              console.error('Full Response:', error.response);
          }
        } else if (error instanceof Error) {
            console.error('Error Message:', error.message);
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

async function setupStatsCollection() {
    console.log('\nStarting Statistics collection setup...');
    
    const client = new Client();
    client
        .setEndpoint(config.appwrite.endpoint!)
        .setProject(config.appwrite.projectId!)
        .setKey(config.appwrite.apiKey!);
    
    const databases = new Databases(client);
    const databaseId = config.appwrite.databaseId!;
    // Hard-coding new collection details as they are specific to this one-time setup
    const collectionId = 'statistics';
    const collectionName = 'Statistics';

    try {
        // 1. Create collection if it doesn't exist
        try {
            await databases.getCollection(databaseId, collectionId);
            console.log(`Collection '${collectionName}' (${collectionId}) already exists.`);
        } catch (e) {
            const error = e as AppwriteException;
            if (error.code === 404) {
                console.log(`Collection '${collectionName}' not found. Creating...`);
                await databases.createCollection(databaseId, collectionId, collectionName);
                console.log(`Collection '${collectionName}' created successfully.`);
                await new Promise(resolve => setTimeout(resolve, 500));
            } else { throw e; }
        }

        // 2. Create attributes
        const attributes = [
            { id: 'key', create: () => databases.createStringAttribute(databaseId, collectionId, 'key', 50, true) },
            { id: 'count', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'count', true) }
        ];

        for (const attr of attributes) {
            try {
                await attr.create();
                console.log(`- Attribute '${attr.id}' created successfully.`);
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                const error = e as AppwriteException;
                if (error.code === 409) { console.log(`- Attribute '${attr.id}' already exists. Skipping.`); }
                else { throw e; }
            }
        }

        // 3. Create index on 'key'
        try {
            await databases.createIndex(databaseId, collectionId, 'key_unique', IndexType.Unique, ['key']);
            console.log("- Index on 'key' created successfully.");
        } catch (e) {
            const error = e as AppwriteException;
            if (error.code === 409) { console.log("- Index on 'key' already exists. Skipping."); }
            else { throw e; }
        }

        console.log('Statistics collection setup completed.');
    } catch (error) {
        const message = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
        console.error('\nAn error occurred during statistics collection setup:', message);
        process.exit(1);
    }
}

async function setupReviewHistoryCollection() {
    console.log('\nStarting Review History collection setup...');

    const client = new Client();
    client
        .setEndpoint(config.appwrite.endpoint!)
        .setProject(config.appwrite.projectId!)
        .setKey(config.appwrite.apiKey!);

    const databases = new Databases(client);
    const databaseId = config.appwrite.databaseId!;
    const collectionId = 'review_history';
    const collectionName = 'Review History';

    try {
        // 1. Create collection if it doesn't exist
        try {
            await databases.getCollection(databaseId, collectionId);
            console.log(`Collection '${collectionName}' (${collectionId}) already exists.`);
        } catch (e) {
            const error = e as AppwriteException;
            if (error.code === 404) {
                console.log(`Collection '${collectionName}' not found. Creating...`);
                await databases.createCollection(databaseId, collectionId, collectionName);
                console.log(`Collection '${collectionName}' created successfully.`);
                await new Promise(resolve => setTimeout(resolve, 500));
            } else { throw e; }
        }

        // 2. Create attributes
        const attributes = [
            { id: 'game_id', create: () => databases.createStringAttribute(databaseId, collectionId, 'game_id', 64, true) },
            { id: 'date', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'date', true) },
            { id: 'total_reviews', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'total_reviews', true) }
        ];

        for (const attr of attributes) {
            try {
                await attr.create();
                console.log(`- Attribute '${attr.id}' created successfully.`);
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                const error = e as AppwriteException;
                if (error.code === 409) { console.log(`- Attribute '${attr.id}' already exists. Skipping.`); }
                else { throw e; }
            }
        }

        // 3. Create index on 'game_id'
        try {
            await databases.createIndex(databaseId, collectionId, 'game_id_idx', IndexType.Key, ['game_id']);
            console.log("- Index on 'game_id' created successfully.");
        } catch (e) {
            const error = e as AppwriteException;
            if (error.code === 409) { console.log("- Index on 'game_id' already exists. Skipping."); }
            else { throw e; }
        }

        console.log('Review History collection setup completed.');
    } catch (error) {
        const message = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
        console.error('\nAn error occurred during review history collection setup:', message);
        process.exit(1);
    }
}

async function setupAchievementsCollection() {
    console.log('\nStarting Achievements collection setup...');

    const client = new Client();
    client
        .setEndpoint(config.appwrite.endpoint!)
        .setProject(config.appwrite.projectId!)
        .setKey(config.appwrite.apiKey!);

    const databases = new Databases(client);
    const databaseId = config.appwrite.databaseId!;
    const collectionId = 'achievements';
    const collectionName = 'Achievements';

    try {
        // 1. Create collection if it doesn't exist
        try {
            await databases.getCollection(databaseId, collectionId);
            console.log(`Collection '${collectionName}' (${collectionId}) already exists.`);
        } catch (e) {
            const error = e as AppwriteException;
            if (error.code === 404) {
                console.log(`Collection '${collectionName}' not found. Creating...`);
                await databases.createCollection(databaseId, collectionId, collectionName);
                console.log(`Collection '${collectionName}' created successfully.`);
                await new Promise(resolve => setTimeout(resolve, 500));
            } else { throw e; }
        }

        // 2. Create attributes
        const attributes = [
            { id: 'game_id', create: () => databases.createStringAttribute(databaseId, collectionId, 'game_id', 64, true) },
            { id: 'steam_appid', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'steam_appid', true) },
            { id: 'api_name', create: () => databases.createStringAttribute(databaseId, collectionId, 'api_name', 255, true) },
            { id: 'display_name', create: () => databases.createStringAttribute(databaseId, collectionId, 'display_name', 255, false) },
            { id: 'description', create: () => databases.createStringAttribute(databaseId, collectionId, 'description', 1000, false) },
            { id: 'icon', create: () => databases.createUrlAttribute(databaseId, collectionId, 'icon', false) },
            { id: 'icon_gray', create: () => databases.createUrlAttribute(databaseId, collectionId, 'icon_gray', false) },
            { id: 'hidden', create: () => databases.createBooleanAttribute(databaseId, collectionId, 'hidden', false) },
            { id: 'global_percentage', create: () => databases.createFloatAttribute(databaseId, collectionId, 'global_percentage', false) },
        ];

        for (const attr of attributes) {
            try {
                await attr.create();
                console.log(`- Attribute '${attr.id}' created successfully.`);
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                const error = e as AppwriteException;
                if (error.code === 409) { console.log(`- Attribute '${attr.id}' already exists. Skipping.`); }
                else { throw e; }
            }
        }

        // Add a final delay before creating indexes to ensure attributes are ready
        await new Promise(resolve => setTimeout(resolve, 1000)); 

        // 3. Create indexes
        try {
            await databases.createIndex(databaseId, collectionId, 'steam_appid_idx', IndexType.Key, ['steam_appid']);
            console.log("- Index on 'steam_appid' created successfully.");
        } catch (e) {
            const error = e as AppwriteException;
            if (error.code === 409) { console.log("- Index on 'steam_appid' already exists. Skipping."); }
            else { throw e; }
        }
        try {
            await databases.createIndex(databaseId, collectionId, 'game_id_idx', IndexType.Key, ['game_id']);
            console.log("- Index on 'game_id' created successfully.");
        } catch (e) {
            const error = e as AppwriteException;
            if (error.code === 409) { console.log("- Index on 'game_id' already exists. Skipping."); }
            else { throw e; }
        }

        console.log('Achievements collection setup completed.');
    } catch (error) {
        const message = error instanceof AppwriteException ? error.message : 'An unknown error occurred.';
        console.error('\nAn error occurred during achievements collection setup:', message);
        process.exit(1);
    }
}

async function main() {
    await setupAppwrite();
    await setupStatsCollection();
    await setupReviewHistoryCollection();
    await setupAchievementsCollection();
}

main(); 