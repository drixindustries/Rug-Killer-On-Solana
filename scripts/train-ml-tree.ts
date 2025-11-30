/**
 * Simple retraining utility for the MLScorer weights.
 *
 * Usage:
 *   npx tsx scripts/train-ml-tree.ts ml/dataset/tokens.csv > ml/new-weights.json
 *
 * Expected CSV columns (header row required):
 *   topHolderPercent,top10Concentration,holderCount,liquidityUSD,poolLocked,poolBurned,mintEnabled,freezeEnabled,ageHours,volume24h,txns24h,priceChange24h,buyPressure,isPumpFun,bondingCurve,hasWebsite,hasTwitter,hasTelegram,outcome
 * where outcome = 1 (rug) or 0 (legit)
 *
 * This script computes simple point-biserial style correlations and frequency-based lift scores
 * then rescales them into a weight object compatible with MLScorer.
 * It is intentionally lightweight; for more advanced modeling move to a separate pipeline.
 */

import { readFileSync } from 'fs';

interface Row { [k: string]: string; }

function parseCSV(path: string): Row[] {
  const raw = readFileSync(path, 'utf-8');
  const [headerLine, ...lines] = raw.trim().split(/\r?\n/);
  const headers = headerLine.split(',').map(h => h.trim());
  return lines.map(l => {
    const parts = l.split(',');
    const row: Row = {};
    headers.forEach((h, i) => row[h] = parts[i]);
    return row;
  });
}

function toNum(row: Row, key: string): number | null {
  const v = row[key];
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function train(path: string) {
  const rows = parseCSV(path);
  if (rows.length === 0) throw new Error('Dataset empty');
  const numericKeys = [
    'topHolderPercent','top10Concentration','holderCount','liquidityUSD','ageHours','volume24h','txns24h','priceChange24h','buyPressure','bondingCurve'
  ];
  const binaryKeys = ['poolLocked','poolBurned','mintEnabled','freezeEnabled','isPumpFun','hasWebsite','hasTwitter','hasTelegram'];
  const outcomeKey = 'outcome';

  // Compute mean outcome
  const outcomes = rows.map(r => Number(r[outcomeKey])).filter(n => n === 0 || n === 1);
  const meanOutcome = outcomes.reduce((a,b)=>a+b,0)/outcomes.length;

  const weights: Record<string, number> = {};

  // Simple correlation-ish metric: difference in means (rug vs legit) scaled
  for (const key of numericKeys) {
    const rugVals: number[] = [];
    const legitVals: number[] = [];
    for (const r of rows) {
      const val = toNum(r,key);
      const out = Number(r[outcomeKey]);
      if (val === null || (out !== 0 && out !== 1)) continue;
      if (out === 1) rugVals.push(val); else legitVals.push(val);
    }
    if (rugVals.length < 10 || legitVals.length < 10) continue;
    const meanRug = rugVals.reduce((a,b)=>a+b,0)/rugVals.length;
    const meanLegit = legitVals.reduce((a,b)=>a+b,0)/legitVals.length;
    const diff = meanRug - meanLegit;
    // Scale by absolute diff / (legit mean + epsilon)
    const score = (diff)/(Math.abs(meanLegit)+1e-6);
    weights[key] = Number((score*25).toFixed(2));
  }

  // Binary prevalence lift
  for (const key of binaryKeys) {
    let rugCount=0, legitCount=0, rugOn=0, legitOn=0;
    for (const r of rows) {
      const out = Number(r[outcomeKey]);
      if (out !== 0 && out !== 1) continue;
      const on = r[key] === 'true' || r[key] === '1';
      if (out === 1) { rugCount++; if (on) rugOn++; } else { legitCount++; if (on) legitOn++; }
    }
    if (rugCount < 10 || legitCount < 10) continue;
    const pRug = rugOn / rugCount;
    const pLegit = legitOn / legitCount;
    const lift = pRug - pLegit;
    weights[key] = Number((lift*30).toFixed(2));
  }

  // Basic normalization: cap extremes
  for (const k of Object.keys(weights)) {
    if (weights[k] > 40) weights[k] = 40;
    if (weights[k] < -40) weights[k] = -40;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    meanOutcome,
    featureWeights: weights,
    notes: 'Weights derived from simple diff-of-means and prevalence lift. Replace with advanced model if needed.'
  };
  console.log(JSON.stringify(output,null,2));
}

if (process.argv[2]) {
  try {
    train(process.argv[2]);
  } catch (e:any) {
    console.error('Training failed:', e.message);
    process.exit(1);
  }
} else {
  console.error('Usage: tsx scripts/train-ml-tree.ts <dataset.csv>');
  process.exit(1);
}
