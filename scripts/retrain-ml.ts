/*
 * Retrain ML weights, backup previous, emit diff summary.
 * Usage:
 *   npx tsx scripts/retrain-ml.ts ml/dataset/sample-tokens.csv
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, appendFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

function log(msg: string, level: 'INFO' | 'ERROR' | 'SUCCESS' = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  console.log(`${prefix} ${msg}`);
  
  // Also append to log file if in logs directory
  const logDir = join(process.cwd(), 'logs');
  if (existsSync(logDir)) {
    const logFile = join(logDir, `ml-retrain-${new Date().toISOString().split('T')[0]}.log`);
    appendFileSync(logFile, `${prefix} ${msg}\n`, 'utf-8');
  }
}

function main() {
  const dataset = process.argv[2];
  if (!dataset) {
    log('Usage: tsx scripts/retrain-ml.ts <dataset.csv>', 'ERROR');
    process.exit(1);
  }
  
  log('=== ML Retraining Started ===');
  log(`Dataset: ${dataset}`);
  
  const weightsPath = join(process.cwd(),'ml','new-weights.json');
  const backupsDir = join(process.cwd(),'ml','backups');
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir,{recursive:true});
    log(`Created backups directory: ${backupsDir}`);
  }
  
  let prev: any = null;
  if (existsSync(weightsPath)) {
    prev = JSON.parse(readFileSync(weightsPath,'utf-8'));
    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    const backupName = join(backupsDir,`weights-${stamp}.json`);
    renameSync(weightsPath, backupName);
    log(`Backed up previous weights to ${backupName}`);
  }
  
  // Run training script
  log('Running training script...');
  const train = spawnSync('npx',['tsx','scripts/train-ml-tree.ts',dataset],{cwd:process.cwd(),encoding:'utf-8'});
  if (train.status !== 0) {
    log('Training script failed', 'ERROR');
    console.error(train.stdout);
    console.error(train.stderr);
    process.exit(train.status || 1);
  }
  
  writeFileSync(weightsPath, train.stdout.trim()+"\n", 'utf-8');
  log(`Wrote new weights to ${weightsPath}`, 'SUCCESS');
  const next = JSON.parse(train.stdout);
  if (prev) {
    log('Weight diff summary:');
    const oldW = prev.featureWeights || {};
    const newW = next.featureWeights || {};
    const allKeys = Array.from(new Set([...Object.keys(oldW),...Object.keys(newW)])).sort();
    let changes = 0;
    for (const k of allKeys) {
      const o = oldW[k];
      const n = newW[k];
      if (o === undefined) {
        console.log(` + ${k}: added ${n}`);
        changes++;
      } else if (n === undefined) {
        console.log(` - ${k}: removed (was ${o})`);
        changes++;
      } else if (o !== n) {
        const delta = (n - o).toFixed(2);
        console.log(` * ${k}: ${o} -> ${n} (Δ ${delta})`);
        changes++;
      }
    }
    log(`Total changes: ${changes} features modified`);
  } else {
    log('No previous weights to diff. Initial creation complete.');
  }
  
  log('=== ML Retraining Completed Successfully ===', 'SUCCESS');
}

main();
