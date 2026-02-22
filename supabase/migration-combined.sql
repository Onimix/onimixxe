-- ONIMIX Eagle Eye Pick - Combined Migration
-- Run this entire script in Supabase SQL Editor

-- ============================================================
-- PART 1: PERFORMANCE TRACKING
-- ============================================================

-- STEP 1: Add match_date column to existing tables
ALTER TABLE results ADD COLUMN IF NOT EXISTS match_date DATE;
ALTER TABLE results ADD COLUMN IF NOT EXISTS match_time TEXT;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS match_date DATE;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS match_time TEXT;

CREATE INDEX IF NOT EXISTS idx_results_match_date ON results (match_date);
CREATE INDEX IF NOT EXISTS idx_odds_match_date ON odds (match_date);

-- STEP 2: Create predictions table with performance tracking
CREATE TABLE IF NOT EXISTS predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT UNIQUE,
  match_date DATE,
  match_time TEXT,
  league TEXT DEFAULT 'Germany Virtual',
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_odd REAL,
  draw_odd REAL,
  away_odd REAL,
  goal_line REAL DEFAULT 2.5,
  over_odd REAL,
  under_odd REAL,
  prediction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_prediction TEXT NOT NULL,
  ai_probability_over15 FLOAT,
  ai_probability_over25 FLOAT,
  ai_confidence_score FLOAT,
  ai_status TEXT,
  block_time_stats JSONB,
  team_stats_home JSONB,
  team_stats_away JSONB,
  final_result_over15 BOOLEAN,
  final_result_over25 BOOLEAN,
  final_home_goals INTEGER,
  final_away_goals INTEGER,
  final_total_goals INTEGER,
  is_correct BOOLEAN,
  profit_loss FLOAT DEFAULT 0,
  calibrated_probability FLOAT,
  calibration_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_match_date ON predictions (match_date);
CREATE INDEX IF NOT EXISTS idx_predictions_home_team ON predictions (home_team);
CREATE INDEX IF NOT EXISTS idx_predictions_away_team ON predictions (away_team);
CREATE INDEX IF NOT EXISTS idx_predictions_is_correct ON predictions (is_correct);
CREATE INDEX IF NOT EXISTS idx_predictions_ai_status ON predictions (ai_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_unique_match ON predictions (match_date, match_time, home_team, away_team);

-- STEP 3: Create model_performance table
CREATE TABLE IF NOT EXISTS model_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calculation_date DATE DEFAULT CURRENT_DATE,
  total_predictions INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_accuracy FLOAT DEFAULT 0,
  current_month_predictions INTEGER DEFAULT 0,
  current_month_correct INTEGER DEFAULT 0,
  current_month_accuracy FLOAT DEFAULT 0,
  rolling_50_predictions INTEGER DEFAULT 0,
  rolling_50_correct INTEGER DEFAULT 0,
  rolling_50_accuracy FLOAT DEFAULT 0,
  total_profit_loss FLOAT DEFAULT 0,
  total_roi FLOAT DEFAULT 0,
  probability_bands JSONB DEFAULT '{
    "50-59": {"total": 0, "correct": 0, "accuracy": 0},
    "60-69": {"total": 0, "correct": 0, "accuracy": 0},
    "70-79": {"total": 0, "correct": 0, "accuracy": 0},
    "80-89": {"total": 0, "correct": 0, "accuracy": 0},
    "90-100": {"total": 0, "correct": 0, "accuracy": 0}
  }'::jsonb,
  calibration_factor_over15 FLOAT DEFAULT 1.0,
  calibration_factor_over25 FLOAT DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 4: Create function to link results to predictions
