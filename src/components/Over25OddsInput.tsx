'use client';

import { useState } from 'react';
import { analyzeUpcomingMatch } from '@/lib/over25-analysis';
import type { Over25Result, Over25Analysis, ParsedOver25Odds } from '@/lib/types';

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
        <div className="mt-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">🎯 Instant Predictions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-600">
                  <th className="text-left py-2 px-2">Date/Time</th>
                  <th className="text-left py-2 px-2">Match</th>
                  <th className="text-center py-2 px-2">Odds</th>
                  <th className="text-center py-2 px-2">Bucket</th>
                  <th className="text-center py-2 px-2">Hist. Rate</th>
                  <th className="text-center py-2 px-2">Confidence</th>
                  <th className="text-center py-2 px-2">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {instantPredictions.map((pred, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-2 text-white">
                      <div>{pred.match_date || '-'}</div>
                      <div className="text-slate-400 text-xs">{pred.match_time || '-'}</div>
                    </td>
                    <td className="py-3 px-2 text-white">
                      <div className="font-medium">{pred.home_team} vs {pred.away_team}</div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="text-slate-300 text-xs">
                        H: {pred.home_odd?.toFixed(2)} | A: {pred.away_odd?.toFixed(2)}
                      </div>
                      <div className="text-purple-400 font-medium">
                        O2.5: {pred.over25_odd?.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center text-slate-300">
                      <div className="text-xs">{pred.bucket_home}</div>
                      <div className="text-xs text-purple-400">{pred.bucket_over25}</div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`font-bold ${(pred.historical_over25_rate || 0) >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {pred.historical_over25_rate?.toFixed(1) || '0'}%
                      </span>
                      <div className="text-slate-400 text-xs">({pred.total_in_bucket || 0} matches)</div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        pred.confidence_indicator === 'HIGH' ? 'bg-green-500/20 text-green-400' :
                        pred.confidence_indicator === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {pred.confidence_indicator || 'LOW'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-slate-300 text-xs">
                      {pred.recommendation || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
