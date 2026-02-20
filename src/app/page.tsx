'use client';

import { useState, useEffect, useCallback } from 'react';
import JsonUploader from '@/components/JsonUploader';
import OddsInput from '@/components/OddsInput';
import HistoricalStatsPanel from '@/components/HistoricalStats';
import PredictionPanel from '@/components/PredictionPanel';
import { getAllResults, getAllOdds, getHistoricalStats } from '@/lib/supabase';
import { analyzeMatch } from '@/lib/analysis';
import type { Result, Odds, HistoricalStats, Prediction } from '@/lib/types';

// Matrix characters for edges - tiny falling code effect
const matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const getRandomChar = () => matrixChars[Math.floor(Math.random() * matrixChars.length)];

// Matrix rain elements for all 4 edges
const matrixRainElements: Array<{
  position: 'top' | 'bottom' | 'left' | 'right';
  left?: string;
  top?: string;
  speed: number;
  delay: number;
  char: string;
}> = [
  // Top edge - falling down
  ...Array.from({ length: 40 }, (_, i) => ({
    position: 'top' as const,
    left: `${(i * 2.5)}%`,
    speed: 0.8 + Math.random() * 0.6,
    delay: Math.random() * 2,
    char: getRandomChar(),
  })),
  // Bottom edge - falling up
  ...Array.from({ length: 40 }, (_, i) => ({
    position: 'bottom' as const,
    left: `${(i * 2.5)}%`,
    speed: 0.8 + Math.random() * 0.6,
    delay: Math.random() * 2,
    char: getRandomChar(),
  })),
  // Left edge - falling right
  ...Array.from({ length: 30 }, (_, i) => ({
    position: 'left' as const,
    top: `${(i * 3.3)}%`,
    speed: 0.8 + Math.random() * 0.6,
    delay: Math.random() * 2,
    char: getRandomChar(),
  })),
  // Right edge - falling left
  ...Array.from({ length: 30 }, (_, i) => ({
    position: 'right' as const,
    top: `${(i * 3.3)}%`,
    speed: 0.8 + Math.random() * 0.6,
    delay: Math.random() * 2,
    char: getRandomChar(),
  })),
];

