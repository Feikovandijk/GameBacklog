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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../supabase/client");
// Helper to fetch a sample of documents from the games collection
function fetchGameSample(limit) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: documents, error } = yield client_1.supabase
            .from('games')
            .select('*')
            .limit(limit);
        if (error) {
            throw error;
        }
        return documents || [];
    });
}
function updateStat(key, value) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { data: existing, error: fetchError } = yield client_1.supabase
                .from('statistics')
                .select('id')
                .eq('key', key)
                .single();
            const statObject = { key, value: JSON.stringify(value), count: 0 };
            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }
            if (existing) {
                const { error: updateError } = yield client_1.supabase
                    .from('statistics')
                    .update(statObject)
                    .eq('id', existing.id);
                if (updateError) {
                    throw updateError;
                }
            }
            else {
                const { error: insertError } = yield client_1.supabase
                    .from('statistics')
                    .insert(statObject);
                if (insertError) {
                    throw insertError;
                }
            }
            console.log(`Successfully updated stat: ${key}`);
        }
        catch (e) {
            console.error(`Failed to update stat ${key}:`, e);
        }
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting analytics recalculation on a sample of 5000 recently updated games...');
        const gameSample = yield fetchGameSample(5000);
        // 1. Release Year Distribution
        const releaseYearDistribution = gameSample.reduce((acc, game) => {
            if (game.release_date) {
                const year = new Date(String(game.release_date)).getFullYear();
                if (year && year > 1980 && year <= new Date().getFullYear()) {
                    acc[year] = (acc[year] || 0) + 1;
                }
            }
            return acc;
        }, {});
        yield updateStat('analytics_releaseYearDistribution', releaseYearDistribution);
        // 2. Genre Distribution
        const genreDistribution = gameSample.reduce((acc, game) => {
            if (game.categories) {
                game.categories.forEach((cat) => {
                    if (cat !== 'Steam Achievements' &&
                        cat !== 'Steam Cloud' &&
                        cat !== 'Single-player') {
                        acc[cat] = (acc[cat] || 0) + 1;
                    }
                });
            }
            return acc;
        }, {});
        // We store the full distribution, the API will be responsible for getting the Top N
        yield updateStat('analytics_genreDistribution', genreDistribution);
        console.log('Analytics recalculation finished successfully.');
    });
}
run().catch(console.error);
