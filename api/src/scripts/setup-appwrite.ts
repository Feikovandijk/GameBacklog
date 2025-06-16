import { Client, Databases, ID, IndexType } from 'node-appwrite';
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
        } catch (e: any) {
            if (e.code === 404) { // Not found
                 console.log(`Collection '${collectionName}' not found. Creating...`);
                 await databases.createCollection(databaseId, collectionId, collectionName);
                 console.log(`Collection '${collectionName}' created successfully.`);
                 // Wait a moment for collection to be ready before adding attributes
                 await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.error("An unexpected error occurred while checking for the collection:");
                throw e;
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
        ];

        for (const attr of attributes) {
            try {
                await attr.create();
                console.log(`- Attribute '${attr.id}' created successfully.`);
                // Appwrite needs some time to process attribute creation before creating the next one
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e: any) {
                if (e.code === 409) { // Conflict - attribute already exists
                    console.log(`- Attribute '${attr.id}' already exists. Skipping.`);
                } else {
                    console.error(`\nError creating attribute '${attr.id}':`);
                    throw e; // Stop script on other errors
                }
            }
        }

        // 3. Define and create index
        console.log('\nChecking and creating index...');
        try {
            // Key for the index, type, attributes array, orders array (optional)
            await databases.createIndex(databaseId, collectionId, 'steam_appid_unique', IndexType.Unique, ['steam_appid']);
            console.log("- Index on 'steam_appid' created successfully.");
        } catch (e: any) {
             if (e.code === 409) { // Conflict - index already exists
                 console.log("- Index on 'steam_appid' already exists. Skipping.");
             } else {
                 console.error("\nError creating index on 'steam_appid':");
                 throw e;
             }
        }

        try {
            await databases.createIndex(databaseId, collectionId, 'last_updated_idx', IndexType.Key, ['last_updated']);
            console.log("- Index on 'last_updated' created successfully.");
        } catch (e: any) {
            if (e.code === 409) {
                console.log("- Index on 'last_updated' already exists. Skipping.");
            } else {
                console.error("\nError creating index on 'last_updated':");
                throw e;
            }
        }
        
        console.log('\nAppwrite database setup completed successfully!');

    } catch (error: any) {
        console.error('\nAn error occurred during Appwrite setup:');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.response) {
            console.error('Full Response:', error.response);
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
        } catch (e: any) {
            if (e.code === 404) {
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
            } catch (e: any) {
                if (e.code === 409) { console.log(`- Attribute '${attr.id}' already exists. Skipping.`); }
                else { throw e; }
            }
        }

        // 3. Create index on 'key'
        try {
            await databases.createIndex(databaseId, collectionId, 'key_unique', IndexType.Unique, ['key']);
            console.log("- Index on 'key' created successfully.");
        } catch (e: any) {
            if (e.code === 409) { console.log("- Index on 'key' already exists. Skipping."); }
            else { throw e; }
        }

        console.log('Statistics collection setup completed.');
    } catch (error: any) {
        console.error('\nAn error occurred during statistics collection setup:', error.message);
        process.exit(1);
    }
}

// Autorun the setup when the script is executed
if (require.main === module) {
    setupAppwrite().then(setupStatsCollection);
} 