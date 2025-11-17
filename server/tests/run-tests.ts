// Simple test harness for server unit tests
// Discovers and runs *.test.ts files listed manually (lightweight, no Jest)
import path from 'path';
import { pathToFileURL } from 'url';

interface TestResult {
  name: string;
  passed: boolean;
  error?: any;
  durationMs: number;
}

async function run() {
  const tests: Array<{ name: string; file: string }> = [
    { name: 'Floor Detection', file: path.join(process.cwd(), '..', 'tests', 'integration', 'floor-detection.test.ts') },
  ];

  const results: TestResult[] = [];
  for (const t of tests) {
    const start = Date.now();
    try {
      // Convert absolute Windows path to file URL for ESM loader compatibility
      const fileSpecifier = t.file.includes(':') ? pathToFileURL(t.file).href : t.file;
      const mod = await import(fileSpecifier);
      if (typeof mod.run !== 'function') {
        throw new Error('Test file does not export run()');
      }
      await mod.run();
      results.push({ name: t.name, passed: true, durationMs: Date.now() - start });
    } catch (err) {
      results.push({ name: t.name, passed: false, error: err, durationMs: Date.now() - start });
    }
  }

  // Report
  console.log('\nUnit Test Results');
  console.log('==================');
  for (const r of results) {
    if (r.passed) {
      console.log(`✅ ${r.name} (${r.durationMs}ms)`);
    } else {
      console.log(`❌ ${r.name} (${r.durationMs}ms)`);
      console.error(r.error);
    }
  }

  const failed = results.filter(r => !r.passed).length;
  if (failed > 0) {
    console.error(`\n${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\nAll ${results.length} test(s) passed.`);
  }
}

run().catch(e => {
  console.error('Unhandled test harness error:', e);
  process.exit(1);
});
