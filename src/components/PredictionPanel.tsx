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

  return (
    <div className="space-y-4">
      {predictions.map((prediction, index) => (
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
                  prediction.prediction === 'OVER 1.5' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {prediction.prediction}
                </div>
              </div>
            </div>

            {/* Confidence Bar */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Confidence</span>
                  <span className="font-bold">{prediction.confidence}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      prediction.confidence >= 75
                        ? 'bg-green-500'
                        : prediction.confidence >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${prediction.confidence}%` }}
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
