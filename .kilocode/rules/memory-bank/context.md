# Active Context: ONIMIX Eagle Eye Pick

## Current State

**Project Status**: ✅ SAFE MODE Production Ready

The ONIMIX Eagle Eye Pick analytics engine is complete and ready for deployment. It provides AI-powered Over 1.5 Goals prediction for Germany Virtual Football.

## Recently Completed

- [x] Supabase schema setup (results + odds tables)
- [x] JSON results upload with drag-and-drop
- [x] Tab-separated odds input with validation
- [x] Historical stats calculation engine
- [x] Analysis engine with SAFE/MODERATE/RISKY prediction
- [x] Production-ready dashboard UI
- [x] TypeScript strict mode
- [x] Build and lint checks passing

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Main dashboard | ✅ Ready |
| `src/app/layout.tsx` | Root layout | ✅ Ready |
| `src/app/globals.css` | Global styles | ✅ Ready |
| `src/lib/supabase.ts` | Supabase client & DB ops | ✅ Ready |
| `src/lib/types.ts` | TypeScript types | ✅ Ready |
| `src/lib/analysis.ts` | Analysis engine | ✅ Ready |
| `src/components/JsonUploader.tsx` | JSON upload | ✅ Ready |
| `src/components/OddsInput.tsx` | Odds paste input | ✅ Ready |
| `src/components/HistoricalStats.tsx` | Stats panel | ✅ Ready |
| `src/components/PredictionPanel.tsx` | Predictions display | ✅ Ready |
| `supabase/schema.sql` | DB schema | ✅ Ready |
| `.env.example` | Environment template | ✅ Ready |

## Current Focus

The application is deployed and in production. Supabase is configured at `zalplokogrvqkivrqlsn.supabase.co`.

## Deployment Configuration

### Supabase Project
- **Project URL**: `https://zalplokogrvqkivrqlsn.supabase.co`
- **Schema**: `supabase/schema.sql` has been applied

### Environment Variables (Vercel)
Set these in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://zalplokogrvqkivrqlsn.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = your publishable key

The code supports both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` variable names.

## Features

### Data Ingestion
- JSON file upload (Sporty vFootball format)
- Tab-separated odds paste input
- Duplicate prevention with unique constraints

### Analysis Engine
- Block time analysis
- Team-based statistics
- Over 1.5 prediction with confidence scores

### Prediction Output
- SAFE: ≥75% hit rate + ≥2.2 avg goals
- MODERATE: ≥60% hit rate + ≥1.8 avg goals
- RISKY: Below threshold

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
