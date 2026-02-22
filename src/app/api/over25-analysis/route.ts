import { NextRequest, NextResponse } from 'next/server';
import { 
  getOver25Results, 
  insertUpcomingMatch, 
  getUpcomingMatches,
  clearUpcomingMatches,
} from '@/lib/supabase';
import { 
  analyzeUpcomingMatch, 
  calculateBucketStats, 
  calculatePatternStats,
  calculateDayBlockPerformance,
  getOverallOver25Stats,
} from '@/lib/over25-analysis';
import type { UpcomingMatchInput } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // Get all Over 2.5 results
    const results = await getOver25Results();

    if (action === 'bucket-stats') {
      const bucketType = searchParams.get('type') as 'home_odd' | 'over25_odd' || 'home_odd';
      const bucketStats = calculateBucketStats(results, bucketType);
      return NextResponse.json({ success: true, data: bucketStats });
    }

    if (action === 'patterns') {
      const patterns = calculatePatternStats(results);
      return NextResponse.json({ success: true, data: patterns });
    }

    if (action === 'day-performance') {
      const dayPerf = calculateDayBlockPerformance(results, 'day');
      return NextResponse.json({ success: true, data: dayPerf });
    }

    if (action === 'block-performance') {
      const blockPerf = calculateDayBlockPerformance(results, 'block');
      return NextResponse.json({ success: true, data: blockPerf });
    }

    if (action === 'overall') {
      const overallStats = getOverallOver25Stats(results);
      return NextResponse.json({ success: true, data: overallStats });
    }

    if (action === 'upcoming') {
      const upcoming = await getUpcomingMatches();
      return NextResponse.json({ success: true, data: upcoming });
    }

    // Default: return all data
    const homeOddBuckets = calculateBucketStats(results, 'home_odd');
    const over25OddBuckets = calculateBucketStats(results, 'over25_odd');
    const patterns = calculatePatternStats(results);
    const dayPerformance = calculateDayBlockPerformance(results, 'day');
    const overallStats = getOverallOver25Stats(results);

    return NextResponse.json({
      success: true,
      data: {
        results,
        homeOddBuckets,
        over25OddBuckets,
        patterns,
        dayPerformance,
        overallStats,
      },
    });
  } catch (error) {
    console.error('Error in Over 2.5 analysis API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Over 2.5 analysis data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'analyze') {
      // Analyze an upcoming match
      const input: UpcomingMatchInput = data;
      
      if (!input.home_odd || !input.away_odd || !input.over25_odd || !input.under25_odd) {
        return NextResponse.json(
          { success: false, error: 'Missing required odds data' },
          { status: 400 }
        );
      }

      const results = await getOver25Results();
      const analysis = analyzeUpcomingMatch(input, results);

      // Store the upcoming match with analysis
      const insertResult = await insertUpcomingMatch({
        match_date: input.match_date || new Date().toISOString().split('T')[0],
        block_id: input.block_id,
        home_team: input.home_team,
        away_team: input.away_team,
        home_odd: input.home_odd,
        away_odd: input.away_odd,
        over25_odd: input.over25_odd,
        under25_odd: input.under25_odd,
        bucket_home: analysis.bucket_home,
        bucket_over25: analysis.bucket_over25,
        historical_over25_rate: analysis.historical_over25_rate,
        total_in_bucket: analysis.total_in_bucket,
        current_streak: analysis.current_streak,
        streak_type: analysis.streak_type,
        confidence_indicator: analysis.confidence_indicator,
      });

      if (!insertResult.success) {
        console.error('Failed to store upcoming match:', insertResult.error);
      }

      return NextResponse.json({
        success: true,
        data: {
          input,
          analysis,
        },
      });
    }

    if (action === 'clear-upcoming') {
      const result = await clearUpcomingMatches();
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in Over 2.5 analysis API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process Over 2.5 analysis request' },
      { status: 500 }
    );
  }
}
