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

    if (action === 'store-bulk-predictions') {
      // Store multiple predictions at once
      const predictions = body.predictions;
      
      if (!Array.isArray(predictions) || predictions.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No predictions provided' },
          { status: 400 }
        );
      }

      let successCount = 0;
      const errors: string[] = [];

      for (const pred of predictions) {
        const result = await insertOver25Prediction({
          match_date: pred.match_date,
          match_time: pred.match_time,
          home_team: pred.home_team,
          away_team: pred.away_team,
          home_odd: pred.home_odd,
          away_odd: pred.away_odd,
          over25_odd: pred.over25_odd,
          under25_odd: pred.under25_odd,
          bucket_home: pred.bucket_home,
          bucket_over25: pred.bucket_over25,
          historical_over25_rate: pred.historical_over25_rate,
          total_in_bucket: pred.total_in_bucket,
          current_streak: pred.current_streak,
          streak_type: pred.streak_type,
          confidence_indicator: pred.confidence_indicator,
          recommendation: pred.recommendation,
        });

        if (result.success) {
          successCount++;
        } else {
          errors.push(`${pred.home_team} vs ${pred.away_team}: ${result.error}`);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          total: predictions.length,
          stored: successCount,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
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
