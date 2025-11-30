/*
 * Retrain ML weights, backup previous, emit diff summary.
 * Usage:
 *   npx tsx scripts/retrain-ml.ts ml/dataset/sample-tokens.csv
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

function main() {
  const dataset = process.argv[2];
  if (!dataset) {
    console.error('Usage: tsx scripts/retrain-ml.ts <dataset.csv>');
    process.exit(1);
  }
  const weightsPath = join(process.cwd(),'ml','new-weights.json');
  const backupsDir = join(process.cwd(),'ml','backups');
  if (!existsSync(backupsDir)) mkdirSync(backupsDir,{recursive:true});
  let prev: any = null;
  if (existsSync(weightsPath)) {
    prev = JSON.parse(readFileSync(weightsPath,'utf-8'));
    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    const backupName = join(backupsDir,`weights-${stamp}.json`);
    renameSync(weightsPath, backupName);
    console.log(`Backed up previous weights to ${backupName}`);
  }
  // Run training script
  const train = spawnSync('npx',['tsx','scripts/train-ml-tree.ts',dataset],{cwd:process.cwd(),encoding:'utf-8'});
  if (train.status !== 0) {
    console.error(train.stdout);
    console.error(train.stderr);
    process.exit(train.status || 1);
  }
  writeFileSync(weightsPath, train.stdout.trim()+"\n", 'utf-8');
  console.log(`Wrote new weights to ${weightsPath}`);
  const next = JSON.parse(train.stdout);
  if (prev) {
    console.log('Diff summary:');
    const oldW = prev.featureWeights || {};
    const newW = next.featureWeights || {};
    const allKeys = Array.from(new Set([...Object.keys(oldW),...Object.keys(newW)])).sort();
    for (const k of allKeys) {
      const o = oldW[k];
      const n = newW[k];
      if (o === undefined) {
        console.log(` + ${k}: added ${n}`);
      } else if (n === undefined) {
        console.log(` - ${k}: removed (was ${o})`);
      } else if (o !== n) {
        const delta = (n - o).toFixed(2);
        console.log(` * ${k}: ${o} -> ${n} (Δ ${delta})`);
      }
    }
  } else {
    console.log('No previous weights to diff. Initial creation complete.');
  }
}

main();
