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
// This is a one-time script to accurately count documents and populate the statistics collection.
// It uses Supabase's count functionality to get accurate counts.
function recalculateStats() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting stats recalculation...');
        try {
            // 1. Count Total Games
            console.log('Counting all documents in the games collection...');
            const { count: totalGames, error: totalGamesError } = yield client_1.supabase
                .from('games')
                .select('*', { count: 'exact', head: true });
            if (totalGamesError) {
                throw totalGamesError;
            }
            console.log(`Final total games count: ${totalGames || 0}`);
            // 2. Count Updated Games
            console.log('Counting updated games...');
            const { count: updatedGames, error: updatedGamesError } = yield client_1.supabase
                .from('games')
                .select('*', { count: 'exact', head: true })
                .not('last_updated', 'is', null);
            if (updatedGamesError) {
                throw updatedGamesError;
            }
            console.log(`Final updated games count: ${updatedGames || 0}`);
            // 3. Upsert stats into the statistics collection
            console.log('Updating statistics collection...');
            // Upsert total games count
            yield upsertStat('totalGames', totalGames || 0);
            // Upsert updated games count
            yield upsertStat('updatedGames', updatedGames || 0);
            console.log('Stats recalculation completed successfully!');
        }
        catch (error) {
            console.error('\nAn error occurred during stats recalculation:', error);
            process.exit(1);
        }
    });
}
function upsertStat(key, count) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { data: existing, error: fetchError } = yield client_1.supabase
                .from('statistics')
                .select('id')
                .eq('key', key)
                .single();
            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }
            if (existing) {
                const { error: updateError } = yield client_1.supabase
                    .from('statistics')
                    .update({ count })
                    .eq('id', existing.id);
                if (updateError) {
                    throw updateError;
                }
                console.log(`- Updated stat '${key}' to ${count}.`);
            }
            else {
                const { error: insertError } = yield client_1.supabase
                    .from('statistics')
                    .insert({ key, count });
                if (insertError) {
                    throw insertError;
                }
                console.log(`- Created stat '${key}' with count ${count}.`);
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
