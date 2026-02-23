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

  // Find matching pattern in historical data (exact bucket match)
  const matchingResults = historicalResults.filter(result => {
    if (!result.home_odd || !result.over25_odd) return false;
    const resultHomeBucket = getHomeOddBucket(result.home_odd, config);
    const resultOver25Bucket = getOver25OddBucket(result.over25_odd, config);
    return resultHomeBucket === homeBucket && resultOver25Bucket === over25Bucket;
  });

  // Calculate statistics from exact pattern match
  const totalInBucket = matchingResults.length;
  const over25Hits = matchingResults.filter(r => r.result_over25).length;
  let historicalOver25Rate = totalInBucket > 0 ? (over25Hits / totalInBucket) * 100 : 0;

  // FALLBACK 1: If no exact pattern match, try using home odd bucket alone
  let homeBucketOnlyRate = 0;
  let homeBucketCount = 0;
  if (totalInBucket === 0) {
    const homeBucketResults = historicalResults.filter(result => {
      if (!result.home_odd) return false;
      const resultHomeBucket = getHomeOddBucket(result.home_odd, config);
      return resultHomeBucket === homeBucket;
    });
    homeBucketCount = homeBucketResults.length;
    const homeBucketHits = homeBucketResults.filter(r => r.result_over25).length;
    homeBucketOnlyRate = homeBucketCount > 0 ? (homeBucketHits / homeBucketCount) * 100 : 0;
  }

  // FALLBACK 2: If still no data, try using over 2.5 odd bucket alone
  let over25BucketOnlyRate = 0;
  let over25BucketCount = 0;
  if (totalInBucket === 0 && homeBucketCount === 0) {
    const over25BucketResults = historicalResults.filter(result => {
      if (!result.over25_odd) return false;
      const resultOver25Bucket = getOver25OddBucket(result.over25_odd, config);
      return resultOver25Bucket === over25Bucket;
    });
    over25BucketCount = over25BucketResults.length;
    const over25BucketHits = over25BucketResults.filter(r => r.result_over25).length;
    over25BucketOnlyRate = over25BucketCount > 0 ? (over25BucketHits / over25BucketCount) * 100 : 0;
  }

  // FALLBACK 3: Use overall historical rate as last resort
  const overallStats = getOverallOver25Stats(historicalResults);
  const overallRate = overallStats.over25Rate;

  // Use the best available data source
  let usedFallback: 'exact_pattern' | 'home_bucket' | 'over25_bucket' | 'overall' = 'exact_pattern';
  let finalRate = historicalOver25Rate;
  let sampleSize = totalInBucket;

  if (totalInBucket === 0) {
    if (homeBucketCount > 0) {
      finalRate = homeBucketOnlyRate;
      sampleSize = homeBucketCount;
      usedFallback = 'home_bucket';
    } else if (over25BucketCount > 0) {
      finalRate = over25BucketOnlyRate;
      sampleSize = over25BucketCount;
      usedFallback = 'over25_bucket';
    } else {
      // Use overall rate as last resort
      finalRate = overallRate;
      sampleSize = historicalResults.length;
      usedFallback = 'overall';
    }
  }

  // Calculate current streak from the data source we're using
  let currentStreak = 0;
  let streakType: 'over' | 'under' | 'none' = 'none';

  let dataForStreak: Over25Result[] = [];
  if (usedFallback === 'exact_pattern') {
    dataForStreak = matchingResults;
  } else if (usedFallback === 'home_bucket') {
    dataForStreak = historicalResults.filter(result => {
      if (!result.home_odd) return false;
      const resultHomeBucket = getHomeOddBucket(result.home_odd, config);
      return resultHomeBucket === homeBucket;
    });
  } else if (usedFallback === 'over25_bucket') {
    dataForStreak = historicalResults.filter(result => {
      if (!result.over25_odd) return false;
      const resultOver25Bucket = getOver25OddBucket(result.over25_odd, config);
      return resultOver25Bucket === over25Bucket;
    });
  } else {
    dataForStreak = historicalResults;
  }

  const sortedResults = dataForStreak.sort((a, b) => 
    new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
  );

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

  // Determine confidence indicator based on sample size and rate
  let confidenceIndicator: 'HIGH' | 'MEDIUM' | 'LOW';
  let recommendation: string | undefined;

  // Use sample size thresholds adjusted for fallback data
  const minSampleForHigh = usedFallback === 'exact_pattern' ? 20 : 50;
  const minSampleForMedium = usedFallback === 'exact_pattern' ? 10 : 25;

  if (sampleSize >= minSampleForHigh) {
    if (finalRate >= 70) {
      confidenceIndicator = 'HIGH';
      recommendation = 'Strong Over 2.5 pattern';
    } else if (finalRate >= 55) {
      confidenceIndicator = 'MEDIUM';
      recommendation = 'Moderate Over 2.5 tendency';
    } else if (finalRate <= 40) {
      confidenceIndicator = 'HIGH';
      recommendation = 'Strong Under 2.5 pattern';
    } else {
      confidenceIndicator = 'MEDIUM';
      recommendation = 'Mixed results, moderate confidence';
    }
  } else if (sampleSize >= minSampleForMedium) {
    confidenceIndicator = 'MEDIUM';
    if (finalRate >= 60) {
      recommendation = 'Likely Over 2.5';
    } else if (finalRate <= 45) {
      recommendation = 'Likely Under 2.5';
    } else {
      recommendation = 'Limited data, moderate confidence';
    }
  } else {
    // Not enough data - use overall rate as baseline but mark as LOW
    if (historicalResults.length > 0) {
      // Use overall rate with LOW confidence
      finalRate = overallRate;
      sampleSize = historicalResults.length;
      
      if (finalRate >= 65) {
        confidenceIndicator = 'MEDIUM'; // Upgraded from LOW because we have overall data
        recommendation = `Historical O2.5 rate: ${finalRate.toFixed(1)}%`;
      } else if (finalRate >= 50) {
        confidenceIndicator = 'LOW';
        recommendation = `Historical O2.5 rate: ${finalRate.toFixed(1)}%`;
      } else {
        confidenceIndicator = 'MEDIUM';
        recommendation = `Historical O2.5 rate: ${finalRate.toFixed(1)}%`;
      }
    } else {
      confidenceIndicator = 'LOW';
      recommendation = 'No historical data available';
    }
  }

  return {
    bucket_home: homeBucket,
    bucket_over25: over25Bucket,
    historical_over25_rate: Math.round(finalRate * 10) / 10,
    total_in_bucket: sampleSize,
    current_streak: currentStreak,
    streak_type: streakType,
    confidence_indicator: confidenceIndicator,
    recommendation,
    // Additional info for display
    _fallback_used: usedFallback,
    _exact_match_count: totalInBucket,
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
