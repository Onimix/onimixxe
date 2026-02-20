-- Supabase Schema for ONIMIX Eagle Eye Pick
-- Run this SQL in your Supabase SQL Editor

-- Drop existing tables if needed (WARNING: This will delete all data)
-- DROP TABLE IF EXISTS odds;
-- DROP TABLE IF EXISTS results;

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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_results_block_time ON results (block_time);
CREATE INDEX IF NOT EXISTS idx_odds_block_time ON odds (block_time);
CREATE INDEX IF NOT EXISTS idx_results_created_at ON results (created_at);
CREATE INDEX IF NOT EXISTS idx_odds_created_at ON odds (created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- These policies allow full public access for the anon key
-- For production, you may want to restrict this

-- Disable RLS first (simplest approach for demo/public apps)
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE odds DISABLE ROW LEVEL SECURITY;

-- OR if you prefer to keep RLS enabled, use these policies:
-- Enable RLS
-- ALTER TABLE results ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE odds ENABLE ROW LEVEL SECURITY;

-- Results: Allow all operations for anon key
-- DROP POLICY IF EXISTS "Allow all on results" ON results;
-- CREATE POLICY "Allow all on results" ON results FOR ALL USING (true) WITH CHECK (true);

-- Odds: Allow all operations for anon key
-- DROP POLICY IF EXISTS "Allow all on odds" ON odds;
-- CREATE POLICY "Allow all on odds" ON odds FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- GRANT PERMISSIONS (Important for anon key access)
-- =====================================================
GRANT ALL ON results TO anon;
GRANT ALL ON results TO authenticated;
GRANT ALL ON odds TO anon;
GRANT ALL ON odds TO authenticated;

-- Grant sequence permissions for UUID generation
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
