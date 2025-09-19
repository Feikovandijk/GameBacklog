import { supabase } from '../supabase/client';

// This is a one-time script to accurately count documents and populate the statistics collection.
// It uses Supabase's count functionality to get accurate counts.

async function recalculateStats() {
  console.log('Starting stats recalculation...');

  try {
    // 1. Count Total Games
    console.log('Counting all documents in the games collection...');
    const { count: totalGames, error: totalGamesError } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true });

    if (totalGamesError) {
      throw totalGamesError;
    }
    console.log(`Final total games count: ${totalGames || 0}`);

    // 2. Count Updated Games
    console.log('Counting updated games...');
    const { count: updatedGames, error: updatedGamesError } = await supabase
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
    await upsertStat('totalGames', totalGames || 0);

    // Upsert updated games count
    await upsertStat('updatedGames', updatedGames || 0);

    console.log('Stats recalculation completed successfully!');
  } catch (error) {
    console.error('\nAn error occurred during stats recalculation:', error);
    process.exit(1);
  }
}

async function upsertStat(key: string, count: number) {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('statistics')
      .select('id')
      .eq('key', key)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('statistics')
        .update({ count })
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }
      console.log(`- Updated stat '${key}' to ${count}.`);
    } else {
      const { error: insertError } = await supabase
        .from('statistics')
        .insert({ key, count });

      if (insertError) {
        throw insertError;
      }
      console.log(`- Created stat '${key}' with count ${count}.`);
    }
  } catch (e) {
    console.error(`Failed to upsert stat for key: ${key}`);
    throw e;
  }
}

if (require.main === module) {
  void recalculateStats().catch((error) => {
    console.error('Failed to recalculate stats:', error);
    process.exit(1);
  });
}
