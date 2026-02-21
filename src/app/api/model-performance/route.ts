import { NextResponse } from 'next/server';
import { getPerformanceMetrics, getPredictions, linkResultsToPredictions } from '@/lib/supabase';

export async function GET() {
  try {
    const metrics = await getPerformanceMetrics();
    
    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error in /api/model-performance:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch performance metrics',
        data: null 
      },
      { status: 500 }
    );
  }
}

// POST to trigger result linking
export async function POST() {
  try {
    const result = await linkResultsToPredictions();
    
    return NextResponse.json({
      success: result.success,
      updated: result.updated,
      error: result.error,
    });
  } catch (error) {
    console.error('Error linking results:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to link results to predictions',
        updated: 0,
      },
      { status: 500 }
    );
  }
}
