'use client';

import type { Prediction } from '@/lib/types';

interface PredictionPanelProps {
  predictions: Prediction[];
}

function getStatusColor(status: Prediction['status']) {
  switch (status) {
    case 'SAFE':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'MODERATE':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'RISKY':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getStatusIcon(status: Prediction['status']) {
  switch (status) {
    case 'SAFE':
      return '🛡️';
    case 'MODERATE':
      return '⚠️';
    case 'RISKY':
      return '🚫';
    default:
      return '❓';
  }
}

// Sort predictions by confidence (SAFE first, then MODERATE, then RISKY)
function sortPredictionsByConfidence(predictions: Prediction[]): Prediction[] {
  const statusOrder = { 'SAFE': 0, 'MODERATE': 1, 'RISKY': 2 };
  return [...predictions].sort((a, b) => {
    // First sort by status
    const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    if (statusDiff !== 0) return statusDiff;
    // Then by confidence (higher first)
    return (b.calibrated_probability || b.confidence) - (a.calibrated_probability || a.confidence);
  });
}

export default function PredictionPanel({ predictions }: PredictionPanelProps) {
  if (predictions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="text-5xl mb-4">📊</div>
        <div className="text-gray-500 text-lg">No predictions yet</div>
        <div className="text-gray-400 text-sm mt-2">
          Upload results and paste odds to generate predictions
        </div>
      </div>
    );
  }

  // Sort predictions by confidence
  const sortedPredictions = sortPredictionsByConfidence(predictions);
  
  // Get the top pick (first SAFE prediction, or first MODERATE if no SAFE)
  const topPick = sortedPredictions[0];
  const isTopPickSafe = topPick?.status === 'SAFE';
  const hasSafePicks = sortedPredictions.some(p => p.status === 'SAFE');
  const hasModeratePicks = sortedPredictions.some(p => p.status === 'MODERATE');

  return (
    <div className="space-y-4">
      {/* TOP PICK HIGHLIGHT */}
      {topPick && topPick.status !== 'RISKY' && (
        <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 p-1 rounded-xl shadow-lg animate-pulse-slow">
          <div className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🔥</span>
                <span className="text-xl font-bold text-yellow-400 animate-pulse">
                  TOP PICK - BET ON THIS MATCH!
                </span>
                <span className="text-3xl">🔥</span>
              </div>
              <span className={`px-4 py-2 rounded-full text-lg font-bold border ${getStatusColor(topPick.status)}`}>
                {getStatusIcon(topPick.status)} {topPick.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-white">
              <span className="text-2xl font-bold">{topPick.match.block_time}</span>
              {topPick.match.match_date && (
                <span className="text-slate-400">{topPick.match.match_date}</span>
              )}
              <span className="text-xl font-semibold">
                {topPick.match.home_team} vs {topPick.match.away_team}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-lg p-3 text-center">
                <div className="text-slate-400 text-xs">Over 1.5 Rate</div>
                <div className="text-2xl font-bold text-green-400">
                  {topPick.historicalStats.over15Rate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 text-center">
                <div className="text-slate-400 text-xs">Confidence</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {topPick.calibrated_probability || topPick.confidence}%
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 text-center">
                <div className="text-slate-400 text-xs">Over Odd</div>
                <div className="text-2xl font-bold text-blue-400">
                  {topPick.match.over_odd.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-slate-700/50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-white">
            <span className="text-slate-400">Total Matches:</span>
            <span className="ml-2 font-bold">{predictions.length}</span>
          </div>
          {hasSafePicks && (
            <div className="text-green-400">
              <span className="text-slate-400">SAFE:</span>
              <span className="ml-2 font-bold">{sortedPredictions.filter(p => p.status === 'SAFE').length}</span>
            </div>
          )}
          {hasModeratePicks && (
            <div className="text-yellow-400">
              <span className="text-slate-400">MODERATE:</span>
              <span className="ml-2 font-bold">{sortedPredictions.filter(p => p.status === 'MODERATE').length}</span>
            </div>
          )}
        </div>
        <div className="text-slate-400 text-sm">
          Sorted by confidence (best first)
        </div>
      </div>

      {sortedPredictions.map((prediction, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-700">
                  {prediction.match.block_time}
                </span>
                {prediction.match.match_date && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span className="text-sm text-gray-500">
                      {prediction.match.match_date}
                    </span>
                  </>
                )}
                <span className="text-gray-400">|</span>
                <span className="text-lg font-semibold text-gray-800">
                  {prediction.match.home_team} vs {prediction.match.away_team}
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(prediction.status)}`}
              >
                {getStatusIcon(prediction.status)} {prediction.status}
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase">Historical Avg Goals</div>
                <div className="text-xl font-bold text-gray-800">
                  {prediction.historicalStats.totalMatches > 0
                    ? prediction.historicalStats.avgGoals.toFixed(2)
                    : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase">Over 1.5 Hit Rate</div>
                <div className="text-xl font-bold text-gray-800">
                  {prediction.historicalStats.totalMatches > 0
                    ? `${prediction.historicalStats.over15Rate.toFixed(1)}%`
                    : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase">Sample Size</div>
                <div className="text-xl font-bold text-gray-800">
                  {prediction.historicalStats.totalMatches} matches
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase">Team Over 1.5 Rate</div>
                <div className="text-xl font-bold text-gray-800">
                  {prediction.teamStats.over15Rate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase">Prediction</div>
                <div className={`text-xl font-bold ${
                  prediction.prediction.includes('OVER') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {prediction.prediction}
                </div>
              </div>
              {/* Show calibrated probability if available */}
              {prediction.calibrated_probability && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-500 uppercase">Calibrated Prob.</div>
                  <div className="text-xl font-bold text-blue-800">
                    {prediction.calibrated_probability.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>

            {/* Confidence Bar */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">
                    Confidence {prediction.calibration_applied ? '(Calibrated)' : ''}
                  </span>
                  <span className="font-bold">
                    {prediction.calibrated_probability || prediction.confidence}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (prediction.calibrated_probability || prediction.confidence) >= 75
                        ? 'bg-green-500'
                        : (prediction.calibrated_probability || prediction.confidence) >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${prediction.calibrated_probability || prediction.confidence}%` }}
                  />
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                Odds: {prediction.match.over_odd.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
