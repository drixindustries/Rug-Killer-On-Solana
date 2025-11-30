# ML Training & Dynamic Weights Workflow (2025)

This document explains how to retrain, version, diff, and apply dynamic ML weights for the in-process TypeScript Decision Tree scorer.

## Overview
The scorer (`mlScorer`) now supports dynamic feature weights loaded from `ml/new-weights.json`. If present, it bumps its internal version to `v1.1-dyn` and adjusts per-factor impacts. Metadata (version + generated date) surfaces in formatted bot output.

## Key Files
- `server/services/ml-scorer.ts` – Runtime scorer with dynamic load logic.
- `scripts/train-ml-tree.ts` – Lightweight statistics-based trainer (diff-of-means & prevalence lift).
- `scripts/retrain-ml.ts` – Orchestrates retraining, backups, and diff summary.
- `scripts/diff-weights.ts` – Ad-hoc comparison of two weight snapshots.
- `ml/dataset/sample-tokens.csv` – Example dataset schema & sample rows.
- `ml/new-weights.json` – Active dynamic weight file (generated).
- `ml/backups/` – Auto-created directory holding historical snapshots.

## Dataset Schema
CSV columns (header required):
```
topHolderPercent,top10Concentration,holderCount,liquidityUSD,poolLocked,poolBurned,mintEnabled,freezeEnabled,ageHours,volume24h,txns24h,priceChange24h,buyPressure,isPumpFun,bondingCurve,hasWebsite,hasTwitter,hasTelegram,outcome
```
Where `outcome` is `1` (rug) or `0` (legit).

## Retraining Steps
1. Place/Update dataset at e.g. `ml/dataset/latest.csv`.
2. Run retrain script:
```powershell
npx tsx scripts/retrain-ml.ts ml/dataset/latest.csv
```
3. Review console diff summary.
4. Restart the bot/service so `mlScorer` reloads the new weights.

## Manual Training (Low-Level)
If you only want new weights JSON without backup/diff:
```powershell
npx tsx scripts/train-ml-tree.ts ml/dataset/latest.csv > ml/new-weights.json
```
Then restart services.

## Diff Historical Weights
Compare any backup with current:
```powershell
npx tsx scripts/diff-weights.ts ml/backups/weights-2025-11-30-12-00-00-000Z.json ml/new-weights.json
```

## Testing the Scorer
Run the test harness:
```powershell
npx tsx scripts/test-ml-scorer.ts
```
Outputs JSON with probability, confidence, top factors, dynamic version metadata.

## Confidence Calculation (Dynamic Mode)
When dynamic weights are applied the confidence blends:
- Factor coverage (triggered factor count / total potential factors)
- External weight coverage (ratio of triggered factors that had dynamic entries)
Weighted 40% coverage + 60% external coverage.

## Updating Logic / Advanced Modeling
For deeper modeling (e.g., gradient boosting, temporal weighting):
- Replace `train-ml-tree.ts` with more advanced pipeline.
- Preserve `featureWeights` shape or extend MLScorer to handle richer metadata.
- Add new fields (e.g., `variance`, `sampleSize`) to `new-weights.json` and incorporate into confidence.

## Versioning Recommendations
- Increment semantic version in `ml-scorer.ts` (e.g., `v1.2-dyn`) after major methodology change.
- Tag dataset commits (`git tag ml-dataset-YYYYMMDD`).
- Store training command & git commit hash inside `new-weights.json` (add fields `commit`, `trainCommand`).

## Rollback Procedure
1. Pick backup file from `ml/backups/`.
2. Copy it over the active file:
```powershell
Copy-Item ml\backups\weights-<timestamp>.json ml\new-weights.json -Force
```
3. Restart service.

## Troubleshooting
- Missing dynamic metadata in bot output: ensure restart after writing `ml/new-weights.json`.
- Confidence shows low values: dataset sparse, few factors triggered; expand labeled data.
- Script errors: verify CSV header alignment and no stray BOM characters.

## Future Enhancements
- Scheduled retrain (e.g., daily) via task scheduler.
- Add statistical significance filtering (exclude |Δ| below threshold).
- Factor decay weighting based on token age distribution.
- Integrate cross-validation & error metrics in output JSON.

---
Maintainer: Dynamic ML subsystem owner (update this if team changes).
