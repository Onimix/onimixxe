// Over 2.5 Tracking Analysis Engine
// Independent from Over 1.5 prediction logic

import { 
  DEFAULT_BUCKET_CONFIG, 
  type BucketConfig, 
  type Over25Result, 
  type UpcomingMatchInput, 
  type Over25Analysis,
  type BucketPerformance,
  type DayBlockPerformance,
  type BucketStats,
  type OddsPattern,
} from './types';

/**
 * Get the bucket label for a given odd value
 */
export function getHomeOddBucket(odd: number, config: BucketConfig = DEFAULT_BUCKET_CONFIG): string {
  for (const bucket of config.homeOddBuckets) {
    if (odd >= bucket.min && odd <= bucket.max) {
      return bucket.label;
    }
  }
  return '2.21+'; // Default to highest bucket
}

export function getOver25OddBucket(odd: number, config: BucketConfig = DEFAULT_BUCKET_CONFIG): string {
  for (const bucket of config.over25OddBuckets) {
    if (odd >= bucket.min && odd <= bucket.max) {
      return bucket.label;
    }
  }
  return '1.81+'; // Default to highest bucket
}

/**
 * Create a pattern hash from home odd and over25 odd buckets
 */
export function createPatternHash(homeOddBucket: string, over25OddBucket: string): string {
  return `${homeOddBucket}_${over25OddBucket}`;
}

/**
 * Calculate Over 2.5 statistics from results grouped by bucket
 */
