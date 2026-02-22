import { NextRequest, NextResponse } from 'next/server';
import { 
  getOver25Results, 
  insertOver25Prediction,
  getOver25Predictions,
  clearOver25Odds,
  insertOver25Odds,
  getAllOdds,
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

    if (action === 'predictions') {
      const predictionsData = await getOver25Predictions();
      return NextResponse.json({ success: true, data: predictionsData });
    }

    if (action === 'odds') {
      const odds = await getAllOdds();
      return NextResponse.json({ success: true, data: odds });
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

      return NextResponse.json({
        success: true,
        data: {
          input,
          analysis,
        },
      });
    }

    if (action === 'store-prediction') {
      // Store a prediction with analysis
      const result = await insertOver25Prediction(data);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: result.data });
    }

    if (action === 'store-odds') {
      // Store odds for Over 2.5
      const result = await insertOver25Odds(data);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'clear-odds') {
      const result = await clearOver25Odds();
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
