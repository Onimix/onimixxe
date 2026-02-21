-- =====================================================
-- ONIMIX Eagle Eye Pick - Performance Tracking Migration
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Add match_date column to existing tables
-- =====================================================

-- Add match_date to results table
ALTER TABLE results ADD COLUMN IF NOT EXISTS match_date DATE;
ALTER TABLE results ADD COLUMN IF NOT EXISTS match_time TEXT;

-- Add match_date to odds table
ALTER TABLE odds ADD COLUMN IF NOT EXISTS match_date DATE;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS match_time TEXT;

-- Create indexes for date-based queries
CREATE INDEX IF NOT EXISTS idx_results_match_date ON results (match_date);
CREATE INDEX IF NOT EXISTS idx_odds_match_date ON odds (match_date);

-- =====================================================
-- STEP 2: Create predictions table with performance tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Match identification
  match_id TEXT UNIQUE,
  match_date DATE,
  match_time TEXT,
  league TEXT DEFAULT 'Germany Virtual',
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  
  -- Odds at prediction time
  home_odd REAL,
  draw_odd REAL,
  away_odd REAL,
  goal_line REAL DEFAULT 2.5,
  over_odd REAL,
  under_odd REAL,
  
  -- AI prediction data
  prediction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_prediction TEXT NOT NULL,  -- 'OVER 1.5', 'OVER 2.5', 'UNDER 1.5', etc.
  ai_probability_over15 FLOAT,
  ai_probability_over25 FLOAT,
  ai_confidence_score FLOAT,
  ai_status TEXT,  -- 'SAFE', 'MODERATE', 'RISKY'
  
  -- Historical context used for prediction
  block_time_stats JSONB,  -- Store block time stats at prediction time
  team_stats_home JSONB,   -- Store home team stats at prediction time
  team_stats_away JSONB,   -- Store away team stats at prediction time
  
  -- Result tracking (filled after match completes)
  final_result_over15 BOOLEAN,
  final_result_over25 BOOLEAN,
  final_home_goals INTEGER,
  final_away_goals INTEGER,
  final_total_goals INTEGER,
  
  -- Performance metrics
  is_correct BOOLEAN,
  profit_loss FLOAT DEFAULT 0,
  
  -- Calibration tracking
  calibrated_probability FLOAT,
  calibration_applied BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for predictions table
CREATE INDEX IF NOT EXISTS idx_predictions_match_date ON predictions (match_date);
CREATE INDEX IF NOT EXISTS idx_predictions_home_team ON predictions (home_team);
CREATE INDEX IF NOT EXISTS idx_predictions_away_team ON predictions (away_team);
CREATE INDEX IF NOT EXISTS idx_predictions_is_correct ON predictions (is_correct);
CREATE INDEX IF NOT EXISTS idx_predictions_ai_status ON predictions (ai_status);

-- Unique constraint for match identification
CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_unique_match 
ON predictions (match_date, match_time, home_team, away_team);

-- =====================================================
-- STEP 3: Create model_performance table for aggregated stats
-- =====================================================

CREATE TABLE IF NOT EXISTS model_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calculation_date DATE DEFAULT CURRENT_DATE,
  
  -- Overall stats
  total_predictions INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_accuracy FLOAT DEFAULT 0,
  
  -- Time-based stats
  current_month_predictions INTEGER DEFAULT 0,
  current_month_correct INTEGER DEFAULT 0,
  current_month_accuracy FLOAT DEFAULT 0,
  
  -- Rolling stats
  rolling_50_predictions INTEGER DEFAULT 0,
  rolling_50_correct INTEGER DEFAULT 0,
  rolling_50_accuracy FLOAT DEFAULT 0,
  
  -- ROI
  total_profit_loss FLOAT DEFAULT 0,
  total_roi FLOAT DEFAULT 0,
  
  -- Probability band breakdown (JSONB for flexibility)
  probability_bands JSONB DEFAULT '{
    "50-59": {"total": 0, "correct": 0, "accuracy": 0},
    "60-69": {"total": 0, "correct": 0, "accuracy": 0},
    "70-79": {"total": 0, "correct": 0, "accuracy": 0},
    "80-89": {"total": 0, "correct": 0, "accuracy": 0},
    "90-100": {"total": 0, "correct": 0, "accuracy": 0}
  }'::jsonb,
  
  -- Calibration factors
  calibration_factor_over15 FLOAT DEFAULT 1.0,
  calibration_factor_over25 FLOAT DEFAULT 1.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 4: Create function to link results to predictions
-- =====================================================

CREATE OR REPLACE FUNCTION link_result_to_prediction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update predictions table when a result is inserted
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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_link_result ON results;
CREATE TRIGGER trigger_link_result
AFTER INSERT OR UPDATE ON results
FOR EACH ROW
EXECUTE FUNCTION link_result_to_prediction();

-- =====================================================
-- STEP 5: Create function to calculate performance metrics
-- =====================================================

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

-- =====================================================
-- STEP 6: Create function to calculate calibration factor
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_calibration_factor()
RETURNS FLOAT AS $$
DECLARE
  avg_predicted FLOAT;
  avg_actual FLOAT;
  calibration FLOAT;
BEGIN
  -- Calculate average predicted probability for predictions with results
  SELECT AVG(ai_probability_over15) INTO avg_predicted
  FROM predictions
  WHERE is_correct IS NOT NULL 
  AND ai_probability_over15 IS NOT NULL;
  
  -- Calculate actual hit rate
  SELECT 
    COUNT(*) FILTER (WHERE is_correct = TRUE)::FLOAT / 
    NULLIF(COUNT(*), 0) * 100 INTO avg_actual
  FROM predictions
  WHERE is_correct IS NOT NULL;
  
  -- Calculate calibration factor
  IF avg_predicted IS NOT NULL AND avg_predicted > 0 AND avg_actual IS NOT NULL THEN
    calibration := avg_actual / avg_predicted;
  ELSE
    calibration := 1.0;
  END IF;
  
  RETURN ROUND(calibration::numeric, 4);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 7: Create view for easy performance queries
-- =====================================================

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

-- =====================================================
-- STEP 8: Grant permissions for new tables
-- =====================================================

GRANT ALL ON predictions TO anon;
GRANT ALL ON predictions TO authenticated;
GRANT ALL ON model_performance TO anon;
GRANT ALL ON model_performance TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Disable RLS for simplicity (enable in production if needed)
ALTER TABLE predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 9: Update existing results with match_date from created_at
-- =====================================================

-- This will set match_date for existing records based on created_at
UPDATE results 
SET match_date = DATE(created_at)
WHERE match_date IS NULL;

-- =====================================================
-- COMPLETE! 
-- =====================================================
-- After running this migration:
-- 1. The predictions table will track all AI predictions
-- 2. Results will automatically link to predictions
-- 3. Performance metrics can be calculated on demand
-- 4. Calibration factors adjust future predictions
