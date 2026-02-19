'use client';

import { useState, useEffect, useCallback } from 'react';
import JsonUploader from '@/components/JsonUploader';
import OddsInput from '@/components/OddsInput';
import HistoricalStatsPanel from '@/components/HistoricalStats';
import PredictionPanel from '@/components/PredictionPanel';
import { getAllResults, getAllOdds, getHistoricalStats } from '@/lib/supabase';
import { analyzeMatch } from '@/lib/analysis';
import type { Result, Odds, HistoricalStats, Prediction } from '@/lib/types';

export default function Home() {
  const [results, setResults] = useState<Result[]>([]);
  const [odds, setOdds] = useState<Odds[]>([]);
  const [historicalStats, setHistoricalStats] = useState<HistoricalStats>({
    totalMatches: 0,
    avgGoals: 0,
    over15Rate: 0,
    over25Rate: 0,
  });
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resultsData, oddsData, statsData] = await Promise.all([
        getAllResults(),
        getAllOdds(),
        getHistoricalStats(),
      ]);
      
      setResults(resultsData);
      setOdds(oddsData);
      setHistoricalStats(statsData);

      // Generate predictions for each odd
      if (oddsData.length > 0 && resultsData.length > 0) {
        const newPredictions = oddsData.map(odd => 
          analyzeMatch(odd, resultsData)
        );
        setPredictions(newPredictions);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResultsUploaded = () => {
    loadData();
  };

  const handleOddsSubmitted = () => {
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient py-4 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap">
          <span className="text-white text-xl font-bold px-4">
            🦅 Welcome to ONIMIX Eagle Eye Pick – Where Data Tech Sees What Others Don&apos;t 🦅
            🦅 Welcome to ONIMIX Eagle Eye Pick – Where Data Tech Sees What Others Don&apos;t 🦅
            🦅 Welcome to ONIMIX Eagle Eye Pick – Where Data Tech Sees What Others Don&apos;t 🦅
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            🦅 ONIMIX Eagle Eye Pick
          </h1>
          <p className="text-slate-400 text-lg">
            AI-Powered Over 1.5 Goals Prediction Engine
          </p>
        </div>

        {/* Data Upload Panel */}
        <section className="mb-10">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              📊 Data Upload Panel
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* JSON Upload */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-300">
                  📁 Upload Results (JSON)
                </h3>
                <JsonUploader onUploadComplete={handleResultsUploaded} />
              </div>

              {/* Odds Input */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-300">
                  📋 Paste Odds (Tab-Separated)
                </h3>
                <OddsInput onOddsSubmitted={handleOddsSubmitted} />
              </div>
            </div>
          </div>
        </section>

        {/* Historical Intelligence Panel */}
        <section className="mb-10">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              🧠 Historical Intelligence
            </h2>
            {isLoading ? (
              <div className="animate-pulse flex gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex-1 h-24 bg-slate-700 rounded-xl" />
                ))}
              </div>
            ) : (
              <HistoricalStatsPanel stats={historicalStats} />
            )}
          </div>
        </section>

        {/* Prediction Panel */}
        <section>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              🎯 Prediction Output
            </h2>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-40 bg-slate-700 rounded-xl" />
                ))}
              </div>
            ) : (
              <PredictionPanel predictions={predictions} />
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>ONIMIX Eagle Eye Pick © 2026 - SAFE MODE Production Ready</p>
        </footer>
      </main>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
