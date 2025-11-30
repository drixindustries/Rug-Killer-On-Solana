/*
 * Compare two ML weight JSON files.
 * Usage:
 *   npx tsx scripts/diff-weights.ts ml/backups/weights-2025-11-30-01.json ml/new-weights.json
 */
import { readFileSync } from 'fs';

function load(p: string) {
  return JSON.parse(readFileSync(p,'utf-8'));
}

function main() {
  const [aPath,bPath] = process.argv.slice(2);
  if (!aPath || !bPath) {
    console.error('Usage: tsx scripts/diff-weights.ts <old.json> <new.json>');
    process.exit(1);
  }
  const a = load(aPath); const b = load(bPath);
  const aw = a.featureWeights || {}; const bw = b.featureWeights || {};
  const allKeys = Array.from(new Set([...Object.keys(aw),...Object.keys(bw)])).sort();
  console.log(`Diff ${aPath} -> ${bPath}`);
  for (const k of allKeys) {
    const ov = aw[k]; const nv = bw[k];
    if (ov === undefined) {
      console.log(` + ${k}: added ${nv}`);
    } else if (nv === undefined) {
      console.log(` - ${k}: removed (was ${ov})`);
    } else if (ov !== nv) {
      const delta = (nv - ov).toFixed(2);
      console.log(` * ${k}: ${ov} -> ${nv} (Δ ${delta})`);
    }
  }
}

main();
