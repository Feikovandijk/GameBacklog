"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_appwrite_1 = require("node-appwrite");
const config_1 = __importDefault(require("../config"));
// This script sets up the 'games' collection in your Appwrite database.
// It creates the collection, defines all necessary attributes, and sets up a unique index.
// Run this once to initialize your database schema.
function setupAppwrite() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting Appwrite database setup...');
        const client = new node_appwrite_1.Client();
        client
            .setEndpoint(config_1.default.appwrite.endpoint)
            .setProject(config_1.default.appwrite.projectId)
            .setKey(config_1.default.appwrite.apiKey);
        const databases = new node_appwrite_1.Databases(client);
        const databaseId = config_1.default.appwrite.databaseId;
        const collectionId = config_1.default.appwrite.gamesCollectionId;
        const collectionName = 'Games';
        try {
            // 1. Check if collection exists.
            try {
                yield databases.getCollection(databaseId, collectionId);
                console.log(`Collection '${collectionName}' (${collectionId}) already exists. Proceeding to check attributes...`);
            }
            catch (e) {
                const error = e;
                if (error.code === 404) { // Not found
                    console.log(`Collection '${collectionName}' not found. Creating...`);
                    yield databases.createCollection(databaseId, collectionId, collectionName);
                    console.log(`Collection '${collectionName}' created successfully.`);
                    // Wait a moment for collection to be ready before adding attributes
                    yield new Promise(resolve => setTimeout(resolve, 1000));
                }
                else {
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
                { id: 'review_score_desc', create: () => databases.createStringAttribute(databaseId, collectionId, 'review_score_desc', 255, false) },
                { id: 'current_players', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'current_players', false) },
                { id: 'positive_rating_percentage', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'positive_rating_percentage', false, 0, 100) },
                { id: 'tags', create: () => databases.createStringAttribute(databaseId, collectionId, 'tags', 255, false, undefined, true) },
                { id: 'controller_support', create: () => databases.createStringAttribute(databaseId, collectionId, 'controller_support', 255, false) },
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
                    yield attr.create();
                    console.log(`- Attribute '${attr.id}' created successfully.`);
                    // Appwrite needs some time to process attribute creation before creating the next one
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (e) {
                    const error = e;
                    if (error.code === 409) { // Conflict - attribute already exists
                        console.log(`- Attribute '${attr.id}' already exists. Skipping.`);
                    }
                    else {
                        console.error(`\nError creating attribute '${attr.id}':`);
                        throw error; // Stop script on other errors
                    }
                }
            }
            // 3. Define and create index
            console.log('\nChecking and creating index...');
            try {
                // Key for the index, type, attributes array, orders array (optional)
                yield databases.createIndex(databaseId, collectionId, 'steam_appid_unique', node_appwrite_1.IndexType.Unique, ['steam_appid']);
                console.log("- Index on 'steam_appid' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) { // Conflict - index already exists
                    console.log("- Index on 'steam_appid' already exists. Skipping.");
                }
                else {
                    console.error("\nError creating index on 'steam_appid':");
                    throw error;
                }
            }
            try {
                yield databases.createIndex(databaseId, collectionId, 'last_updated_idx', node_appwrite_1.IndexType.Key, ['last_updated']);
                console.log("- Index on 'last_updated' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) {
                    console.log("- Index on 'last_updated' already exists. Skipping.");
                }
                else {
                    console.error("\nError creating index on 'last_updated':");
                    throw error;
                }
            }
            console.log('\nAppwrite database setup completed successfully!');
        }
        catch (error) {
            console.error('\nAn error occurred during Appwrite setup:');
            if (error instanceof node_appwrite_1.AppwriteException) {
                console.error('Error Code:', error.code);
                console.error('Error Message:', error.message);
                if (error.response) {
                    console.error('Full Response:', error.response);
                }
            }
            else if (error instanceof Error) {
                console.error('Error Message:', error.message);
            }
            else {
                console.error(error);
            }
            process.exit(1);
        }
    });
}
function setupStatsCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\nStarting Statistics collection setup...');
        const client = new node_appwrite_1.Client();
        client
            .setEndpoint(config_1.default.appwrite.endpoint)
            .setProject(config_1.default.appwrite.projectId)
            .setKey(config_1.default.appwrite.apiKey);
        const databases = new node_appwrite_1.Databases(client);
        const databaseId = config_1.default.appwrite.databaseId;
        // Hard-coding new collection details as they are specific to this one-time setup
        const collectionId = 'statistics';
        const collectionName = 'Statistics';
        try {
            // 1. Create collection if it doesn't exist
            try {
                yield databases.getCollection(databaseId, collectionId);
                console.log(`Collection '${collectionName}' (${collectionId}) already exists.`);
            }
            catch (e) {
                const error = e;
                if (error.code === 404) {
                    console.log(`Collection '${collectionName}' not found. Creating...`);
                    yield databases.createCollection(databaseId, collectionId, collectionName);
                    console.log(`Collection '${collectionName}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                else {
                    throw e;
                }
            }
            // 2. Create attributes
            const attributes = [
                { id: 'key', create: () => databases.createStringAttribute(databaseId, collectionId, 'key', 50, true) },
                { id: 'count', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'count', false) },
                { id: 'value', create: () => databases.createStringAttribute(databaseId, collectionId, 'value', 1000000, false) }
            ];
            for (const attr of attributes) {
                try {
                    yield attr.create();
                    console.log(`- Attribute '${attr.id}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (e) {
                    const error = e;
                    if (error.code === 409) {
                        console.log(`- Attribute '${attr.id}' already exists. Skipping.`);
                    }
                    else {
                        throw e;
                    }
                }
            }
            // 3. Create index on 'key'
            try {
                yield databases.createIndex(databaseId, collectionId, 'key_unique', node_appwrite_1.IndexType.Unique, ['key']);
                console.log("- Index on 'key' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) {
                    console.log("- Index on 'key' already exists. Skipping.");
                }
                else {
                    throw e;
                }
            }
            console.log('Statistics collection setup completed.');
        }
        catch (error) {
            const message = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
            console.error('\nAn error occurred during statistics collection setup:', message);
            process.exit(1);
        }
    });
}
function setupReviewHistoryCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\nStarting Review History collection setup...');
        const client = new node_appwrite_1.Client();
        client
            .setEndpoint(config_1.default.appwrite.endpoint)
            .setProject(config_1.default.appwrite.projectId)
            .setKey(config_1.default.appwrite.apiKey);
        const databases = new node_appwrite_1.Databases(client);
        const databaseId = config_1.default.appwrite.databaseId;
        const collectionId = 'review_history';
        const collectionName = 'Review History';
        try {
            // 1. Create collection if it doesn't exist
            try {
                yield databases.getCollection(databaseId, collectionId);
                console.log(`Collection '${collectionName}' (${collectionId}) already exists.`);
            }
            catch (e) {
                const error = e;
                if (error.code === 404) {
                    console.log(`Collection '${collectionName}' not found. Creating...`);
                    yield databases.createCollection(databaseId, collectionId, collectionName);
                    console.log(`Collection '${collectionName}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                else {
                    throw e;
                }
            }
            // 2. Create attributes
            const attributes = [
                { id: 'game_id', create: () => databases.createStringAttribute(databaseId, collectionId, 'game_id', 64, true) },
                { id: 'date', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'date', true) },
                { id: 'total_reviews', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'total_reviews', true) }
            ];
            for (const attr of attributes) {
                try {
                    yield attr.create();
                    console.log(`- Attribute '${attr.id}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (e) {
                    const error = e;
                    if (error.code === 409) {
                        console.log(`- Attribute '${attr.id}' already exists. Skipping.`);
                    }
                    else {
                        throw e;
                    }
                }
            }
            // 3. Create index on 'game_id'
            try {
                yield databases.createIndex(databaseId, collectionId, 'game_id_idx', node_appwrite_1.IndexType.Key, ['game_id']);
                console.log("- Index on 'game_id' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) {
                    console.log("- Index on 'game_id' already exists. Skipping.");
                }
                else {
                    throw e;
                }
            }
            console.log('Review History collection setup completed.');
        }
        catch (error) {
            const message = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
            console.error('\nAn error occurred during review history collection setup:', message);
            process.exit(1);
        }
    });
}
function setupAchievementsCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\nStarting Achievements collection setup...');
        const client = new node_appwrite_1.Client();
        client
            .setEndpoint(config_1.default.appwrite.endpoint)
            .setProject(config_1.default.appwrite.projectId)
            .setKey(config_1.default.appwrite.apiKey);
        const databases = new node_appwrite_1.Databases(client);
        const databaseId = config_1.default.appwrite.databaseId;
        const collectionId = 'achievements';
        const collectionName = 'Achievements';
        try {
            // 1. Create collection if it doesn't exist
            try {
                yield databases.getCollection(databaseId, collectionId);
                console.log(`Collection '${collectionName}' (${collectionId}) already exists.`);
            }
            catch (e) {
                const error = e;
                if (error.code === 404) {
                    console.log(`Collection '${collectionName}' not found. Creating...`);
                    yield databases.createCollection(databaseId, collectionId, collectionName);
                    console.log(`Collection '${collectionName}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                else {
                    throw e;
                }
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
                    yield attr.create();
                    console.log(`- Attribute '${attr.id}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (e) {
                    const error = e;
                    if (error.code === 409) {
                        console.log(`- Attribute '${attr.id}' already exists. Skipping.`);
                    }
                    else {
                        throw e;
                    }
                }
            }
            // Add a final delay before creating indexes to ensure attributes are ready
            yield new Promise(resolve => setTimeout(resolve, 1000));
            // 3. Create indexes
            try {
                yield databases.createIndex(databaseId, collectionId, 'steam_appid_idx', node_appwrite_1.IndexType.Key, ['steam_appid']);
                console.log("- Index on 'steam_appid' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) {
                    console.log("- Index on 'steam_appid' already exists. Skipping.");
                }
                else {
                    throw e;
                }
            }
            try {
                yield databases.createIndex(databaseId, collectionId, 'game_id_idx', node_appwrite_1.IndexType.Key, ['game_id']);
                console.log("- Index on 'game_id' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) {
                    console.log("- Index on 'game_id' already exists. Skipping.");
                }
                else {
                    throw e;
                }
            }
            console.log('Achievements collection setup completed.');
        }
        catch (error) {
            const message = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
            console.error('\nAn error occurred during achievements collection setup:', message);
            process.exit(1);
        }
    });
}
function setupSteamStateCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\nStarting Steam State collection setup...');
        const client = new node_appwrite_1.Client();
        client
            .setEndpoint(config_1.default.appwrite.endpoint)
            .setProject(config_1.default.appwrite.projectId)
            .setKey(config_1.default.appwrite.apiKey);
        const databases = new node_appwrite_1.Databases(client);
        const databaseId = config_1.default.appwrite.databaseId;
        const collectionId = 'steam_state';
        const collectionName = 'Steam State';
        try {
            try {
                yield databases.getCollection(databaseId, collectionId);
                console.log(`Collection '${collectionName}' (${collectionId}) already exists.`);
            }
            catch (e) {
                const error = e;
                if (error.code === 404) {
                    console.log(`Collection '${collectionName}' not found. Creating...`);
                    yield databases.createCollection(databaseId, collectionId, collectionName);
                    console.log(`Collection '${collectionName}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                else {
                    throw e;
                }
            }
            const attributes = [
                { id: 'changenumber', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'changenumber', true) },
            ];
            for (const attr of attributes) {
                try {
                    yield attr.create();
                    console.log(`- Attribute '${attr.id}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (e) {
                    const error = e;
                    if (error.code === 409) {
                        console.log(`- Attribute '${attr.id}' already exists. Skipping.`);
                    }
                    else {
                        throw e;
                    }
                }
            }
            console.log('Steam State collection setup completed.');
        }
        catch (error) {
            const message = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
            console.error('\nAn error occurred during steam state collection setup:', message);
            process.exit(1);
        }
    });
}
function setupUsersCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\nStarting Users collection setup...');
        const client = new node_appwrite_1.Client();
        client
            .setEndpoint(config_1.default.appwrite.endpoint)
            .setProject(config_1.default.appwrite.projectId)
            .setKey(config_1.default.appwrite.apiKey);
        const databases = new node_appwrite_1.Databases(client);
        const databaseId = config_1.default.appwrite.databaseId;
        const collectionId = 'users';
        const collectionName = 'Users';
        try {
            try {
                yield databases.getCollection(databaseId, collectionId);
                console.log(`Collection '${collectionName}' (${collectionId}) already exists.`);
            }
            catch (e) {
                const error = e;
                if (error.code === 404) {
                    console.log(`Collection '${collectionName}' not found. Creating...`);
                    yield databases.createCollection(databaseId, collectionId, collectionName);
                    console.log(`Collection '${collectionName}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                else {
                    throw e;
                }
            }
            const attributes = [
                // Core user data
                { id: 'steam_id', create: () => databases.createStringAttribute(databaseId, collectionId, 'steam_id', 32, true) },
                { id: 'display_name', create: () => databases.createStringAttribute(databaseId, collectionId, 'display_name', 255, true) },
                { id: 'avatar_url', create: () => databases.createUrlAttribute(databaseId, collectionId, 'avatar_url', false) },
                { id: 'profile_url', create: () => databases.createUrlAttribute(databaseId, collectionId, 'profile_url', false) },
                { id: 'real_name', create: () => databases.createStringAttribute(databaseId, collectionId, 'real_name', 255, false) },
                { id: 'country_code', create: () => databases.createStringAttribute(databaseId, collectionId, 'country_code', 8, false) },
                { id: 'is_public_profile', create: () => databases.createBooleanAttribute(databaseId, collectionId, 'is_public_profile', false, true) },
                // User preferences
                { id: 'auto_import_steam_games', create: () => databases.createBooleanAttribute(databaseId, collectionId, 'auto_import_steam_games', false, true) },
                { id: 'sync_steam_playtime', create: () => databases.createBooleanAttribute(databaseId, collectionId, 'sync_steam_playtime', false, true) },
                { id: 'default_game_status', create: () => databases.createStringAttribute(databaseId, collectionId, 'default_game_status', 32, false, 'want_to_play') },
                { id: 'theme', create: () => databases.createStringAttribute(databaseId, collectionId, 'theme', 16, false, 'dark') },
                { id: 'default_view', create: () => databases.createStringAttribute(databaseId, collectionId, 'default_view', 16, false, 'grid') },
                // Timestamps
                { id: 'created_at', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'created_at', true) },
                { id: 'last_steam_sync', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'last_steam_sync', false) },
                { id: 'last_active', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'last_active', false) },
            ];
            for (const attr of attributes) {
                try {
                    yield attr.create();
                    console.log(`- Attribute '${attr.id}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (e) {
                    const error = e;
                    if (error.code === 409) {
                        console.log(`- Attribute '${attr.id}' already exists. Skipping.`);
                    }
                    else {
                        throw e;
                    }
                }
            }
            // Create indexes
            try {
                yield databases.createIndex(databaseId, collectionId, 'steam_id_unique', node_appwrite_1.IndexType.Unique, ['steam_id']);
                console.log("- Index on 'steam_id' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) {
                    console.log("- Index on 'steam_id' already exists. Skipping.");
                }
                else {
                    throw e;
                }
            }
            console.log('Users collection setup completed.');
        }
        catch (error) {
            const message = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
            console.error('\nAn error occurred during users collection setup:', message);
            process.exit(1);
        }
    });
}
function setupUserGamesCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\nStarting User Games collection setup...');
        const client = new node_appwrite_1.Client();
        client
            .setEndpoint(config_1.default.appwrite.endpoint)
            .setProject(config_1.default.appwrite.projectId)
            .setKey(config_1.default.appwrite.apiKey);
        const databases = new node_appwrite_1.Databases(client);
        const databaseId = config_1.default.appwrite.databaseId;
        const collectionId = 'user_games';
        const collectionName = 'User Games';
        try {
            try {
                yield databases.getCollection(databaseId, collectionId);
                console.log(`Collection '${collectionName}' (${collectionId}) already exists.`);
            }
            catch (e) {
                const error = e;
                if (error.code === 404) {
                    console.log(`Collection '${collectionName}' not found. Creating...`);
                    yield databases.createCollection(databaseId, collectionId, collectionName);
                    console.log(`Collection '${collectionName}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                else {
                    throw e;
                }
            }
            const attributes = [
                // Foreign keys
                { id: 'user_id', create: () => databases.createStringAttribute(databaseId, collectionId, 'user_id', 64, true) },
                { id: 'game_id', create: () => databases.createStringAttribute(databaseId, collectionId, 'game_id', 64, true) },
                { id: 'steam_appid', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'steam_appid', true) },
                // Game status and user data
                { id: 'status', create: () => databases.createStringAttribute(databaseId, collectionId, 'status', 50, true) },
                { id: 'priority', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'priority', false) },
                { id: 'user_rating', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'user_rating', false) },
                { id: 'user_notes', create: () => databases.createStringAttribute(databaseId, collectionId, 'user_notes', 10000, false) },
                { id: 'user_tags', create: () => databases.createStringAttribute(databaseId, collectionId, 'user_tags', 255, false, undefined, true) },
                // Playtime and completion
                { id: 'hours_played', create: () => databases.createFloatAttribute(databaseId, collectionId, 'hours_played', false) },
                { id: 'playtime_2weeks', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'playtime_2weeks', false) },
                { id: 'completion_percentage', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'completion_percentage', false) },
                { id: 'is_favorite', create: () => databases.createBooleanAttribute(databaseId, collectionId, 'is_favorite', false, false) },
                // Timestamps
                { id: 'added_at', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'added_at', true) },
                { id: 'updated_at', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'updated_at', false) },
                { id: 'completed_at', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'completed_at', false) },
                { id: 'last_played', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'last_played', false) },
            ];
            for (const attr of attributes) {
                try {
                    yield attr.create();
                    console.log(`- Attribute '${attr.id}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (e) {
                    const error = e;
                    if (error.code === 409) {
                        console.log(`- Attribute '${attr.id}' already exists. Skipping.`);
                    }
                    else {
                        throw e;
                    }
                }
            }
            // 3. Define and create indexes
            console.log('\nChecking and creating indexes for User Games...');
            const indexes = [
                { key: 'user_game_unique', type: node_appwrite_1.IndexType.Unique, attributes: ['user_id', 'game_id'] },
                { key: 'user_id_idx', type: node_appwrite_1.IndexType.Key, attributes: ['user_id'] },
                { key: 'status_idx', type: node_appwrite_1.IndexType.Key, attributes: ['status'] },
                { key: 'last_played_idx', type: node_appwrite_1.IndexType.Key, attributes: ['last_played'] },
                { key: 'playtime_2weeks_idx', type: node_appwrite_1.IndexType.Key, attributes: ['playtime_2weeks'] }
            ];
            for (const index of indexes) {
                try {
                    yield databases.createIndex(databaseId, collectionId, index.key, index.type, index.attributes);
                    console.log(`- Index on '${index.key}' created successfully.`);
                }
                catch (e) {
                    const error = e;
                    if (error.code === 409) {
                        console.log(`- Index on '${index.key}' already exists. Skipping.`);
                    }
                    else {
                        throw e;
                    }
                }
            }
            console.log('User Games collection setup completed.');
        }
        catch (error) {
            const message = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
            console.error('\nAn error occurred during user games collection setup:', message);
            process.exit(1);
        }
    });
}
function setupUserAchievementsCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\nStarting User Achievements collection setup...');
        const client = new node_appwrite_1.Client();
        client
            .setEndpoint(config_1.default.appwrite.endpoint)
            .setProject(config_1.default.appwrite.projectId)
            .setKey(config_1.default.appwrite.apiKey);
        const databases = new node_appwrite_1.Databases(client);
        const databaseId = config_1.default.appwrite.databaseId;
        const collectionId = 'user_achievements';
        const collectionName = 'User Achievements';
        try {
            try {
                yield databases.getCollection(databaseId, collectionId);
                console.log(`Collection '${collectionName}' (${collectionId}) already exists.`);
            }
            catch (e) {
                const error = e;
                if (error.code === 404) {
                    console.log(`Collection '${collectionName}' not found. Creating...`);
                    yield databases.createCollection(databaseId, collectionId, collectionName);
                    console.log(`Collection '${collectionName}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                else {
                    throw e;
                }
            }
            const attributes = [
                // Foreign keys
                { id: 'user_id', create: () => databases.createStringAttribute(databaseId, collectionId, 'user_id', 64, true) },
                { id: 'achievement_id', create: () => databases.createStringAttribute(databaseId, collectionId, 'achievement_id', 64, true) },
                { id: 'steam_appid', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'steam_appid', true) },
                { id: 'achievement_api_name', create: () => databases.createStringAttribute(databaseId, collectionId, 'achievement_api_name', 255, true) },
                // Achievement progress
                { id: 'is_unlocked', create: () => databases.createBooleanAttribute(databaseId, collectionId, 'is_unlocked', true) },
                { id: 'unlock_time', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'unlock_time', false) },
                { id: 'progress_current', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'progress_current', false, 0) },
                { id: 'progress_max', create: () => databases.createIntegerAttribute(databaseId, collectionId, 'progress_max', false, 0) },
                // Timestamps
                { id: 'created_at', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'created_at', true) },
                { id: 'updated_at', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'updated_at', false) },
            ];
            for (const attr of attributes) {
                try {
                    yield attr.create();
                    console.log(`- Attribute '${attr.id}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (e) {
                    const error = e;
                    if (error.code === 409) {
                        console.log(`- Attribute '${attr.id}' already exists. Skipping.`);
                    }
                    else {
                        throw e;
                    }
                }
            }
            // Create indexes
            try {
                yield databases.createIndex(databaseId, collectionId, 'user_achievement_unique', node_appwrite_1.IndexType.Unique, ['user_id', 'achievement_id']);
                console.log("- Index on 'user_id, achievement_id' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) {
                    console.log("- Index on 'user_id, achievement_id' already exists. Skipping.");
                }
                else {
                    throw e;
                }
            }
            try {
                yield databases.createIndex(databaseId, collectionId, 'user_id_idx', node_appwrite_1.IndexType.Key, ['user_id']);
                console.log("- Index on 'user_id' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) {
                    console.log("- Index on 'user_id' already exists. Skipping.");
                }
                else {
                    throw e;
                }
            }
            try {
                yield databases.createIndex(databaseId, collectionId, 'steam_appid_idx', node_appwrite_1.IndexType.Key, ['steam_appid']);
                console.log("- Index on 'steam_appid' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) {
                    console.log("- Index on 'steam_appid' already exists. Skipping.");
                }
                else {
                    throw e;
                }
            }
            console.log('User Achievements collection setup completed.');
        }
        catch (error) {
            const message = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
            console.error('\nAn error occurred during user achievements collection setup:', message);
            process.exit(1);
        }
    });
}
function setupUserActivityCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\nStarting User Activity collection setup...');
        const client = new node_appwrite_1.Client();
        client
            .setEndpoint(config_1.default.appwrite.endpoint)
            .setProject(config_1.default.appwrite.projectId)
            .setKey(config_1.default.appwrite.apiKey);
        const databases = new node_appwrite_1.Databases(client);
        const databaseId = config_1.default.appwrite.databaseId;
        const collectionId = 'user_activity';
        const collectionName = 'User Activity';
        try {
            // 1. Create collection if it doesn't exist
            try {
                yield databases.getCollection(databaseId, collectionId);
                console.log(`Collection '${collectionName}' (${collectionId}) already exists.`);
            }
            catch (e) {
                const error = e;
                if (error.code === 404) {
                    console.log(`Collection '${collectionName}' not found. Creating...`);
                    yield databases.createCollection(databaseId, collectionId, collectionName);
                    console.log(`Collection '${collectionName}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                else {
                    throw e;
                }
            }
            // 2. Create attributes
            const attributes = [
                { id: 'user_id', create: () => databases.createStringAttribute(databaseId, collectionId, 'user_id', 64, true) },
                { id: 'type', create: () => databases.createStringAttribute(databaseId, collectionId, 'type', 64, true) },
                { id: 'timestamp', create: () => databases.createDatetimeAttribute(databaseId, collectionId, 'timestamp', true) },
                { id: 'metadata_json', create: () => databases.createStringAttribute(databaseId, collectionId, 'metadata_json', 1000000, false) }
            ];
            for (const attr of attributes) {
                try {
                    yield attr.create();
                    console.log(`- Attribute '${attr.id}' created successfully.`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (e) {
                    const error = e;
                    if (error.code === 409) {
                        console.log(`- Attribute '${attr.id}' already exists. Skipping.`);
                    }
                    else {
                        throw e;
                    }
                }
            }
            // 3. Create indexes
            try {
                yield databases.createIndex(databaseId, collectionId, 'user_id_idx', node_appwrite_1.IndexType.Key, ['user_id']);
                console.log("- Index on 'user_id' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) {
                    console.log("- Index on 'user_id' already exists. Skipping.");
                }
                else {
                    throw e;
                }
            }
            try {
                yield databases.createIndex(databaseId, collectionId, 'timestamp_idx', node_appwrite_1.IndexType.Key, ['timestamp']);
                console.log("- Index on 'timestamp' created successfully.");
            }
            catch (e) {
                const error = e;
                if (error.code === 409) {
                    console.log("- Index on 'timestamp' already exists. Skipping.");
                }
                else {
                    throw e;
                }
            }
            console.log('User Activity collection setup completed.');
        }
        catch (error) {
            const message = error instanceof node_appwrite_1.AppwriteException ? error.message : 'An unknown error occurred.';
            console.error('\nAn error occurred during User Activity collection setup:', message);
            process.exit(1);
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield setupAppwrite();
        yield setupStatsCollection();
        yield setupReviewHistoryCollection();
        yield setupAchievementsCollection();
        yield setupSteamStateCollection();
        yield setupUsersCollection();
        yield setupUserGamesCollection();
        yield setupUserAchievementsCollection();
        yield setupUserActivityCollection();
    });
}
main();
