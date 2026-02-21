-- =====================================================
-- MIGRATION: Clean Up Results Without Dates
-- Description: Delete results that don't have a match_date
--              and ensure all results are ordered by date ascending
-- =====================================================

-- Step 1: Delete results where match_date is NULL or empty
DELETE FROM results 
WHERE match_date IS NULL 
   OR match_date = '' 
   OR match_date = 'null';

-- Step 2: Create an index on match_date for faster ordering (if not exists)
CREATE INDEX IF NOT EXISTS idx_results_match_date ON results(match_date);

-- Step 3: Create a view for results ordered by date ascending
CREATE OR REPLACE VIEW results_ordered AS
SELECT 
  id,
  match_date,
  block_time,
  home_team,
  away_team,
  home_goals,
  away_goals,
  total_goals,
  over_15,
  over_25,
  created_at
FROM results
WHERE match_date IS NOT NULL AND match_date != ''
ORDER BY 
  match_date ASC,
  block_time ASC;

-- Step 4: Add comment to document this migration
COMMENT ON VIEW results_ordered IS 'Results ordered by match_date ascending - created 2026-02-21';

-- =====================================================
-- VERIFICATION QUERIES (Run these to check the results)
-- =====================================================

-- Check how many results were deleted
-- SELECT COUNT(*) FROM results WHERE match_date IS NULL OR match_date = '';

-- Check total remaining results
-- SELECT COUNT(*) FROM results;

-- Check results ordered by date
-- SELECT * FROM results_ordered LIMIT 20;

-- =====================================================
-- OPTIONAL: If you want to see the distribution of dates
-- =====================================================
-- SELECT match_date, COUNT(*) as count 
-- FROM results 
-- WHERE match_date IS NOT NULL AND match_date != ''
-- GROUP BY match_date 
-- ORDER BY match_date ASC;
