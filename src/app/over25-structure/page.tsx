'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { 
  BucketPerformance, 
  OddsPattern, 
  DayBlockPerformance, 
  UpcomingMatch,
  Over25Analysis,
  UpcomingMatchInput,
} from '@/lib/types';

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
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [overallStats, setOverallStats] = useState<{
    totalMatches: number;
    over25Hits: number;
    over25Rate: number;
    currentStreak: number;
    streakType: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state for new match input
  const [formData, setFormData] = useState<UpcomingMatchInput>({
    home_odd: 0,
    away_odd: 0,
    over25_odd: 0,
    under25_odd: 0,
    home_team: '',
    away_team: '',
    block_id: '',
  });
  const [analysisResult, setAnalysisResult] = useState<Over25Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/over25-analysis');
      const result = await response.json();
      
      if (result.success) {
        setHomeOddBuckets(result.data.homeOddBuckets);
        setOver25OddBuckets(result.data.over25OddBuckets);
        setPatterns(result.data.patterns);
        setDayPerformance(result.data.dayPerformance);
        setOverallStats(result.data.overallStats);
      }

      // Load upcoming matches
      const upcomingResponse = await fetch('/api/over25-analysis?action=upcoming');
      const upcomingResult = await upcomingResponse.json();
      if (upcomingResult.success) {
        setUpcomingMatches(upcomingResult.data);
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

  const handleAnalyzeMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/over25-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          data: formData,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAnalysisResult(result.data.analysis);
        loadData(); // Refresh data
      }
    } catch (error) {
      console.error('Error analyzing match:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearUpcoming = async () => {
    try {
      await fetch('/api/over25-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-upcoming' }),
      });
      setUpcomingMatches([]);
    } catch (error) {
      console.error('Error clearing upcoming matches:', error);
    }
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
            🎯 Over 2.5 Structure Analysis
          </h1>
          <Link 
            href="/" 
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
        {/* Overall Stats */}
        {overallStats && (
          <section className="mb-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">📊 Overall Statistics</h2>
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

        {/* Match Input Form */}
        <section className="mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">🔍 Analyze Upcoming Match</h2>
            <form onSubmit={handleAnalyzeMatch} className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Home Odd</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.home_odd || ''}
                  onChange={(e) => setFormData({ ...formData, home_odd: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 1.50"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Away Odd</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.away_odd || ''}
                  onChange={(e) => setFormData({ ...formData, away_odd: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2.50"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Over 2.5 Odd</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.over25_odd || ''}
                  onChange={(e) => setFormData({ ...formData, over25_odd: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 1.65"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Under 2.5 Odd</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.under25_odd || ''}
                  onChange={(e) => setFormData({ ...formData, under25_odd: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2.20"
                  required
                />
              </div>
              <div className="md:col-span-4 flex gap-4">
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-2 px-6 rounded-lg transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Match'}
                </button>
              </div>
            </form>

            {/* Analysis Result */}
            {analysisResult && (
              <div className="mt-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600">
                <h3 className="text-lg font-bold text-white mb-3">📈 Analysis Result</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-slate-400 text-sm">Home Odd Bucket</div>
                    <div className="text-white font-bold">{analysisResult.bucket_home}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-sm">Over 2.5 Odd Bucket</div>
                    <div className="text-white font-bold">{analysisResult.bucket_over25}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-sm">Historical Over 2.5 Rate</div>
                    <div className={`font-bold ${analysisResult.historical_over25_rate >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {analysisResult.historical_over25_rate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-sm">Matches in Bucket</div>
                    <div className="text-white font-bold">{analysisResult.total_in_bucket}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-sm">Current Streak</div>
                    <div className="text-white font-bold">{analysisResult.current_streak} {analysisResult.streak_type}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-sm">Confidence</div>
                    <div className={`font-bold ${
                      analysisResult.confidence_indicator === 'HIGH' ? 'text-green-400' :
                      analysisResult.confidence_indicator === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {analysisResult.confidence_indicator}
                    </div>
                  </div>
                  {analysisResult.recommendation && (
                    <div className="md:col-span-2">
                      <div className="text-slate-400 text-sm">Recommendation</div>
                      <div className="text-white font-bold">{analysisResult.recommendation}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {isLoading ? (
          <div className="animate-pulse space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-700 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
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

            {/* Upcoming Matches */}
            {upcomingMatches.length > 0 && (
              <section className="mb-8">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">🎯 Analyzed Matches</h2>
                    <button
                      onClick={handleClearUpcoming}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-600">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Home Odd</th>
                          <th className="text-left py-2">Over 2.5 Odd</th>
                          <th className="text-right py-2">Historical %</th>
                          <th className="text-right py-2">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingMatches.map((match, i) => (
                          <tr key={i} className="border-b border-slate-700/50">
                            <td className="py-2 text-white">{match.match_date}</td>
                            <td className="py-2 text-white">{match.home_odd}</td>
                            <td className="py-2 text-white">{match.over25_odd}</td>
                            <td className={`py-2 text-right font-bold ${(match.historical_over25_rate || 0) >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                              {match.historical_over25_rate?.toFixed(1) || '-'}%
                            </td>
                            <td className={`py-2 text-right font-bold ${
                              match.confidence_indicator === 'HIGH' ? 'text-green-400' :
                              match.confidence_indicator === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {match.confidence_indicator}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <style jsx global>{`
        @keyframes matrixFallDown {
          0% { transform: translateY(-20px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        
        .matrix-char {
          animation: matrixFlicker 0.15s ease-in-out infinite;
        }
        
        @keyframes matrixFlicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
