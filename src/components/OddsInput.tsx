'use client';

import { useState } from 'react';
import { insertOdds, clearOdds } from '@/lib/supabase';
import { parseOddsInput } from '@/lib/analysis';

interface OddsInputProps {
  onOddsSubmitted: (count: number) => void;
}

export default function OddsInput({ onOddsSubmitted }: OddsInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async () => {
    if (!input.trim()) {
      setMessage({ type: 'error', text: 'Please paste odds data first' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const parsed = parseOddsInput(input);

    if (!parsed.valid || !parsed.data) {
      setMessage({ type: 'error', text: parsed.error || 'Failed to parse odds' });
      setIsLoading(false);
      return;
    }

    // Clear old odds first
    await clearOdds();

    // Insert new odds
    const result = await insertOdds(parsed.data);

    setIsLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: `Successfully stored ${result.count} matches!` });
      setInput('');
      onOddsSubmitted(result.count);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to store odds' });
    }
  };

  const handleClear = () => {
    setInput('');
    setMessage(null);
  };

  // New simplified format: Date, Time, Home, Away, Over, Under
  const sampleData = `Date\tTime\tHome\tAway\tOver\tUnder
26/01/2026\t05:36\tFCA\tHDH\t2.32\t1.64
26/01/2026\t06:00\tBMG\tRBL\t1.95\t1.85`;

  const loadSample = () => {
    setInput(sampleData);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-2">
        <button
          onClick={loadSample}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Load Sample
        </button>
      </div>
      
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste tab-separated odds here...&#10;&#10;Format:&#10;Date\tTime\tHome\tAway\tOver\tUnder&#10;26/01/2026\t05:36\tFCA\tHDH\t2.32\t1.64"
        className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
      />

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Analyze Odds'}
        </button>
        
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