CREATE OR REPLACE FUNCTION link_result_to_prediction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE predictions
  SET 
    final_result_over15 = NEW.over_15,
    final_result_over25 = NEW.over_25,
    final_home_goals = NEW.home_goals,
    final_away_goals = NEW.away_goals,
    final_total_goals = NEW.total_goals,
    is_correct = CASE 
      WHEN predictions.ai_prediction = 'OVER 1.5' THEN NEW.over_15
      WHEN predictions.ai_prediction = 'OVER 2.5' THEN NEW.over_25
      WHEN predictions.ai_prediction = 'UNDER 1.5' THEN NOT NEW.over_15
      WHEN predictions.ai_prediction = 'UNDER 2.5' THEN NOT NEW.over_25
      ELSE NULL
    END,
    profit_loss = CASE 
      WHEN predictions.ai_prediction = 'OVER 1.5' AND NEW.over_15 = TRUE THEN predictions.over_odd - 1
      WHEN predictions.ai_prediction = 'OVER 1.5' AND NEW.over_15 = FALSE THEN -1
      WHEN predictions.ai_prediction = 'OVER 2.5' AND NEW.over_25 = TRUE THEN predictions.over_odd - 1
      WHEN predictions.ai_prediction = 'OVER 2.5' AND NEW.over_25 = FALSE THEN -1
      ELSE 0
    END,
    updated_at = NOW()
  WHERE 
    (predictions.match_date = NEW.match_date OR predictions.match_date IS NULL)
    AND predictions.home_team = NEW.home_team
    AND predictions.away_team = NEW.away_team;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_link_result ON results;
CREATE TRIGGER trigger_link_result
AFTER INSERT OR UPDATE ON results
FOR EACH ROW
EXECUTE FUNCTION link_result_to_prediction();

-- STEP 5: Create function to calculate performance metrics
CREATE OR REPLACE FUNCTION calculate_performance_metrics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_predictions', COUNT(*),
    'total_correct', COUNT(*) FILTER (WHERE is_correct = TRUE),
    'total_accuracy', ROUND(
      COUNT(*) FILTER (WHERE is_correct = TRUE)::FLOAT / 
      NULLIF(COUNT(*) FILTER (WHERE is_correct IS NOT NULL), 0) * 100, 
      2
    ),
    'total_profit_loss', COALESCE(SUM(profit_loss), 0),
    'rolling_50_accuracy', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE is_correct = TRUE)::FLOAT / 
        NULLIF(COUNT(*), 0) * 100, 
        2
      )
      FROM (
        SELECT is_correct FROM predictions 
        WHERE is_correct IS NOT NULL 
        ORDER BY prediction_date DESC 
        LIMIT 50
      ) subq
    ),
    'probability_bands', (
      SELECT jsonb_object_agg(
        band,
        jsonb_build_object(
          'total', COUNT(*),
          'correct', COUNT(*) FILTER (WHERE is_correct = TRUE),
          'accuracy', ROUND(
            COUNT(*) FILTER (WHERE is_correct = TRUE)::FLOAT / 
            NULLIF(COUNT(*), 0) * 100, 
            2
          )
        )
      )
      FROM (
        SELECT 
          is_correct,
          CASE 
            WHEN ai_probability_over15 >= 50 AND ai_probability_over15 < 60 THEN '50-59'
            WHEN ai_probability_over15 >= 60 AND ai_probability_over15 < 70 THEN '60-69'
            WHEN ai_probability_over15 >= 70 AND ai_probability_over15 < 80 THEN '70-79'
            WHEN ai_probability_over15 >= 80 AND ai_probability_over15 < 90 THEN '80-89'
            WHEN ai_probability_over15 >= 90 THEN '90-100'
            ELSE 'unknown'
          END AS band
        FROM predictions
        WHERE is_correct IS NOT NULL
      ) sub
      WHERE band != 'unknown'
      GROUP BY band
    )
  ) INTO result
  FROM predictions
  WHERE is_correct IS NOT NULL;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- STEP 6: Create function to calculate calibration factor
CREATE OR REPLACE FUNCTION calculate_calibration_factor()
RETURNS FLOAT AS $$
DECLARE
  avg_predicted FLOAT;
  avg_actual FLOAT;
  calibration FLOAT;
BEGIN
  SELECT AVG(ai_probability_over15) INTO avg_predicted
  FROM predictions
  WHERE is_correct IS NOT NULL 
  AND ai_probability_over15 IS NOT NULL;
  
  SELECT 
    COUNT(*) FILTER (WHERE is_correct = TRUE)::FLOAT / 
    NULLIF(COUNT(*), 0) * 100 INTO avg_actual
  FROM predictions
  WHERE is_correct IS NOT NULL;
  
  IF avg_predicted IS NOT NULL AND avg_predicted > 0 AND avg_actual IS NOT NULL THEN
    calibration := avg_actual / avg_predicted;
  ELSE
    calibration := 1.0;
  END IF;
  
  RETURN ROUND(calibration::numeric, 4);
