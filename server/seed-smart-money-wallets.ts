
import 'dotenv/config';
import Papa from 'papaparse';
import { db } from './db';
import { smartWallets } from '../shared/schema';

const DUNE_EXECUTION_ID = '8342646';
const DUNE_API_KEY = process.env.DUNE_API_KEY;

if (!DUNE_API_KEY) {
  console.error('DUNE_API_KEY environment variable is not set.');
  process.exit(1);
}

const DUNE_API_URL = `https://api.dune.com/api/v1/execution/${DUNE_EXECUTION_ID}/results/csv`;

async function fetchDuneData() {
  console.log('Fetching smart money wallets from Dune...');
  const response = await fetch(DUNE_API_URL, {
    headers: {
      'X-Dune-API-Key': DUNE_API_KEY,
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch data from Dune API: ${response.statusText}`);
    console.error(await response.text());
    process.exit(1);
  }

  const csvText = await response.text();
  return csvText;
}

async function seedWallets() {
  const csvData = await fetchDuneData();

  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    console.error('Errors parsing CSV:', parsed.errors);
    process.exit(1);
  }

  const walletsToInsert = parsed.data
    .map((row: any) => {
      const address = row.user_address || row.address; // Adjust based on CSV column name
      if (!address) {
        // console.warn('Skipping row with no address:', row);
        return null;
      }
      return {
        address: address.trim(),
        source: 'dune-smart-money',
        name: row.name || row.label || `Smart Money Wallet`,
      };
    })
    .filter((w) => w !== null) as (typeof smartWallets.$inferInsert)[];

  if (walletsToInsert.length === 0) {
    console.log('No new wallets found to insert.');
    return;
  }

  console.log(`Found ${walletsToInsert.length} wallets. Upserting into database...`);

  try {
    await db
      .insert(smartWallets)
      .values(walletsToInsert)
      .onConflictDoUpdate({
        target: smartWallets.address,
        set: {
          source: 'dune-smart-money', // You might want to update the source or name if a wallet is found in multiple lists
        },
      });
    console.log('Successfully seeded smart money wallets.');
  } catch (error) {
    console.error('Error seeding wallets:', error);
  }
}

seedWallets().finally(() => {
  console.log('Seeding process finished.');
});
