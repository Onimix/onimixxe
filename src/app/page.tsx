'use client';

import { useState, useEffect, useCallback } from 'react';
import JsonUploader from '@/components/JsonUploader';
import OddsInput from '@/components/OddsInput';
import HistoricalStatsPanel from '@/components/HistoricalStats';
import PredictionPanel from '@/components/PredictionPanel';
import { getAllResults, getAllOdds, getHistoricalStats } from '@/lib/supabase';
import { analyzeMatch } from '@/lib/analysis';
import type { Result, Odds, HistoricalStats, Prediction } from '@/lib/types';

// Flame elements for edges - varying speeds and sizes for 5D effect
const flameElements = [
  // Top edge flames - fast rotation
  { position: 'top', left: '0%', size: 80, speed: 0.8, delay: 0, intensity: 1 },
  { position: 'top', left: '5%', size: 60, speed: 1.2, delay: 0.1, intensity: 0.9 },
  { position: 'top', left: '10%', size: 90, speed: 0.6, delay: 0.2, intensity: 1 },
  { position: 'top', left: '15%', size: 50, speed: 1.5, delay: 0.3, intensity: 0.8 },
  { position: 'top', left: '20%', size: 70, speed: 0.9, delay: 0.15, intensity: 0.95 },
  { position: 'top', left: '25%', size: 85, speed: 0.7, delay: 0.25, intensity: 1 },
  { position: 'top', left: '30%', size: 55, speed: 1.3, delay: 0.05, intensity: 0.85 },
  { position: 'top', left: '35%', size: 75, speed: 0.85, delay: 0.35, intensity: 0.9 },
  { position: 'top', left: '40%', size: 95, speed: 0.5, delay: 0.1, intensity: 1 },
  { position: 'top', left: '45%', size: 65, speed: 1.1, delay: 0.2, intensity: 0.88 },
  { position: 'top', left: '50%', size: 100, speed: 0.55, delay: 0, intensity: 1 },
  { position: 'top', left: '55%', size: 70, speed: 0.95, delay: 0.15, intensity: 0.92 },
  { position: 'top', left: '60%', size: 85, speed: 0.65, delay: 0.3, intensity: 1 },
  { position: 'top', left: '65%', size: 60, speed: 1.4, delay: 0.08, intensity: 0.87 },
  { position: 'top', left: '70%', size: 90, speed: 0.75, delay: 0.22, intensity: 0.95 },
  { position: 'top', left: '75%', size: 55, speed: 1.25, delay: 0.12, intensity: 0.83 },
  { position: 'top', left: '80%', size: 80, speed: 0.8, delay: 0.28, intensity: 0.98 },
  { position: 'top', left: '85%', size: 65, speed: 1.0, delay: 0.18, intensity: 0.9 },
  { position: 'top', left: '90%', size: 95, speed: 0.6, delay: 0.05, intensity: 1 },
  { position: 'top', left: '95%', size: 75, speed: 0.85, delay: 0.32, intensity: 0.93 },
  // Bottom edge flames
  { position: 'bottom', left: '0%', size: 75, speed: 0.9, delay: 0.1, intensity: 0.95 },
  { position: 'bottom', left: '5%', size: 55, speed: 1.3, delay: 0.2, intensity: 0.85 },
  { position: 'bottom', left: '10%', size: 85, speed: 0.7, delay: 0.3, intensity: 1 },
  { position: 'bottom', left: '15%', size: 60, speed: 1.1, delay: 0.15, intensity: 0.88 },
  { position: 'bottom', left: '20%', size: 90, speed: 0.55, delay: 0.25, intensity: 0.98 },
  { position: 'bottom', left: '25%', size: 50, speed: 1.4, delay: 0.05, intensity: 0.82 },
  { position: 'bottom', left: '30%', size: 80, speed: 0.8, delay: 0.35, intensity: 0.92 },
  { position: 'bottom', left: '35%', size: 65, speed: 1.0, delay: 0.12, intensity: 0.9 },
  { position: 'bottom', left: '40%', size: 95, speed: 0.6, delay: 0.22, intensity: 1 },
  { position: 'bottom', left: '45%', size: 70, speed: 0.85, delay: 0.08, intensity: 0.94 },
  { position: 'bottom', left: '50%', size: 100, speed: 0.5, delay: 0.18, intensity: 1 },
  { position: 'bottom', left: '55%', size: 60, speed: 1.2, delay: 0.28, intensity: 0.86 },
  { position: 'bottom', left: '60%', size: 85, speed: 0.75, delay: 0.1, intensity: 0.96 },
  { position: 'bottom', left: '65%', size: 55, speed: 1.35, delay: 0.2, intensity: 0.84 },
  { position: 'bottom', left: '70%', size: 90, speed: 0.65, delay: 0.3, intensity: 0.99 },
  { position: 'bottom', left: '75%', size: 70, speed: 0.95, delay: 0.15, intensity: 0.91 },
  { position: 'bottom', left: '80%', size: 80, speed: 0.7, delay: 0.25, intensity: 0.97 },
  { position: 'bottom', left: '85%', size: 60, speed: 1.15, delay: 0.05, intensity: 0.87 },
  { position: 'bottom', left: '90%', size: 95, speed: 0.55, delay: 0.35, intensity: 1 },
  { position: 'bottom', left: '95%', size: 75, speed: 0.8, delay: 0.12, intensity: 0.93 },
  // Left edge flames
  { position: 'left', top: '0%', size: 70, speed: 0.85, delay: 0.1, intensity: 0.92 },
  { position: 'left', top: '5%', size: 55, speed: 1.2, delay: 0.2, intensity: 0.85 },
  { position: 'left', top: '10%', size: 85, speed: 0.6, delay: 0.3, intensity: 0.98 },
  { position: 'left', top: '15%', size: 60, speed: 1.1, delay: 0.15, intensity: 0.88 },
  { position: 'left', top: '20%', size: 90, speed: 0.5, delay: 0.25, intensity: 1 },
  { position: 'left', top: '25%', size: 50, speed: 1.4, delay: 0.05, intensity: 0.82 },
  { position: 'left', top: '30%', size: 80, speed: 0.75, delay: 0.35, intensity: 0.94 },
  { position: 'left', top: '35%', size: 65, speed: 0.95, delay: 0.12, intensity: 0.9 },
  { position: 'left', top: '40%', size: 95, speed: 0.55, delay: 0.22, intensity: 1 },
  { position: 'left', top: '45%', size: 70, speed: 0.8, delay: 0.08, intensity: 0.93 },
  { position: 'left', top: '50%', size: 100, speed: 0.45, delay: 0.18, intensity: 1 },
  { position: 'left', top: '55%', size: 60, speed: 1.15, delay: 0.28, intensity: 0.86 },
  { position: 'left', top: '60%', size: 85, speed: 0.7, delay: 0.1, intensity: 0.96 },
  { position: 'left', top: '65%', size: 55, speed: 1.3, delay: 0.2, intensity: 0.84 },
  { position: 'left', top: '70%', size: 90, speed: 0.6, delay: 0.3, intensity: 0.99 },
  { position: 'left', top: '75%', size: 70, speed: 0.9, delay: 0.15, intensity: 0.91 },
  { position: 'left', top: '80%', size: 80, speed: 0.65, delay: 0.25, intensity: 0.97 },
  { position: 'left', top: '85%', size: 60, speed: 1.1, delay: 0.05, intensity: 0.87 },
  { position: 'left', top: '90%', size: 95, speed: 0.5, delay: 0.35, intensity: 1 },
  { position: 'left', top: '95%', size: 75, speed: 0.75, delay: 0.12, intensity: 0.93 },
  // Right edge flames
  { position: 'right', top: '0%', size: 75, speed: 0.8, delay: 0.15, intensity: 0.94 },
  { position: 'right', top: '5%', size: 55, speed: 1.25, delay: 0.25, intensity: 0.86 },
  { position: 'right', top: '10%', size: 90, speed: 0.55, delay: 0.35, intensity: 0.99 },
  { position: 'right', top: '15%', size: 60, speed: 1.05, delay: 0.1, intensity: 0.88 },
  { position: 'right', top: '20%', size: 85, speed: 0.65, delay: 0.2, intensity: 0.97 },
  { position: 'right', top: '25%', size: 50, speed: 1.35, delay: 0.3, intensity: 0.83 },
  { position: 'right', top: '30%', size: 80, speed: 0.7, delay: 0.05, intensity: 0.95 },
  { position: 'right', top: '35%', size: 65, speed: 0.9, delay: 0.18, intensity: 0.91 },
  { position: 'right', top: '40%', size: 95, speed: 0.5, delay: 0.28, intensity: 1 },
  { position: 'right', top: '45%', size: 70, speed: 0.85, delay: 0.12, intensity: 0.93 },
  { position: 'right', top: '50%', size: 100, speed: 0.4, delay: 0.22, intensity: 1 },
  { position: 'right', top: '55%', size: 60, speed: 1.2, delay: 0.08, intensity: 0.87 },
  { position: 'right', top: '60%', size: 85, speed: 0.6, delay: 0.32, intensity: 0.98 },
  { position: 'right', top: '65%', size: 55, speed: 1.3, delay: 0.15, intensity: 0.85 },
  { position: 'right', top: '70%', size: 90, speed: 0.55, delay: 0.25, intensity: 1 },
  { position: 'right', top: '75%', size: 70, speed: 0.95, delay: 0.05, intensity: 0.92 },
  { position: 'right', top: '80%', size: 80, speed: 0.7, delay: 0.18, intensity: 0.96 },
  { position: 'right', top: '85%', size: 60, speed: 1.15, delay: 0.28, intensity: 0.88 },
  { position: 'right', top: '90%', size: 95, speed: 0.45, delay: 0.1, intensity: 1 },
  { position: 'right', top: '95%', size: 75, speed: 0.8, delay: 0.3, intensity: 0.94 },
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
      {/* 🔥 POWERFUL FLAME BORDER EFFECT - 5D ROTATING FLAMES 🔥 */}
      {flameElements.map((flame, i) => (
        <div
          key={`flame-${i}`}
          className="fixed pointer-events-none z-50"
          style={{
            [flame.position === 'top' ? 'top' : flame.position === 'bottom' ? 'bottom' : flame.position === 'left' ? 'left' : 'right']: '-10px',
            ...(flame.position === 'top' || flame.position === 'bottom' ? { left: flame.left } : { top: flame.top }),
            width: flame.position === 'top' || flame.position === 'bottom' ? '5%' : `${flame.size}px`,
            height: flame.position === 'top' || flame.position === 'bottom' ? `${flame.size}px` : '5%',
          }}
        >
          {/* Main flame */}
          <div
            className="flame-container"
            style={{
              animation: `flameRotate ${flame.speed}s linear infinite, flamePulse ${flame.speed * 0.7}s ease-in-out infinite`,
              animationDelay: `${flame.delay}s, ${flame.delay * 0.5}s`,
              transform: `scale(${flame.intensity})`,
            }}
          >
            <div className="flame flame-outer" style={{ animationDuration: `${flame.speed * 0.8}s` }} />
            <div className="flame flame-middle" style={{ animationDuration: `${flame.speed * 0.6}s` }} />
            <div className="flame flame-inner" style={{ animationDuration: `${flame.speed * 0.4}s` }} />
            <div className="flame flame-core" style={{ animationDuration: `${flame.speed * 0.3}s` }} />
          </div>
          {/* Glow effect */}
          <div
            className="flame-glow"
            style={{
              animation: `glowPulse ${flame.speed * 1.5}s ease-in-out infinite`,
              animationDelay: `${flame.delay}s`,
              opacity: flame.intensity * 0.8,
            }}
          />
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
        /* 🔥 POWERFUL FLAME ANIMATIONS - 5D EFFECT 🔥 */
        @keyframes flameRotate {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(90deg) scale(1.1); }
          50% { transform: rotate(180deg) scale(1); }
          75% { transform: rotate(270deg) scale(1.15); }
          100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes flamePulse {
          0%, 100% { filter: brightness(1) saturate(1); }
          50% { filter: brightness(1.3) saturate(1.2); }
        }
        
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        
        @keyframes flicker {
          0%, 100% { opacity: 1; transform: scaleY(1) scaleX(1); }
          25% { opacity: 0.9; transform: scaleY(1.1) scaleX(0.95); }
          50% { opacity: 1; transform: scaleY(0.95) scaleX(1.05); }
          75% { opacity: 0.85; transform: scaleY(1.05) scaleX(0.98); }
        }
        
        .flame-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .flame {
          position: absolute;
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          animation: flicker 0.3s ease-in-out infinite;
        }
        
        .flame-outer {
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse at bottom, 
            rgba(255, 100, 0, 0.9) 0%, 
            rgba(255, 50, 0, 0.7) 30%, 
            rgba(255, 0, 0, 0.5) 60%, 
            transparent 100%);
          filter: blur(2px);
        }
        
        .flame-middle {
          width: 75%;
          height: 75%;
          background: radial-gradient(ellipse at bottom, 
            rgba(255, 150, 0, 1) 0%, 
            rgba(255, 100, 0, 0.8) 40%, 
            rgba(255, 50, 0, 0.4) 70%, 
            transparent 100%);
          filter: blur(1px);
        }
        
        .flame-inner {
          width: 50%;
          height: 50%;
          background: radial-gradient(ellipse at bottom, 
            rgba(255, 200, 50, 1) 0%, 
            rgba(255, 150, 0, 0.9) 50%, 
            rgba(255, 100, 0, 0.3) 80%, 
            transparent 100%);
        }
        
        .flame-core {
          width: 25%;
          height: 25%;
          background: radial-gradient(ellipse at bottom, 
            rgba(255, 255, 200, 1) 0%, 
            rgba(255, 220, 100, 0.9) 50%, 
            rgba(255, 180, 50, 0.5) 80%, 
            transparent 100%);
          filter: blur(0.5px);
        }
        
        .flame-glow {
          position: absolute;
          width: 200%;
          height: 200%;
          background: radial-gradient(ellipse at center, 
            rgba(255, 100, 0, 0.4) 0%, 
            rgba(255, 50, 0, 0.2) 30%, 
            transparent 70%);
          pointer-events: none;
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
