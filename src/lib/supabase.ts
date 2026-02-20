import { createClient } from '@supabase/supabase-js';
import type { Result, Odds } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Support both anon key and publishable key variable names
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Validate URL format before creating client
function isValidUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

// Only create client if both variables are valid
export const supabase = isValidUrl(supabaseUrl) && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (!supabase) {
  console.warn('Missing or invalid Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)');
}

// Results operations
export async function insertResults(results: Omit<Result, 'id' | 'created_at'>[]): Promise<{ success: boolean; error?: string; count: number }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized', count: 0 };
  }

  try {
    // Use upsert to handle duplicates
    const { data, error } = await supabase
      .from('results')
      .upsert(results, { 
        onConflict: 'block_time,home_team,away_team,home_goals,away_goals',
        ignoreDuplicates: true 
      })
      .select();

    if (error) {
      console.error('Error inserting results:', error);
      return { success: false, error: error.message, count: 0 };
    }

    return { success: true, count: results.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error inserting results:', errorMessage);
    return { success: false, error: errorMessage, count: 0 };
  }
}

export async function getAllResults(): Promise<Result[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  try {
    // Fetch all results using pagination (Supabase default limit is 1000)
    const allResults: Result[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching results:', error);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      allResults.push(...data);

      // If we got less than pageSize, we've reached the end
      if (data.length < pageSize) {
        break;
      }

      page++;
    }

    return allResults;
  } catch (error) {
    console.error('Error fetching results:', error);
    return [];
  }
}

export async function getResultsByBlockTime(blockTime: string): Promise<Result[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('block_time', blockTime);

    if (error) {
      console.error('Error fetching results by block time:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching results by block time:', error);
    return [];
  }
}

export async function getResultsByTeam(teamName: string): Promise<Result[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .or(`home_team.ilike.%${teamName}%,away_team.ilike.%${teamName}%`);

    if (error) {
      console.error('Error fetching results by team:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching results by team:', error);
    return [];
  }
}

// Odds operations
export async function insertOdds(oddsList: Omit<Odds, 'id' | 'created_at'>[]): Promise<{ success: boolean; error?: string; count: number }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized', count: 0 };
  }

  try {
    const { data, error } = await supabase
      .from('odds')
      .insert(oddsList)
      .select();

    if (error) {
      console.error('Error inserting odds:', error);
      return { success: false, error: error.message, count: 0 };
    }

    return { success: true, count: oddsList.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error inserting odds:', errorMessage);
    return { success: false, error: errorMessage, count: 0 };
  }
}

export async function getAllOdds(): Promise<Odds[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('odds')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching odds:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching odds:', error);
    return [];
  }
}

export async function clearOdds(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { error } = await supabase
      .from('odds')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error clearing odds:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error clearing odds:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Statistics
export async function getHistoricalStats(): Promise<{
  totalMatches: number;
  avgGoals: number;
  over15Rate: number;
  over25Rate: number;
}> {
  if (!supabase) {
    return { totalMatches: 0, avgGoals: 0, over15Rate: 0, over25Rate: 0 };
  }

  try {
    // Fetch all results using pagination for accurate stats
    const allData: Array<{ total_goals: number; over_15: boolean; over_25: boolean }> = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('results')
        .select('total_goals, over_15, over_25')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching historical stats:', error);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      allData.push(...data);

      if (data.length < pageSize) {
        break;
      }

      page++;
    }

    if (allData.length === 0) {
      return { totalMatches: 0, avgGoals: 0, over15Rate: 0, over25Rate: 0 };
    }

    const totalMatches = allData.length;
    const totalGoals = allData.reduce((sum, row) => sum + row.total_goals, 0);
    const over15Count = allData.filter(row => row.over_15).length;
    const over25Count = allData.filter(row => row.over_25).length;

    return {
      totalMatches,
      avgGoals: totalGoals / totalMatches,
      over15Rate: (over15Count / totalMatches) * 100,
      over25Rate: (over25Count / totalMatches) * 100,
    };
  } catch (error) {
    console.error('Error calculating historical stats:', error);
    return { totalMatches: 0, avgGoals: 0, over15Rate: 0, over25Rate: 0 };
  }
}
