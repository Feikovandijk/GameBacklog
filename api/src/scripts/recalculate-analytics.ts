import config from '../config';
import { supabase } from '../supabase/client';

// Helper to fetch a sample of documents from the games collection
async function fetchGameSample(limit: number) {
    const { data: documents, error } = await supabase
        .from('games')
        .select('*')
        .limit(limit);
    
    if (error) {
        throw error;
    }
    
    return documents || [];
}

async function updateStat(key: string, value: any) {
    try {
        const { data: existing, error: fetchError } = await supabase
            .from('statistics')
            .select('id')
            .eq('key', key)
            .single();
        
        const statObject = { key, value: JSON.stringify(value), count: 0 };

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        if (existing) {
            const { error: updateError } = await supabase
                .from('statistics')
                .update(statObject)
                .eq('id', existing.id);
            
            if (updateError) {
                throw updateError;
            }
        } else {
            const { error: insertError } = await supabase
                .from('statistics')
                .insert(statObject);
            
            if (insertError) {
                throw insertError;
            }
        }
        console.log(`Successfully updated stat: ${key}`);
    } catch (e) {
        console.error(`Failed to update stat ${key}:`, e);
    }
}

async function run() {
    console.log('Starting analytics recalculation on a sample of 5000 recently updated games...');

    const gameSample = await fetchGameSample(5000);

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