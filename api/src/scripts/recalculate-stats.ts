import { Client, Databases, Query, ID } from 'node-appwrite';
import config from '../config';

// This is a one-time script to accurately count documents and populate the statistics collection.
// It slowly pages through all documents in a collection to get an accurate count,
// bypassing the 5000 document limit on the 'total' property.

async function recalculateStats() {
    console.log('Starting stats recalculation...');

    const client = new Client();
    client
        .setEndpoint(config.appwrite.endpoint!)
        .setProject(config.appwrite.projectId!)
        .setKey(config.appwrite.apiKey!);

    const databases = new Databases(client);
    const dbId = config.appwrite.databaseId!;
    const gamesCollectionId = config.appwrite.gamesCollectionId!;
    const statsCollectionId = 'statistics';

    try {
        // 1. Count Total Games
        console.log('Counting all documents in the games collection (this may take a while)...');
        let totalGames = 0;
        let offset = 0;
        const limit = 100;
        let response;
        do {
            response = await databases.listDocuments(dbId, gamesCollectionId, [Query.limit(limit), Query.offset(offset)]);
            totalGames += response.documents.length;
            offset += limit;
            process.stdout.write(`\rCounted: ${totalGames} games`);
        } while (response.documents.length > 0);
        console.log(`\nFinal total games count: ${totalGames}`);
        
        // 2. Count Updated Games
        console.log('Counting updated games...');
        let updatedGames = 0;
        offset = 0;
         do {
            response = await databases.listDocuments(dbId, gamesCollectionId, [Query.isNotNull("last_updated"), Query.limit(limit), Query.offset(offset)]);
            updatedGames += response.documents.length;
            offset += limit;
            process.stdout.write(`\rCounted: ${updatedGames} updated games`);
        } while (response.documents.length > 0);
        console.log(`\nFinal updated games count: ${updatedGames}`);


        // 3. Upsert stats into the statistics collection
        console.log('Updating statistics collection...');
        
        // Upsert total games count
        await upsertStat(databases, dbId, statsCollectionId, 'totalGames', totalGames);
        
        // Upsert updated games count
        await upsertStat(databases, dbId, statsCollectionId, 'updatedGames', updatedGames);

        console.log('Stats recalculation completed successfully!');

    } catch (error) {
        console.error('\nAn error occurred during stats recalculation:', error);
        process.exit(1);
    }
}

async function upsertStat(databases: Databases, dbId: string, collectionId: string, key: string, count: number) {
    try {
        const existing = await databases.listDocuments(dbId, collectionId, [Query.equal('key', key)]);
        if (existing.documents.length > 0) {
            const docId = existing.documents[0].$id;
            await databases.updateDocument(dbId, collectionId, docId, { key, count });
            console.log(`- Updated stat '${key}' to ${count}.`);
        } else {
            await databases.createDocument(dbId, collectionId, ID.unique(), { key, count });
            console.log(`- Created stat '${key}' with ${count}.`);
        }
    } catch (e) {
        console.error(`Failed to upsert stat for key: ${key}`);
        throw e;
    }
}

if (require.main === module) {
    recalculateStats();
} 