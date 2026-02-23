'use client';

import { useState } from 'react';
import { analyzeUpcomingMatch } from '@/lib/over25-analysis';
import type { Over25Result, Over25Analysis, ParsedOver25Odds } from '@/lib/types';

// Check if a team name is valid (must contain at least one letter)
function isValidTeamName(name: string): boolean {
  return /[a-zA-Z]/.test(name);
}

interface Over25OddsInputProps {
  results: Over25Result[];
  onOddsSubmitted: (predictions: Over25Analysis[]) => void;
}

// Parse bulk odds input (tab-separated)
function parseOver25OddsInput(input: string): { valid: boolean; data?: ParsedOver25Odds[]; error?: string } {
  const lines = input.trim().split('\n');
  
  if (lines.length < 2) {
    return { valid: false, error: 'No data rows found. Please include header and at least one data row.' };
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const parsedOdds: ParsedOver25Odds[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const parts = line.split('\t');
    
    // Format: Date, Time, Home, Away, HomeOdd, AwayOdd, Over25, Under25 (8 columns)
    if (parts.length < 8) {
      return { valid: false, error: `Line ${i + 2}: Expected 8 columns, got ${parts.length}. Format: Date, Time, Home, Away, HomeOdd, AwayOdd, Over25, Under25` };
    }
    
    const dateCol = parts[0].trim();
    const timeCol = parts[1].trim();
    const homeTeam = parts[2].trim();
    const awayTeam = parts[3].trim();
    const homeOdd = parseFloat(parts[4]);
    const awayOdd = parseFloat(parts[5]);
    const over25Odd = parseFloat(parts[6]);
    const under25Odd = parseFloat(parts[7]);

    if (isNaN(homeOdd) || isNaN(awayOdd) || isNaN(over25Odd) || isNaN(under25Odd)) {
      return { valid: false, error: `Line ${i + 2}: Invalid numeric values for odds` };
    }

    if (!homeTeam || !awayTeam) {
      return { valid: false, error: `Line ${i + 2}: Missing team names` };
    }

    // Validate team names - must contain at least one letter
    if (!isValidTeamName(homeTeam)) {
      return { valid: false, error: `Line ${i + 2}: Invalid home team name "${homeTeam}" - team names must contain letters` };
    }
    if (!isValidTeamName(awayTeam)) {
      return { valid: false, error: `Line ${i + 2}: Invalid away team name "${awayTeam}" - team names must contain letters` };
    }

    // Parse date to ISO format (DD/MM/YYYY -> YYYY-MM-DD)
    let matchDate: string | undefined;
    if (dateCol) {
      const dateParts = dateCol.split('/');
      if (dateParts.length === 3) {
        const day = dateParts[0].padStart(2, '0');
        const month = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        matchDate = `${year}-${month}-${day}`;
      }
    }

    parsedOdds.push({
      match_date: matchDate || new Date().toISOString().split('T')[0],
      match_time: timeCol,
      home_team: homeTeam,
      away_team: awayTeam,
      home_odd: homeOdd,
      away_odd: awayOdd,
      over25_odd: over25Odd,
      under25_odd: under25Odd,
    });
  }

  if (parsedOdds.length === 0) {
    return { valid: false, error: 'No valid data rows found' };
  }

  return { valid: true, data: parsedOdds };
}

export default function Over25OddsInput({ results, onOddsSubmitted }: Over25OddsInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [instantPredictions, setInstantPredictions] = useState<(ParsedOver25Odds & Over25Analysis)[]>([]);

  const handleSubmit = async () => {
    if (!input.trim()) {
      setMessage({ type: 'error', text: 'Please paste odds data first' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const parsed = parseOver25OddsInput(input);

    if (!parsed.valid || !parsed.data) {
      setMessage({ type: 'error', text: parsed.error || 'Failed to parse odds' });
      setIsLoading(false);
      return;
    }

    // Analyze each match and create predictions
    const predictions: (ParsedOver25Odds & Over25Analysis)[] = [];
    
    for (const odds of parsed.data) {
      const analysis = analyzeUpcomingMatch(
        {
          home_odd: odds.home_odd,
          away_odd: odds.away_odd,
          over25_odd: odds.over25_odd,
          under25_odd: odds.under25_odd,
          home_team: odds.home_team,
          away_team: odds.away_team,
          match_date: odds.match_date,
        },
        results
      );
      
      predictions.push({
        ...odds,
        ...analysis,
      });
    }

    // Store predictions in database
    try {
      const response = await fetch('/api/over25-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store-bulk-predictions',
          predictions: predictions,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setInstantPredictions(predictions);
        setMessage({ type: 'success', text: `Successfully analyzed ${predictions.length} matches! Predictions stored.` });
        setInput('');
        onOddsSubmitted(predictions);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to store predictions' });
      }
    } catch (error) {
      console.error('Error storing predictions:', error);
      setMessage({ type: 'error', text: 'Failed to store predictions' });
    }

    setIsLoading(false);
  };

  const handleClear = () => {
    setInput('');
    setMessage(null);
    setInstantPredictions([]);
  };

  // Sample data format
  const sampleData = `Date\tTime\tHome\tAway\tHomeOdd\tAwayOdd\tOver25\tUnder25
26/01/2026\t05:36\tFCA\tHDH\t2.51\t2.93\t1.65\t2.20
26/01/2026\t06:00\tBMG\tRBL\t1.85\t3.50\t1.55\t2.40`;

  const loadSample = () => {
    setInput(sampleData);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-2">
        <button
          onClick={loadSample}
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          Load Sample
        </button>
      </div>
      
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste tab-separated odds here...&#10;&#10;Format:&#10;Date\tTime\tHome\tAway\tHomeOdd\tAwayOdd\tOver25\tUnder25&#10;26/01/2026\t05:36\tFCA\tHDH\t2.51\t2.93\t1.65\t2.20"
        className="w-full h-48 p-4 bg-slate-700 text-white border border-slate-600 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y"
      />

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Analyzing...' : '📊 Analyze & Predict'}
        </button>
        
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="px-6 py-3 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : 'bg-red-900/50 text-red-300 border border-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Instant Predictions Output */}
      {instantPredictions.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Sort predictions by confidence */}
          {(() => {
            const sortedPredictions = [...instantPredictions].sort((a, b) => {
              const confidenceOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
              const confDiff = (confidenceOrder[a.confidence_indicator] ?? 3) - (confidenceOrder[b.confidence_indicator] ?? 3);
              if (confDiff !== 0) return confDiff;
              return (b.historical_over25_rate || 0) - (a.historical_over25_rate || 0);
            });
            
            const topPick = sortedPredictions[0];
            const hasHighConfidence = sortedPredictions.some(p => p.confidence_indicator === 'HIGH');
            const hasMediumConfidence = sortedPredictions.some(p => p.confidence_indicator === 'MEDIUM');
            
            return (
              <>
                {/* TOP PICK HIGHLIGHT for Over 2.5 */}
                {topPick && topPick.confidence_indicator !== 'LOW' && (
                  <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-1 rounded-xl shadow-lg animate-pulse-slow">
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
                            {topPick.over25_odd?.toFixed(2) || '-'}
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
                <div className="bg-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="text-white">
                      <span className="text-slate-400">Total Matches:</span>
                      <span className="ml-2 font-bold">{instantPredictions.length}</span>
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

                {/* Full Predictions Cards */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">🎯 All Predictions</h3>
                  {sortedPredictions.map((pred, i) => (
                    <div 
                      key={i} 
                      className={`bg-slate-800/50 rounded-xl border p-4 ${
                        i === 0 && pred.confidence_indicator !== 'LOW' 
                          ? 'border-green-500/50 bg-green-900/10' 
                          : 'border-slate-700'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {i === 0 && pred.confidence_indicator !== 'LOW' && (
                            <span className="text-2xl">🔥</span>
                          )}
                          <div>
                            <div className="text-white font-semibold">
                              {pred.home_team} vs {pred.away_team}
                            </div>
                            <div className="text-slate-400 text-sm">
                              {pred.match_date || '-'} | {pred.match_time || '-'}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          pred.confidence_indicator === 'HIGH' ? 'bg-green-500/20 text-green-400 border border-green-500' :
                          pred.confidence_indicator === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500' : 
                          'bg-red-500/20 text-red-400 border border-red-500'
                        }`}>
                          {pred.confidence_indicator || 'LOW'}
                        </span>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs uppercase">Odds</div>
                          <div className="text-white font-medium">
                            H: {pred.home_odd?.toFixed(2)} | A: {pred.away_odd?.toFixed(2)}
                          </div>
                          <div className="text-purple-400 font-bold">
                            O2.5: {pred.over25_odd?.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs uppercase">Buckets</div>
                          <div className="text-white text-sm">Home: {pred.bucket_home}</div>
                          <div className="text-purple-400 text-sm">O2.5: {pred.bucket_over25}</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs uppercase">Historical Rate</div>
                          <div className={`text-xl font-bold ${
                            (pred.historical_over25_rate || 0) >= 60 ? 'text-green-400' : 
                            (pred.historical_over25_rate || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {pred.historical_over25_rate?.toFixed(1) || '0'}%
                          </div>
                          <div className="text-slate-400 text-xs">
                            ({pred.total_in_bucket || 0} matches)
                          </div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs uppercase">Streak</div>
                          <div className={`text-xl font-bold ${
                            pred.streak_type === 'over' ? 'text-green-400' : 
                            pred.streak_type === 'under' ? 'text-red-400' : 'text-slate-400'
                          }`}>
                            {pred.current_streak || 0} {pred.streak_type || '-'}
                          </div>
                          <div className="text-slate-400 text-xs">
                            {pred.recommendation || '-'}
                          </div>
                        </div>
                      </div>

                      {/* Confidence Bar */}
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-400">Confidence</span>
                            <span className="font-bold text-white">
                              {pred.historical_over25_rate?.toFixed(1) || 0}%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                (pred.historical_over25_rate || 0) >= 65
                                  ? 'bg-green-500'
                                  : (pred.historical_over25_rate || 0) >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, pred.historical_over25_rate || 0)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right text-sm text-slate-400">
                          Odd: {pred.over25_odd?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
