-- Migration for Over 2.5 tracking system
-- Add columns to results table for Over 2.5 tracking

-- Add match_date column (if not already added by previous migration)
ALTER TABLE results ADD COLUMN IF NOT EXISTS match_date DATE;
ALTER TABLE results ALTER COLUMN match_date SET DEFAULT CURRENT_DATE;

-- Add block_id column for block tracking
ALTER TABLE results ADD COLUMN IF NOT EXISTS block_id VARCHAR;

-- Add platform column
ALTER TABLE results ADD COLUMN IF NOT EXISTS platform VARCHAR DEFAULT 'Sporty';

-- Add odds columns for Over 2.5 tracking
ALTER TABLE results ADD COLUMN IF NOT EXISTS home_odd FLOAT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS away_odd FLOAT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS over25_odd FLOAT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS under25_odd FLOAT;

-- Add result tracking columns
ALTER TABLE results ADD COLUMN IF NOT EXISTS result_over25 BOOLEAN;
ALTER TABLE results ADD COLUMN IF NOT EXISTS result_home_win BOOLEAN;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_results_match_date ON results (match_date);
CREATE INDEX IF NOT EXISTS idx_results_block_id ON results (block_id);
CREATE INDEX IF NOT EXISTS idx_results_home_odd ON results (home_odd);
CREATE INDEX IF NOT EXISTS idx_results_away_odd ON results (away_odd);
CREATE INDEX IF NOT EXISTS idx_results_over25_odd ON results (over25_odd);

-- Update existing results with calculated values
-- This assumes home_goals and away_goals already exist in the table
UPDATE results 
SET 
    result_over25 = (home_goals + away_goals) >= 3,
    result_home_win = home_goals > away_goals
WHERE result_over25 IS NULL;

-- Create a new table for upcoming match inputs (Over 2.5 predictions)
CREATE TABLE IF NOT EXISTS upcoming_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_date DATE NOT NULL DEFAULT CURRENT_DATE,
    block_id VARCHAR,
    home_team TEXT,
    away_team TEXT,
    home_odd FLOAT NOT NULL,
    away_odd FLOAT NOT NULL,
    over25_odd FLOAT NOT NULL,
    under25_odd FLOAT NOT NULL,
    bucket_home VARCHAR,
    bucket_over25 VARCHAR,
    historical_over25_rate FLOAT,
    total_in_bucket INTEGER,
    current_streak INTEGER,
    streak_type VARCHAR,
    confidence_indicator VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for upcoming matches
CREATE INDEX IF NOT EXISTS idx_upcoming_match_date ON upcoming_matches (match_date);
CREATE INDEX IF NOT EXISTS idx_upcoming_block_id ON upcoming_matches (block_id);
CREATE INDEX IF NOT EXISTS idx_upcoming_bucket_home ON upcoming_matches (bucket_home);
CREATE INDEX IF NOT EXISTS idx_upcoming_bucket_over25 ON upcoming_matches (bucket_over25);

-- Create a table for bucket performance tracking (cached stats)
CREATE TABLE IF NOT EXISTS bucket_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bucket_type VARCHAR NOT NULL, -- 'home_odd', 'away_odd', 'over25_odd'
    bucket_range VARCHAR NOT NULL, -- e.g., '1.20-1.40'
    total_matches INTEGER NOT NULL DEFAULT 0,
    over25_hits INTEGER NOT NULL DEFAULT 0,
    over25_rate FLOAT NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    streak_type VARCHAR DEFAULT 'none', -- 'over', 'under', 'none'
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bucket_type, bucket_range)
);

-- Create indexes for bucket stats
CREATE INDEX IF NOT EXISTS idx_bucket_stats_type ON bucket_stats (bucket_type);
CREATE INDEX IF NOT EXISTS idx_bucket_stats_range ON bucket_stats (bucket_range);

-- Create a table for pattern tracking
CREATE TABLE IF NOT EXISTS odds_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_hash VARCHAR NOT NULL, -- Hash of home_odd_range + over25_odd_range
    home_odd_range VARCHAR NOT NULL,
    over25_odd_range VARCHAR NOT NULL,
    total_matches INTEGER NOT NULL DEFAULT 0,
    over25_hits INTEGER NOT NULL DEFAULT 0,
    over25_rate FLOAT NOT NULL DEFAULT 0,
    last_seen DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pattern_hash)
);

-- Grant permissions for new tables
GRANT ALL ON upcoming_matches TO anon;
GRANT ALL ON upcoming_matches TO authenticated;
GRANT ALL ON bucket_stats TO anon;
GRANT ALL ON bucket_stats TO authenticated;
GRANT ALL ON odds_patterns TO anon;
GRANT ALL ON odds_patterns TO authenticated;

-- Grant sequence permissions for UUID generation
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Disable RLS for simplicity (same as existing tables)
ALTER TABLE upcoming_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE odds_patterns DISABLE ROW LEVEL SECURITY;
