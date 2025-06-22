import { Client, Databases, Query, ID } from 'node-appwrite';
import config from '../config';

// Appwrite Client Setup
const appwriteClient = new Client()
    .setEndpoint(config.appwrite.endpoint!)
    .setProject(config.appwrite.projectId!)
    .setKey(config.appwrite.apiKey!);
const databases = new Databases(appwriteClient);

const DATABASE_ID = config.appwrite.databaseId!;
const GAMES_COLLECTION_ID = config.appwrite.gamesCollectionId!;
const STATS_COLLECTION_ID = 'statistics';

// Helper to fetch a sample of documents from the games collection
async function fetchGameSample(queries: any[] = [], limit: number) {
    const documents: any[] = [];
    let cursor: string | undefined = undefined;

    while (documents.length < limit) {
        // Fetch in batches, ensuring we don't go over the total limit
        const batchSize = Math.min(100, limit - documents.length);
        if (batchSize <= 0) break;

        const currentQueries = [...queries, Query.limit(batchSize)];
        if (cursor) {
            currentQueries.push(Query.cursorAfter(cursor));
        }

        const response = await databases.listDocuments(DATABASE_ID, GAMES_COLLECTION_ID, currentQueries);

        if (response.documents.length === 0) {
            break;
        }

        documents.push(...response.documents);
        cursor = response.documents[response.documents.length - 1].$id;
    }
    return documents;
}

async function updateStat(key: string, value: any) {
    try {
        const existing = await databases.listDocuments(DATABASE_ID, STATS_COLLECTION_ID, [Query.equal('key', key)]);
        const statObject = { key, count: JSON.stringify(value) };

        if (existing.documents.length > 0) {
            await databases.updateDocument(DATABASE_ID, STATS_COLLECTION_ID, existing.documents[0].$id, statObject);
        } else {
            await databases.createDocument(DATABASE_ID, STATS_COLLECTION_ID, ID.unique(), statObject);
        }
        console.log(`Successfully updated stat: ${key}`);
    } catch (e) {
        console.error(`Failed to update stat ${key}:`, e);
    }
}

async function run() {
    console.log('Starting analytics recalculation on a sample of 5000 recently updated games...');

    const gameSample = await fetchGameSample([
        Query.equal('steam_app_type', 'game'),
        Query.isNotNull('last_updated'),
        Query.orderDesc('last_updated'),
        Query.select(['release_date', 'categories'])
    ], 5000);

    // 1. Release Year Distribution
    const releaseYearDistribution = gameSample.reduce((acc, game) => {
        if (game.release_date) {
            const year = new Date(game.release_date).getFullYear();
            if (year && year > 1980 && year <= new Date().getFullYear()) {
                acc[year] = (acc[year] || 0) + 1;
            }
        }
        return acc;
    }, {} as Record<string, number>);
    await updateStat('analytics_releaseYearDistribution', releaseYearDistribution);

    // 2. Genre Distribution
    const genreDistribution = gameSample.reduce((acc, game) => {
        if (game.categories) {
            game.categories.forEach((cat: string) => {
                if (cat !== "Steam Achievements" && cat !== "Steam Cloud" && cat !== "Single-player") {
                     acc[cat] = (acc[cat] || 0) + 1;
                }
            });
        }
        return acc;
    }, {} as Record<string, number>);
    
    // We store the full distribution, the API will be responsible for getting the Top N
    await updateStat('analytics_genreDistribution', genreDistribution);

    console.log('Analytics recalculation finished successfully.');
}

run().catch(console.error); 