export function calculateBucketStats(
  results: Over25Result[],
  bucketType: 'home_odd' | 'over25_odd',
  config: BucketConfig = DEFAULT_BUCKET_CONFIG
): BucketPerformance[] {
  const bucketMap = new Map<string, { total: number; over25Hits: number; results: Over25Result[] }>();

  for (const result of results) {
    let bucketLabel: string;
    
    if (bucketType === 'home_odd' && result.home_odd) {
      bucketLabel = getHomeOddBucket(result.home_odd, config);
    } else if (bucketType === 'over25_odd' && result.over25_odd) {
      bucketLabel = getOver25OddBucket(result.over25_odd, config);
    } else {
      continue;
    }

    const existing = bucketMap.get(bucketLabel) || { total: 0, over25Hits: 0, results: [] };
    existing.total++;
    if (result.result_over25) {
      existing.over25Hits++;
    }
    existing.results.push(result);
    bucketMap.set(bucketLabel, existing);
  }

  const performances: BucketPerformance[] = [];
  
  for (const [bucket_range, data] of bucketMap.entries()) {
    // Calculate current streak
    const sortedResults = data.results.sort((a, b) => 
      new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
    );
    
    let currentStreak = 0;
    let streakType = 'none';
    
    if (sortedResults.length > 0) {
      const firstResult = sortedResults[0];
      streakType = firstResult.result_over25 ? 'over' : 'under';
      
      for (const result of sortedResults) {
        if ((streakType === 'over' && result.result_over25) || 
            (streakType === 'under' && !result.result_over25)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    performances.push({
      bucket_range,
      total_matches: data.total,
      over25_hits: data.over25Hits,
      over25_rate: data.total > 0 ? (data.over25Hits / data.total) * 100 : 0,
      current_streak: currentStreak,
      streak_type: streakType,
    });
  }

  return performances.sort((a, b) => b.total_matches - a.total_matches);
}

/**
 * Calculate pattern statistics from results
 */
export function calculatePatternStats(
  results: Over25Result[],
  config: BucketConfig = DEFAULT_BUCKET_CONFIG
): OddsPattern[] {
  const patternMap = new Map<string, { 
    total: number; 
    over25Hits: number; 
    lastSeen: string;
    homeOddRange: string;
    over25OddRange: string;
  }>();

  for (const result of results) {
    if (!result.home_odd || !result.over25_odd) continue;

    const homeBucket = getHomeOddBucket(result.home_odd, config);
    const over25Bucket = getOver25OddBucket(result.over25_odd, config);
    const hash = createPatternHash(homeBucket, over25Bucket);

    const existing = patternMap.get(hash) || { 
      total: 0, 
      over25Hits: 0, 
      lastSeen: result.match_date,
      homeOddRange: homeBucket,
      over25OddRange: over25Bucket,
    };
    
    existing.total++;
    if (result.result_over25) {
      existing.over25Hits++;
    }
    
    if (new Date(result.match_date) > new Date(existing.lastSeen)) {
      existing.lastSeen = result.match_date;
    }
    
    patternMap.set(hash, existing);
  }

  const patterns: OddsPattern[] = [];
  
  for (const [pattern_hash, data] of patternMap.entries()) {
    patterns.push({
      id: pattern_hash,
      pattern_hash,
      home_odd_range: data.homeOddRange,
      over25_odd_range: data.over25OddRange,
      total_matches: data.total,
      over25_hits: data.over25Hits,
      over25_rate: data.total > 0 ? (data.over25Hits / data.total) * 100 : 0,
      last_seen: data.lastSeen,
      created_at: new Date().toISOString(),
    });
  }

  return patterns.sort((a, b) => b.total_matches - a.total_matches);
}

/**
 * Analyze an upcoming match and return prediction data
 */
export function analyzeUpcomingMatch(
  input: UpcomingMatchInput,
  historicalResults: Over25Result[],
  config: BucketConfig = DEFAULT_BUCKET_CONFIG
): Over25Analysis {
  const homeBucket = getHomeOddBucket(input.home_odd, config);
  const over25Bucket = getOver25OddBucket(input.over25_odd, config);
  const patternHash = createPatternHash(homeBucket, over25Bucket);

  // Find matching pattern in historical data
  const matchingResults = historicalResults.filter(result => {
    if (!result.home_odd || !result.over25_odd) return false;
    const resultHomeBucket = getHomeOddBucket(result.home_odd, config);
    const resultOver25Bucket = getOver25OddBucket(result.over25_odd, config);
    return resultHomeBucket === homeBucket && resultOver25Bucket === over25Bucket;
  });

  // Calculate statistics
  const totalInBucket = matchingResults.length;
  const over25Hits = matchingResults.filter(r => r.result_over25).length;
  const historicalOver25Rate = totalInBucket > 0 ? (over25Hits / totalInBucket) * 100 : 0;

  // Calculate current streak
  const sortedResults = matchingResults.sort((a, b) => 
    new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
  );

  let currentStreak = 0;
  let streakType: 'over' | 'under' | 'none' = 'none';

  if (sortedResults.length > 0) {
    const firstResult = sortedResults[0];
    streakType = firstResult.result_over25 ? 'over' : 'under';

    for (const result of sortedResults) {
      if ((streakType === 'over' && result.result_over25) ||
          (streakType === 'under' && !result.result_over25)) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Determine confidence indicator
  let confidenceIndicator: 'HIGH' | 'MEDIUM' | 'LOW';
  let recommendation: string | undefined;

  if (totalInBucket >= 20) {
    if (historicalOver25Rate >= 70) {
      confidenceIndicator = 'HIGH';
      recommendation = 'Strong Over 2.5 pattern detected';
    } else if (historicalOver25Rate >= 55) {
      confidenceIndicator = 'MEDIUM';
      recommendation = 'Moderate Over 2.5 tendency';
    } else if (historicalOver25Rate <= 40) {
      confidenceIndicator = 'HIGH';
      recommendation = 'Strong Under 2.5 pattern detected';
    } else {
      confidenceIndicator = 'MEDIUM';
      recommendation = 'Mixed results, proceed with caution';
    }
  } else if (totalInBucket >= 10) {
    confidenceIndicator = 'MEDIUM';
    recommendation = 'Limited data, moderate confidence';
  } else {
    confidenceIndicator = 'LOW';
    recommendation = 'Insufficient historical data';
  }

  return {
    bucket_home: homeBucket,
    bucket_over25: over25Bucket,
    historical_over25_rate: Math.round(historicalOver25Rate * 10) / 10,
    total_in_bucket: totalInBucket,
    current_streak: currentStreak,
    streak_type: streakType,
    confidence_indicator: confidenceIndicator,
    recommendation,
  };
}

/**
 * Calculate day/block performance summary
 */
export function calculateDayBlockPerformance(
  results: Over25Result[],
  groupBy: 'day' | 'block' = 'day'
): DayBlockPerformance[] {
  const groupMap = new Map<string, { total: number; over25Hits: number }>();

  for (const result of results) {
    const key = groupBy === 'day' 
      ? result.match_date 
      : `${result.match_date}_${result.block_id || 'default'}`;

    const existing = groupMap.get(key) || { total: 0, over25Hits: 0 };
    existing.total++;
    if (result.result_over25) {
      existing.over25Hits++;
    }
    groupMap.set(key, existing);
  }

  const performances: DayBlockPerformance[] = [];

  for (const [key, data] of groupMap.entries()) {
    if (groupBy === 'day') {
      performances.push({
        date: key,
        total_matches: data.total,
        over25_hits: data.over25Hits,
        over25_rate: data.total > 0 ? (data.over25Hits / data.total) * 100 : 0,
      });
    } else {
      const [date, block_id] = key.split('_');
      performances.push({
        date,
        block_id,
        total_matches: data.total,
        over25_hits: data.over25Hits,
        over25_rate: data.total > 0 ? (data.over25Hits / data.total) * 100 : 0,
      });
    }
  }

  return performances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Get overall Over 2.5 statistics
 */
export function getOverallOver25Stats(results: Over25Result[]): {
  totalMatches: number;
  over25Hits: number;
  over25Rate: number;
  currentStreak: number;
  streakType: 'over' | 'under' | 'none';
} {
  const totalMatches = results.length;
  const over25Hits = results.filter(r => r.result_over25).length;
  const over25Rate = totalMatches > 0 ? (over25Hits / totalMatches) * 100 : 0;

  // Calculate current streak
  const sortedResults = results.sort((a, b) => 
    new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
  );

  let currentStreak = 0;
  let streakType: 'over' | 'under' | 'none' = 'none';

  if (sortedResults.length > 0) {
    const firstResult = sortedResults[0];
    streakType = firstResult.result_over25 ? 'over' : 'under';

    for (const result of sortedResults) {
      if ((streakType === 'over' && result.result_over25) ||
          (streakType === 'under' && !result.result_over25)) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return {
    totalMatches,
    over25Hits,
    over25Rate,
    currentStreak,
    streakType,
  };
}
