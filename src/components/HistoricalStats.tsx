'use client';

import type { HistoricalStats as HistoricalStatsType } from '@/lib/types';

interface HistoricalStatsPanelProps {
  stats: HistoricalStatsType;
}

export default function HistoricalStatsPanel({ stats }: HistoricalStatsPanelProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
        <div className="text-sm opacity-80 mb-1">Total Matches</div>
        <div className="text-3xl font-bold">{stats.totalMatches.toLocaleString()}</div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
        <div className="text-sm opacity-80 mb-1">Avg Goals</div>
        <div className="text-3xl font-bold">{stats.avgGoals.toFixed(2)}</div>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
        <div className="text-sm opacity-80 mb-1">Over 1.5 Rate</div>
        <div className="text-3xl font-bold">{stats.over15Rate.toFixed(1)}%</div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
        <div className="text-sm opacity-80 mb-1">Over 2.5 Rate</div>
        <div className="text-3xl font-bold">{stats.over25Rate.toFixed(1)}%</div>
      </div>
    </div>
  );
}
