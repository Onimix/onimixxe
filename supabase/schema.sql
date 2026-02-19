-- Supabase Schema for ONIMIX Eagle Eye Pick
-- Run this SQL in your Supabase SQL Editor

-- Results table for storing historical match results
CREATE TABLE IF NOT EXISTS results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  block_time TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_goals INTEGER NOT NULL,
  away_goals INTEGER NOT NULL,
  total_goals INTEGER NOT NULL,
  over_15 BOOLEAN NOT NULL,
  over_25 BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS unique_result ON results (block_time, home_team, away_team, home_goals, away_goals);

-- Odds table for storing upcoming match odds
CREATE TABLE IF NOT EXISTS odds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  block_time TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_odd REAL NOT NULL,
  draw_odd REAL NOT NULL,
  away_odd REAL NOT NULL,
  goal_line REAL NOT NULL,
  over_odd REAL NOT NULL,
  under_odd REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_results_block_time ON results (block_time);
CREATE INDEX IF NOT EXISTS idx_odds_block_time ON odds (block_time);

-- Enable Row Level Security (optional - can be disabled for demo)
-- ALTER TABLE results ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE odds ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (adjust as needed for production)
-- DROP POLICY IF EXISTS "Allow public read results" ON results;
-- CREATE POLICY "Allow public read results" ON results FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Allow public read odds" ON odds;
-- CREATE POLICY "Allow public read odds" ON odds FOR SELECT USING (true);