END;
$$ LANGUAGE plpgsql;

-- STEP 7: Create view for easy performance queries
CREATE OR REPLACE VIEW v_prediction_performance AS
SELECT 
  p.id,
  p.match_date,
  p.match_time,
  p.home_team,
  p.away_team,
  p.ai_prediction,
  p.ai_probability_over15,
  p.ai_status,
  p.is_correct,
  p.profit_loss,
  r.home_goals,
  r.away_goals,
  r.total_goals,
  r.over_15 AS actual_over15,
  r.over_25 AS actual_over25
FROM predictions p
LEFT JOIN results r ON 
  (r.match_date = p.match_date OR (r.match_date IS NULL AND p.match_date IS NULL))
  AND r.home_team = p.home_team 
  AND r.away_team = p.away_team
ORDER BY p.prediction_date DESC;

-- STEP 8: Grant permissions
GRANT ALL ON predictions TO anon;
GRANT ALL ON predictions TO authenticated;
GRANT ALL ON model_performance TO anon;
GRANT ALL ON model_performance TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER TABLE predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance DISABLE ROW LEVEL SECURITY;

-- STEP 9: Update existing results with match_date
UPDATE results 
SET match_date = DATE(created_at)
WHERE match_date IS NULL;

-- ============================================================
-- PART 2: OVER 2.5 TRACKING
-- ============================================================

-- Add columns to results table for Over 2.5 tracking
ALTER TABLE results ALTER COLUMN match_date SET DEFAULT CURRENT_DATE;
ALTER TABLE results ADD COLUMN IF NOT EXISTS block_id VARCHAR;
ALTER TABLE results ADD COLUMN IF NOT EXISTS platform VARCHAR DEFAULT 'Sporty';
ALTER TABLE results ADD COLUMN IF NOT EXISTS home_odd FLOAT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS away_odd FLOAT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS over25_odd FLOAT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS under25_odd FLOAT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS result_over25 BOOLEAN;
ALTER TABLE results ADD COLUMN IF NOT EXISTS result_home_win BOOLEAN;

-- Create indexes for Over 2.5 tracking
CREATE INDEX IF NOT EXISTS idx_results_block_id ON results (block_id);
CREATE INDEX IF NOT EXISTS idx_results_home_odd ON results (home_odd);
CREATE INDEX IF NOT EXISTS idx_results_away_odd ON results (away_odd);
CREATE INDEX IF NOT EXISTS idx_results_over25_odd ON results (over25_odd);

-- Update existing results with calculated values
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
    bucket_type VARCHAR NOT NULL,
    bucket_range VARCHAR NOT NULL,
    total_matches INTEGER NOT NULL DEFAULT 0,
    over25_hits INTEGER NOT NULL DEFAULT 0,
    over25_rate FLOAT NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    streak_type VARCHAR DEFAULT 'none',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bucket_type, bucket_range)
);

-- Create indexes for bucket stats
CREATE INDEX IF NOT EXISTS idx_bucket_stats_type ON bucket_stats (bucket_type);
CREATE INDEX IF NOT EXISTS idx_bucket_stats_range ON bucket_stats (bucket_range);

-- Create a table for pattern tracking
CREATE TABLE IF NOT EXISTS odds_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_hash VARCHAR NOT NULL,
    home_odd_range VARCHAR NOT NULL,
    over25_odd_range VARCHAR NOT NULL,
    total_matches INTEGER NOT NULL DEFAULT 0,
    over25_hits INTEGER NOT NULL DEFAULT 0,
    over25_rate FLOAT NOT NULL DEFAULT 0,
    last_seen DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pattern_hash)
);

-- Grant permissions for Over 2.5 tables
GRANT ALL ON upcoming_matches TO anon;
GRANT ALL ON upcoming_matches TO authenticated;
GRANT ALL ON bucket_stats TO anon;
GRANT ALL ON bucket_stats TO authenticated;
GRANT ALL ON odds_patterns TO anon;
GRANT ALL ON odds_patterns TO authenticated;

-- Grant sequence permissions for UUID generation
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Disable RLS for simplicity
ALTER TABLE upcoming_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE odds_patterns DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
