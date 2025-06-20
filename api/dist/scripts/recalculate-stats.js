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
// This is a one-time script to accurately count documents and populate the statistics collection.
// It slowly pages through all documents in a collection to get an accurate count,
// bypassing the 5000 document limit on the 'total' property.
function recalculateStats() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting stats recalculation...');
        const client = new node_appwrite_1.Client();
        client
            .setEndpoint(config_1.default.appwrite.endpoint)
            .setProject(config_1.default.appwrite.projectId)
            .setKey(config_1.default.appwrite.apiKey);
        const databases = new node_appwrite_1.Databases(client);
        const dbId = config_1.default.appwrite.databaseId;
        const gamesCollectionId = config_1.default.appwrite.gamesCollectionId;
        const statsCollectionId = 'statistics';
        try {
            // 1. Count Total Games
            console.log('Counting all documents in the games collection (this may take a while)...');
            let totalGames = 0;
            let offset = 0;
            const limit = 100;
            let response;
            do {
                response = yield databases.listDocuments(dbId, gamesCollectionId, [node_appwrite_1.Query.limit(limit), node_appwrite_1.Query.offset(offset)]);
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
                response = yield databases.listDocuments(dbId, gamesCollectionId, [node_appwrite_1.Query.isNotNull("last_updated"), node_appwrite_1.Query.limit(limit), node_appwrite_1.Query.offset(offset)]);
                updatedGames += response.documents.length;
                offset += limit;
                process.stdout.write(`\rCounted: ${updatedGames} updated games`);
            } while (response.documents.length > 0);
            console.log(`\nFinal updated games count: ${updatedGames}`);
            // 3. Upsert stats into the statistics collection
            console.log('Updating statistics collection...');
            // Upsert total games count
            yield upsertStat(databases, dbId, statsCollectionId, 'totalGames', totalGames);
            // Upsert updated games count
            yield upsertStat(databases, dbId, statsCollectionId, 'updatedGames', updatedGames);
            console.log('Stats recalculation completed successfully!');
        }
        catch (error) {
            console.error('\nAn error occurred during stats recalculation:', error);
            process.exit(1);
        }
    });
}
function upsertStat(databases, dbId, collectionId, key, count) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const existing = yield databases.listDocuments(dbId, collectionId, [node_appwrite_1.Query.equal('key', key)]);
            if (existing.documents.length > 0) {
                const docId = existing.documents[0].$id;
                yield databases.updateDocument(dbId, collectionId, docId, { key, count });
                console.log(`- Updated stat '${key}' to ${count}.`);
            }
            else {
                yield databases.createDocument(dbId, collectionId, node_appwrite_1.ID.unique(), { key, count });
                console.log(`- Created stat '${key}' with ${count}.`);
            }
        }
        catch (e) {
            console.error(`Failed to upsert stat for key: ${key}`);
            throw e;
        }
    });
}
if (require.main === module) {
    recalculateStats();
}
