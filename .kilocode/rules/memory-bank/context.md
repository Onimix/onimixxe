# Active Context: ONIMIX Eagle Eye Pick

## Current State

**Project Status**: ✅ SAFE MODE Production Ready with Performance Tracking

The ONIMIX Eagle Eye Pick analytics engine is complete with a learning-ready architecture. It provides AI-powered Over 1.5 Goals prediction for Germany Virtual Football with automatic performance tracking and calibration.

## Recently Completed

- [x] Supabase schema setup (results + odds tables)
- [x] JSON results upload with drag-and-drop
- [x] Tab-separated odds input with validation
- [x] Historical stats calculation engine
- [x] Analysis engine with SAFE/MODERATE/RISKY prediction
- [x] Production-ready dashboard UI
- [x] TypeScript strict mode
- [x] Build and lint checks passing
- [x] **Performance tracking system** (2026-02-21)
- [x] **Predictions table with result linking**
- [x] **Calibration logic for probability adjustment**
- [x] **Model performance metrics display**
- [x] **Date field support in odds/results input**

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Main dashboard | ✅ Ready |
| `src/app/layout.tsx` | Root layout | ✅ Ready |
| `src/app/globals.css` | Global styles | ✅ Ready |
| `src/app/api/model-performance/route.ts` | Performance API | ✅ Ready |
| `src/lib/supabase.ts` | Supabase client & DB ops | ✅ Ready |
| `src/lib/types.ts` | TypeScript types | ✅ Ready |
| `src/lib/analysis.ts` | Analysis engine | ✅ Ready |
| `src/components/JsonUploader.tsx` | JSON upload | ✅ Ready |
| `src/components/OddsInput.tsx` | Odds paste input | ✅ Ready |
| `src/components/HistoricalStats.tsx` | Stats panel | ✅ Ready |
| `src/components/PredictionPanel.tsx` | Predictions display | ✅ Ready |
| `supabase/schema.sql` | DB schema | ✅ Ready |
| `supabase/migration-performance-tracking.sql` | Performance migration | ✅ Ready |
| `.env.example` | Environment template | ✅ Ready |

## Current Focus

The application is deployed and in production. Supabase is configured at `zalplokogrvqkivrqlsn.supabase.co`.

**IMPORTANT**: Run the migration script `supabase/migration-performance-tracking.sql` in Supabase SQL Editor to enable performance tracking.

## Deployment Configuration

### Supabase Project
- **Project URL**: `https://zalplokogrvqkivrqlsn.supabase.co`
- **Schema**: `supabase/schema.sql` has been applied
- **Migration**: `supabase/migration-performance-tracking.sql` needs to be applied

### Environment Variables (Vercel)
Set these in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://zalplokogrvqkivrqlsn.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = your publishable key

The code supports both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` variable names.

## Features

### Data Ingestion
- JSON file upload (Sporty vFootball format)
- Tab-separated odds paste input with date support (DD/MM/YYYY)
- Tab-separated results input with date support
- Duplicate prevention with unique constraints

### Analysis Engine
- Block time analysis
- Team-based statistics
- Over 1.5 prediction with confidence scores
- **Calibrated probability based on historical performance**

### Prediction Output
- SAFE: ≥75% hit rate + ≥2.2 avg goals
- MODERATE: ≥60% hit rate + ≥1.8 avg goals
- RISKY: Below threshold

### Performance Tracking (NEW)
- Predictions stored with match details
- Automatic result linking via database trigger
- Accuracy by probability band (50-59%, 60-69%, etc.)
- Rolling 50 predictions accuracy
- ROI calculation
- Calibration factor for probability adjustment

## Input Formats

### Odds Input (Tab-Separated)
```
Date	Time	Event	1	X	2	Goals	Over	Under
26/01/2026	05:36	FCA - HDH	2.51	3.46	2.93	2.5	2.32	1.64
```

### Results Input (Tab-Separated)
```
Date	Time	Match and Result
26/01/2026	08:24	BVB 0-2 SCF
```

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-02-19 | ONIMIX Eagle Eye Pick analytics engine complete |
| 2026-02-19 | Pushed to GitHub: https://github.com/Onimix/ONIMIXXE.git |
| 2026-02-20 | Fixed build error: Added URL validation for missing env vars |
| 2026-02-20 | Added support for PUBLISHABLE_DEFAULT_KEY env variable |
| 2026-02-20 | Docs: Update context.md with deployment configuration |
| 2026-02-20 | Added powerful 5D rotating flames around dashboard edges |
| 2026-02-20 | Replaced flames with Matrix rain effect (tiny falling code on all 4 edges) |
| 2026-02-21 | Added performance tracking system with predictions table |
| 2026-02-21 | Added calibration logic and model performance display |
| 2026-02-21 | Added date field support to odds and results input |
