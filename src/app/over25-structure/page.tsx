'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { 
  BucketPerformance, 
  OddsPattern, 
  DayBlockPerformance, 
  Over25Analysis,
  Over25Result,
  PredictionRecord,
  ParsedOver25Odds,
} from '@/lib/types';
import { 
  getOver25Results, 
  getOver25Predictions,
} from '@/lib/supabase';
import { analyzeUpcomingMatch } from '@/lib/over25-analysis';
import Over25OddsInput from '@/components/Over25OddsInput';

// Matrix characters for edges
const matrixChars = '01アイウエオカキクケコ';
const getRandomChar = () => matrixChars[Math.floor(Math.random() * matrixChars.length)];

const matrixRainElements = Array.from({ length: 40 }, (_, i) => ({
  position: 'top' as const,
  left: `${(i * 2.5)}%`,
  speed: 0.8 + Math.random() * 0.6,
  delay: Math.random() * 2,
  char: getRandomChar(),
}));

export default function Over25StructurePage() {
  const [homeOddBuckets, setHomeOddBuckets] = useState<BucketPerformance[]>([]);
  const [over25OddBuckets, setOver25OddBuckets] = useState<BucketPerformance[]>([]);
  const [patterns, setPatterns] = useState<OddsPattern[]>([]);
  const [dayPerformance, setDayPerformance] = useState<DayBlockPerformance[]>([]);
  const [overallStats, setOverallStats] = useState<{
    totalMatches: number;
    over25Hits: number;
    over25Rate: number;
    currentStreak: number;
    streakType: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Shared data from Over 1.5 dashboard (results)
  const [results, setResults] = useState<Over25Result[]>([]);
  
  // Over 2.5 predictions
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  
  // Performance tracking
  const [performanceStats, setPerformanceStats] = useState<{
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    currentStreak: number;
    streakType: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load analysis data from API
      const response = await fetch('/api/over25-analysis');
      const result = await response.json();
      
      if (result.success) {
        setHomeOddBuckets(result.data.homeOddBuckets);
        setOver25OddBuckets(result.data.over25OddBuckets);
        setPatterns(result.data.patterns);
        setDayPerformance(result.data.dayPerformance);
        setOverallStats(result.data.overallStats);
        setResults(result.data.results);
      }

      // Load Over 2.5 predictions
      const predictionsResponse = await fetch('/api/over25-analysis?action=predictions');
      const predictionsResult = await predictionsResponse.json();
      if (predictionsResult.success) {
        setPredictions(predictionsResult.data.predictions);
        setPerformanceStats(predictionsResult.data.performance);
      }
    } catch (error) {
      console.error('Error loading Over 2.5 data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOddsSubmitted = (newPredictions: Over25Analysis[]) => {
    // Reload data to show updated predictions
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Matrix Rain Effect */}
      {matrixRainElements.map((el, i) => (
        <div
          key={`matrix-${i}`}
          className="fixed pointer-events-none z-50 matrix-rain-container"
          style={{
            top: '0',
            left: el.left,
            animation: `matrixFallDown ${el.speed}s linear infinite`,
            animationDelay: `${el.delay}s`,
          }}
        >
          <span className="matrix-char" style={{
            color: '#00ff41',
            textShadow: '0 0 8px #00ff41, 0 0 15px #00ff41',
            fontSize: '10px',
            fontFamily: "'Courier New', monospace",
          }}>
            {el.char}
          </span>
        </div>
      ))}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-[length:200%_100%] animate-gradient py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">
            🎯 Over 2.5 Prediction Dashboard
          </h1>
          <Link 
            href="/" 
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back to Over 1.5
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
        {/* Performance Stats */}
        {performanceStats && (
          <section className="mb-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">📈 Prediction Performance</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-white">{performanceStats.totalPredictions}</div>
                  <div className="text-slate-400 text-sm">Total Predictions</div>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">{performanceStats.correctPredictions}</div>
                  <div className="text-slate-400 text-sm">Correct</div>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">{performanceStats.accuracy.toFixed(1)}%</div>
                  <div className="text-slate-400 text-sm">Accuracy</div>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-400">{performanceStats.currentStreak}</div>
                  <div className="text-slate-400 text-sm">Current Streak</div>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <div className={`text-3xl font-bold ${performanceStats.streakType === 'over' ? 'text-green-400' : 'text-red-400'}`}>
                    {performanceStats.streakType.toUpperCase()}
                  </div>
                  <div className="text-slate-400 text-sm">Streak Type</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Bulk Odds Input Section */}
        <section className="mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">📝 Bulk Odds Input (Tab-Separated)</h2>
            <p className="text-slate-400 text-sm mb-4">
              Paste multiple matches at once. Format: Date, Time, Home, Away, HomeOdd, AwayOdd, Over2.5, Under2.5
            </p>
            <Over25OddsInput 
              results={results} 
              onOddsSubmitted={handleOddsSubmitted}
            />
          </div>
        </section>

        {/* Active Predictions */}
        {predictions.length > 0 && (
          <section className="mb-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">🎯 Active Predictions</h2>
              
              {/* Sort predictions and highlight top pick */}
              {(() => {
                const sortedPredictions = [...predictions].sort((a, b) => {
                  const confidenceOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
                  const confA = confidenceOrder[a.confidence_indicator as keyof typeof confidenceOrder] ?? 3;
                  const confB = confidenceOrder[b.confidence_indicator as keyof typeof confidenceOrder] ?? 3;
                  if (confA !== confB) return confA - confB;
                  return (b.historical_over25_rate || 0) - (a.historical_over25_rate || 0);
                });
                
                const topPick = sortedPredictions[0];
                const hasHighConfidence = sortedPredictions.some(p => p.confidence_indicator === 'HIGH');
                const hasMediumConfidence = sortedPredictions.some(p => p.confidence_indicator === 'MEDIUM');
                
                return (
                  <>
                    {/* TOP PICK HIGHLIGHT */}
                    {topPick && topPick.confidence_indicator !== 'LOW' && (
                      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-1 rounded-xl shadow-lg animate-pulse-slow mb-4">
                        <div className="bg-slate-900 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-3xl">🎯</span>
                              <span className="text-xl font-bold text-pink-400 animate-pulse">
                                TOP PICK - BET ON THIS MATCH!
                              </span>
                              <span className="text-3xl">🎯</span>
                            </div>
                            <span className={`px-4 py-2 rounded-full text-lg font-bold ${
                              topPick.confidence_indicator === 'HIGH' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500' 
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500'
                            }`}>
                              {topPick.confidence_indicator} CONFIDENCE
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-white">
                            <span className="text-2xl font-bold">{topPick.match_time || '-'}</span>
                            <span className="text-slate-400">{topPick.match_date || '-'}</span>
                            <span className="text-xl font-semibold">
                              {topPick.home_team} vs {topPick.away_team}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-4 gap-4">
                            <div className="bg-slate-800 rounded-lg p-3 text-center">
                              <div className="text-slate-400 text-xs">Over 2.5 Rate</div>
                              <div className="text-2xl font-bold text-green-400">
                                {topPick.historical_over25_rate?.toFixed(1) || '0'}%
                              </div>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3 text-center">
                              <div className="text-slate-400 text-xs">Sample Size</div>
                              <div className="text-2xl font-bold text-blue-400">
                                {topPick.total_in_bucket || 0}
                              </div>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3 text-center">
                              <div className="text-slate-400 text-xs">Over 2.5 Odd</div>
                              <div className="text-2xl font-bold text-purple-400">
                                {topPick.over_odd?.toFixed(2) || '-'}
                              </div>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3 text-center">
                              <div className="text-slate-400 text-xs">Recommendation</div>
                              <div className="text-lg font-bold text-yellow-400">
                                {topPick.recommendation || '-'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Summary Stats */}
                    <div className="bg-slate-700/50 rounded-xl p-4 flex items-center justify-between mb-4">
                      <div className="flex items-center gap-6">
                        <div className="text-white">
                          <span className="text-slate-400">Total Predictions:</span>
                          <span className="ml-2 font-bold">{predictions.length}</span>
                        </div>
                        {hasHighConfidence && (
                          <div className="text-green-400">
                            <span className="text-slate-400">HIGH:</span>
                            <span className="ml-2 font-bold">{sortedPredictions.filter(p => p.confidence_indicator === 'HIGH').length}</span>
                          </div>
                        )}
                        {hasMediumConfidence && (
                          <div className="text-yellow-400">
                            <span className="text-slate-400">MEDIUM:</span>
                            <span className="ml-2 font-bold">{sortedPredictions.filter(p => p.confidence_indicator === 'MEDIUM').length}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-slate-400 text-sm">
                        Sorted by confidence (best first)
                      </div>
                    </div>

                    {/* Full Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-600">
                            <th className="text-left py-2">Date/Time</th>
                            <th className="text-left py-2">Match</th>
                            <th className="text-center py-2">Odds</th>
                            <th className="text-center py-2">Bucket</th>
                            <th className="text-center py-2">Hist. Rate</th>
                            <th className="text-center py-2">Confidence</th>
                            <th className="text-center py-2">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedPredictions.map((pred, i) => (
                            <tr key={i} className={`border-b border-slate-700/50 ${
                              i === 0 && pred.confidence_indicator !== 'LOW' ? 'bg-green-900/20' : ''
                            }`}>
                              <td className="py-3 text-white">
                                <div>{pred.match_date || '-'}</div>
                                <div className="text-slate-400 text-xs">{pred.match_time || '-'}</div>
                              </td>
                              <td className="py-3 text-white">
                                <div className="font-medium">
                                  {i === 0 && pred.confidence_indicator !== 'LOW' && <span className="text-yellow-400 mr-1">🔥</span>}
                                  {pred.home_team} vs {pred.away_team}
                                </div>
                              </td>
                              <td className="py-3 text-center">
                                <div className="text-slate-300">
                                  H: {pred.home_odd?.toFixed(2)} | A: {pred.away_odd?.toFixed(2)}
                                </div>
                                <div className="text-blue-400 text-xs">
                                  O2.5: {pred.over_odd?.toFixed(2)}
                                </div>
                              </td>
                              <td className="py-3 text-center text-slate-300">
                                <div>{pred.bucket_home || '-'}</div>
                                <div className="text-xs text-blue-400">{pred.bucket_over25 || '-'}</div>
                              </td>
                              <td className="py-3 text-center">
                                <span className={`font-bold ${(pred.historical_over25_rate || 0) >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {pred.historical_over25_rate?.toFixed(1) || '-'}%
                                </span>
                                <div className="text-slate-400 text-xs">({pred.total_in_bucket || 0} matches)</div>
                              </td>
                              <td className="py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  pred.confidence_indicator === 'HIGH' ? 'bg-green-500/20 text-green-400' :
                                  pred.confidence_indicator === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {pred.confidence_indicator || 'LOW'}
                                </span>
                              </td>
                              <td className="py-3 text-center">
                                {pred.final_result_over25 !== null && pred.final_result_over25 !== undefined ? (
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${pred.final_result_over25 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {pred.final_result_over25 ? 'OVER' : 'UNDER'}
                                    {pred.is_correct !== null && pred.is_correct !== undefined && (
                                      <span className="ml-1">{pred.is_correct ? '✓' : '✗'}</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-xs">Pending</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="animate-pulse space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-700 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            {overallStats && (
              <section className="mb-8">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h2 className="text-2xl font-bold text-white mb-4">📊 Historical Statistics (From Dashboard 1)</h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-white">{overallStats.totalMatches}</div>
                      <div className="text-slate-400 text-sm">Total Matches</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-green-400">{overallStats.over25Hits}</div>
                      <div className="text-slate-400 text-sm">Over 2.5 Hits</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-blue-400">{overallStats.over25Rate.toFixed(1)}%</div>
                      <div className="text-slate-400 text-sm">Over 2.5 Rate</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-yellow-400">{overallStats.currentStreak}</div>
                      <div className="text-slate-400 text-sm">Current Streak</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                      <div className={`text-3xl font-bold ${overallStats.streakType === 'over' ? 'text-green-400' : 'text-red-400'}`}>
                        {overallStats.streakType.toUpperCase()}
                      </div>
                      <div className="text-slate-400 text-sm">Streak Type</div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Bucket Performance Tables */}
            <section className="mb-8">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Home Odd Buckets */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h2 className="text-xl font-bold text-white mb-4">🏠 Home Odd Buckets</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-600">
                          <th className="text-left py-2">Bucket</th>
                          <th className="text-right py-2">Matches</th>
                          <th className="text-right py-2">Over 2.5%</th>
                          <th className="text-right py-2">Streak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {homeOddBuckets.map((bucket, i) => (
                          <tr key={i} className="border-b border-slate-700/50">
                            <td className="py-2 text-white">{bucket.bucket_range}</td>
                            <td className="py-2 text-right text-slate-300">{bucket.total_matches}</td>
                            <td className={`py-2 text-right font-bold ${bucket.over25_rate >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                              {bucket.over25_rate.toFixed(1)}%
                            </td>
                            <td className="py-2 text-right text-slate-300">
                              {bucket.current_streak} {bucket.streak_type}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Over 2.5 Odd Buckets */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h2 className="text-xl font-bold text-white mb-4">⚽ Over 2.5 Odd Buckets</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-600">
                          <th className="text-left py-2">Bucket</th>
                          <th className="text-right py-2">Matches</th>
                          <th className="text-right py-2">Over 2.5%</th>
                          <th className="text-right py-2">Streak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {over25OddBuckets.map((bucket, i) => (
                          <tr key={i} className="border-b border-slate-700/50">
                            <td className="py-2 text-white">{bucket.bucket_range}</td>
                            <td className="py-2 text-right text-slate-300">{bucket.total_matches}</td>
                            <td className={`py-2 text-right font-bold ${bucket.over25_rate >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                              {bucket.over25_rate.toFixed(1)}%
                            </td>
                            <td className="py-2 text-right text-slate-300">
                              {bucket.current_streak} {bucket.streak_type}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* Odds Patterns */}
            <section className="mb-8">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">🔄 Odds Patterns (Home + Over 2.5)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-600">
                        <th className="text-left py-2">Home Odd</th>
                        <th className="text-left py-2">Over 2.5 Odd</th>
                        <th className="text-right py-2">Matches</th>
                        <th className="text-right py-2">Over 2.5%</th>
                        <th className="text-right py-2">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patterns.slice(0, 20).map((pattern, i) => (
                        <tr key={i} className="border-b border-slate-700/50">
                          <td className="py-2 text-white">{pattern.home_odd_range}</td>
                          <td className="py-2 text-white">{pattern.over25_odd_range}</td>
                          <td className="py-2 text-right text-slate-300">{pattern.total_matches}</td>
                          <td className={`py-2 text-right font-bold ${pattern.over25_rate >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {pattern.over25_rate.toFixed(1)}%
                          </td>
                          <td className="py-2 text-right text-slate-400">{pattern.last_seen}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Day Performance */}
            <section className="mb-8">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">📅 Daily Performance</h2>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-800">
                      <tr className="text-slate-400 border-b border-slate-600">
                        <th className="text-left py-2">Date</th>
                        <th className="text-right py-2">Matches</th>
                        <th className="text-right py-2">Over 2.5 Hits</th>
                        <th className="text-right py-2">Over 2.5%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayPerformance.slice(0, 30).map((day, i) => (
                        <tr key={i} className="border-b border-slate-700/50">
                          <td className="py-2 text-white">{day.date}</td>
                          <td className="py-2 text-right text-slate-300">{day.total_matches}</td>
                          <td className="py-2 text-right text-green-400">{day.over25_hits}</td>
                          <td className={`py-2 text-right font-bold ${day.over25_rate >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {day.over25_rate.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="text-slate-400 text-sm">
            📊 Data from Dashboard 1: {results.length} results loaded
          </div>
          <div className="text-slate-400 text-sm">
            🎯 Over 2.5 Predictions: {predictions.length} active
          </div>
        </div>
      </footer>
    </div>
  );
}