// Matrix ONIMIX floating elements
const matrixElements = [
  { text: 'ONIMIX', color: '#00ff41', top: '5%', left: '2%', delay: '0s', duration: '15s' },
  { text: 'ONIMIX', color: '#ff00ff', top: '15%', left: '85%', delay: '2s', duration: '18s' },
  { text: 'ONIMIX', color: '#00ffff', top: '25%', left: '5%', delay: '4s', duration: '20s' },
  { text: 'ONIMIX', color: '#ffff00', top: '35%', left: '90%', delay: '1s', duration: '16s' },
  { text: 'ONIMIX', color: '#ff0080', top: '45%', left: '3%', delay: '3s', duration: '22s' },
  { text: 'ONIMIX', color: '#80ff00', top: '55%', left: '88%', delay: '5s', duration: '17s' },
  { text: 'ONIMIX', color: '#0080ff', top: '65%', left: '8%', delay: '2.5s', duration: '19s' },
  { text: 'ONIMIX', color: '#ff8000', top: '75%', left: '92%', delay: '4.5s', duration: '21s' },
  { text: 'ONIMIX', color: '#ff0040', top: '85%', left: '4%', delay: '1.5s', duration: '14s' },
  { text: 'ONIMIX', color: '#40ff00', top: '12%', left: '50%', delay: '3.5s', duration: '23s' },
  { text: 'ONIMIX', color: '#0040ff', top: '30%', left: '45%', delay: '0.5s', duration: '16s' },
  { text: 'ONIMIX', color: '#ff40ff', top: '50%', left: '55%', delay: '6s', duration: '18s' },
  { text: 'ONIMIX', color: '#40ffff', top: '70%', left: '48%', delay: '2.2s', duration: '20s' },
  { text: 'ONIMIX', color: '#ffff40', top: '90%', left: '52%', delay: '4.8s', duration: '15s' },
  { text: 'ONIMIX', color: '#ff8040', top: '8%', left: '70%', delay: '1.8s', duration: '17s' },
  { text: 'ONIMIX', color: '#40ff80', top: '22%', left: '25%', delay: '3.2s', duration: '19s' },
  { text: 'ONIMIX', color: '#8040ff', top: '42%', left: '75%', delay: '5.5s', duration: '21s' },
  { text: 'ONIMIX', color: '#ff40ff', top: '62%', left: '20%', delay: '0.8s', duration: '16s' },
  { text: 'ONIMIX', color: '#40ff40', top: '82%', left: '78%', delay: '2.8s', duration: '14s' },
  { text: 'ONIMIX', color: '#ff4040', top: '20%', left: '60%', delay: '4.2s', duration: '18s' },
];

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* 💚 MATRIX RAIN BORDER EFFECT - TINY FALLING CODE 💚 */}
      {matrixRainElements.map((el, i) => (
        <div
          key={`matrix-${i}`}
          className="fixed pointer-events-none z-50 matrix-rain-container"
          style={{
            [el.position]: '0',
            ...(el.position === 'top' || el.position === 'bottom' ? { left: el.left } : { top: el.top }),
            animation: el.position === 'top' ? `matrixFallDown ${el.speed}s linear infinite` :
                       el.position === 'bottom' ? `matrixFallUp ${el.speed}s linear infinite` :
                       el.position === 'left' ? `matrixFallRight ${el.speed}s linear infinite` :
                       `matrixFallLeft ${el.speed}s linear infinite`,
            animationDelay: `${el.delay}s`,
          }}
        >
          <span className="matrix-char" style={{
            color: '#00ff41',
            textShadow: '0 0 8px #00ff41, 0 0 15px #00ff41, 0 0 25px #00ff41',
            fontSize: '10px',
            fontFamily: "'Courier New', monospace",
            fontWeight: 'bold',
          }}>
            {el.char}
          </span>
        </div>
      ))}

      {/* Matrix ONIMIX Background Effect */}
      {matrixElements.map((el, i) => (
        <div
          key={i}
          className="fixed pointer-events-none select-none opacity-20 matrix-float"
          style={{
            top: el.top,
            left: el.left,
            color: el.color,
            animationDelay: el.delay,
            animationDuration: el.duration,
            fontSize: 'clamp(1rem, 3vw, 2rem)',
            fontWeight: 'bold',
            textShadow: `0 0 10px ${el.color}, 0 0 20px ${el.color}, 0 0 40px ${el.color}`,
            zIndex: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {el.text}
        </div>
      ))}

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
        <footer className="mt-12 text-center text-slate-500 text-sm relative z-10">
          <p>ONIMIX Eagle Eye Pick © 2026 - SAFE MODE Production Ready</p>
        </footer>
      </main>

      <style jsx global>{`
        /* 💚 MATRIX RAIN ANIMATIONS - TINY FALLING CODE 💚 */
        @keyframes matrixFallDown {
          0% { transform: translateY(-20px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        
        @keyframes matrixFallUp {
          0% { transform: translateY(20px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        
        @keyframes matrixFallRight {
          0% { transform: translateX(-20px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }
        
        @keyframes matrixFallLeft {
          0% { transform: translateX(20px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }
        
        .matrix-rain-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .matrix-char {
          animation: matrixFlicker 0.15s ease-in-out infinite;
        }
        
        @keyframes matrixFlicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

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
        @keyframes matrixFloat {
          0%, 100% { 
            transform: translateY(0) rotate(0deg);
            opacity: 0.1;
          }
          25% { 
            transform: translateY(-20px) rotate(1deg);
            opacity: 0.25;
          }
          50% { 
            transform: translateY(0) rotate(0deg);
            opacity: 0.1;
          }
          75% { 
            transform: translateY(20px) rotate(-1deg);
            opacity: 0.2;
          }
        }
        .matrix-float {
          animation: matrixFloat 8s ease-in-out infinite;
          font-family: 'Courier New', monospace;
        }
      `}</style>
    </div>
  );
}
