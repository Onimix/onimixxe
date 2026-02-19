'use client';

import { useState, useRef } from 'react';
import { insertResults } from '@/lib/supabase';
import { validateSportyJson, timestampToBlockTime, parseScore } from '@/lib/analysis';
import type { SportyResponse, ParsedResult } from '@/lib/types';

interface JsonUploaderProps {
  onUploadComplete: (count: number) => void;
}

export default function JsonUploader({ onUploadComplete }: JsonUploaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setMessage(null);

    let totalProcessed = 0;

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.json')) {
        setMessage({ type: 'error', text: `File "${file.name}" is not a JSON file` });
        setIsLoading(false);
        return;
      }

      try {
        const text = await file.text();
        let jsonData: unknown;

        try {
          jsonData = JSON.parse(text);
        } catch {
          setMessage({ type: 'error', text: `Invalid JSON in file "${file.name}"` });
          setIsLoading(false);
          return;
        }

        const validation = validateSportyJson(jsonData);
        if (!validation.valid) {
          setMessage({ type: 'error', text: validation.error || `Invalid structure in "${file.name}"` });
          setIsLoading(false);
          return;
        }

        const sportyData = jsonData as SportyResponse;
        const parsedResults: ParsedResult[] = [];

        for (const tournament of sportyData.data.tournaments) {
          for (const match of tournament.events) {
            // Only process completed matches
            if (match.matchStatus !== 'End') continue;

            const { homeGoals, awayGoals } = parseScore(match.setScore);
            const totalGoals = homeGoals + awayGoals;

            parsedResults.push({
              block_time: timestampToBlockTime(match.estimateStartTime),
              home_team: match.homeTeamName,
              away_team: match.awayTeamName,
              home_goals: homeGoals,
              away_goals: awayGoals,
              total_goals: totalGoals,
              over_15: totalGoals >= 2,
              over_25: totalGoals >= 3,
            });
          }
        }

        if (parsedResults.length > 0) {
          const result = await insertResults(parsedResults);
          if (result.success) {
            totalProcessed += parsedResults.length;
          } else {
            console.error('Error inserting results:', result.error);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setMessage({ type: 'error', text: `Error processing "${file.name}": ${errorMessage}` });
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(false);

    if (totalProcessed > 0) {
      setMessage({ type: 'success', text: `Successfully processed ${totalProcessed} matches!` });
      onUploadComplete(totalProcessed);
    } else {
      setMessage({ type: 'error', text: 'No valid matches found in the uploaded files' });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          multiple
          onChange={handleChange}
          className="hidden"
        />
        <div className="space-y-2">
          <div className="text-4xl">📁</div>
          <div className="text-lg font-medium text-gray-700">
            {isLoading ? 'Processing...' : 'Drop JSON files here or click to upload'}
          </div>
          <div className="text-sm text-gray-500">
            Accepts multiple .json files (Sporty vFootball format)
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 p-3 rounded-lg ${
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
