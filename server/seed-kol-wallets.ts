import { db } from "./db.ts";
import { kolWallets } from "../shared/schema.ts";
import { eq } from "drizzle-orm";

// KOL wallet data from kolscan.io (as of Nov 11, 2025)
const KOL_DATA = [
  { wallet: "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o", name: "Cented", rank: 1, profit: "256.53", wins: 88, losses: 73, influence: 95 },
  { wallet: "4cXnf2z85UiZ5cyKsPMEULq1yufAtpkatmX4j4DBZqj2", name: "WaiterG", rank: 2, profit: "142.98", wins: 18, losses: 33, influence: 90 },
  { wallet: "6mWEJG9LoRdto8TwTdZxmnJpkXpTsEerizcGiCNZvzXd", name: "slingoor.usduc", rank: 3, profit: "114.32", wins: 5, losses: 4, influence: 88 },
  { wallet: "D1H83ueSw5Nxy5okxH7VBfV4jRnqAK5Mm1tm3JAj3m5t", name: "Jeets", rank: 4, profit: "82.45", wins: 1, losses: 2, influence: 85 },
  { wallet: "4BdKaxN8G6ka4GYtQQWk4G4dZRUTX2vQH9GcXdBREFUk", name: "Jijo", rank: 5, profit: "72.09", wins: 35, losses: 18, influence: 82 },
  { wallet: "CUHBzSPSaNS3tArEtM3maSV6pNdJhHJFYZpurPPK9P7H", name: "samsrep", rank: 6, profit: "65.12", wins: 9, losses: 26, influence: 80 },
  { wallet: "FAicXNV5FVqtfbpn4Zccs71XcfGeyxBSGbqLDyDJZjke", name: "radiance", rank: 7, profit: "60.41", wins: 13, losses: 9, influence: 78 },
  { wallet: "Dwo2kj88YYhwcFJiybTjXezR9a6QjkMASz5xXD7kujXC", name: "Exotic", rank: 8, profit: "55.18", wins: 40, losses: 78, influence: 75 },
  { wallet: "G6fUXjMKPJzCY1rveAE6Qm7wy5U3vZgKDJmN1VPAdiZC", name: "clukz", rank: 9, profit: "46.75", wins: 12, losses: 12, influence: 72 },
  { wallet: "5B79fMkcFeRTiwm7ehsZsFiKsC7m7n1Bgv9yLxPp9q2X", name: "bandit", rank: 10, profit: "45.89", wins: 24, losses: 26, influence: 70 },
  { wallet: "78N177fzNJpp8pG49xDv1efYcTMSzo9tPTKEA9mAVkh2", name: "Sheep", rank: 11, profit: "43.39", wins: 51, losses: 8, influence: 68 },
  { wallet: "GfXQesPe3Zuwg8JhAt6Cg8euJDTVx751enp9EQQmhzPH", name: "Spuno", rank: 12, profit: "33.48", wins: 25, losses: 41, influence: 65 },
  { wallet: "215nhcAHjQQGgwpQSJQ7zR26etbjjtVdW74NLzwEgQjP", name: "OGAntD", rank: 13, profit: "29.02", wins: 3, losses: 1, influence: 62 },
  { wallet: "BCagckXeMChUKrHEd6fKFA1uiWDtcmCXMsqaheLiUPJd", name: "dv", rank: 14, profit: "28.87", wins: 22, losses: 65, influence: 60 },
  { wallet: "B32QbbdDAyhvUQzjcaM5j6ZVKwjCxAwGH5Xgvb9SJqnC", name: "Kadenox", rank: 15, profit: "28.70", wins: 23, losses: 26, influence: 58 },
  { wallet: "5sNnKuWKUtZkdC1eFNyqz3XHpNoCRQ1D1DfHcNHMV7gn", name: "cryptovillain26", rank: 16, profit: "27.72", wins: 22, losses: 12, influence: 55 },
  { wallet: "4sAUSQFdvWRBxR8UoLBYbw8CcXuwXWxnN8pXa4mtm5nU", name: "Scharo", rank: 17, profit: "26.11", wins: 30, losses: 30, influence: 52 },
  { wallet: "PMJA8UQDyWTFw2Smhyp9jGA6aTaP7jKHR7BPudrgyYN", name: "chester", rank: 18, profit: "24.27", wins: 89, losses: 158, influence: 50 },
  { wallet: "FTg1gqW7vPm4kdU1LPM7JJnizbgPdRDy2PitKw6mY27j", name: "7", rank: 19, profit: "21.19", wins: 1, losses: 0, influence: 48 },
  { wallet: "GJA1HEbxGnqBhBifH9uQauzXSB53to5rhDrzmKxhSU65", name: "Latuche", rank: 20, profit: "19.66", wins: 14, losses: 19, influence: 45 },
  { wallet: "DuGezKLZp8UL2aQMHthoUibEC7WSbpNiKFJLTtK1QHjx", name: "Eddy", rank: 21, profit: "14.47", wins: 1, losses: 0, influence: 42 },
  { wallet: "2FbbtmK9MN3Zxkz3AnqoAGnRQNy2SVRaAazq2sFSbftM", name: "iconXBT", rank: 22, profit: "14.34", wins: 24, losses: 20, influence: 40 },
  { wallet: "AGqjivJr1dSv73TVUvdtqAwogzmThzvYMVXjGWg2FYLm", name: "noob mini", rank: 23, profit: "14.03", wins: 15, losses: 35, influence: 38 },
  { wallet: "AeLb2RpVwrqKZJ87PEiFdReiEXJXACQn17c8APQS1FHx", name: "oscar", rank: 24, profit: "13.05", wins: 23, losses: 38, influence: 35 },
  { wallet: "GNrmKZCxYyNiSUsjduwwPJzhed3LATjciiKVuSGrsHEC", name: "Giann", rank: 25, profit: "13.00", wins: 18, losses: 25, influence: 32 },
  { wallet: "BTf4A2exGK9BCVDNzy65b9dUzXgMqB4weVkvTMFQsadd", name: "Kev", rank: 26, profit: "12.98", wins: 52, losses: 100, influence: 30 },
  { wallet: "FsG3BaPmRTdSrPaivbgJsFNCCa8cPfkUtk8VLWXkHpHP", name: "Reljoo", rank: 27, profit: "12.68", wins: 5, losses: 24, influence: 28 },
  { wallet: "4YzpSZpxDdjNf3unjkCtdWEsz2FL5mok7e5XQaDNqry8", name: "xunle", rank: 28, profit: "12.65", wins: 4, losses: 10, influence: 25 },
  { wallet: "5RQEcWJZdhkxRMbwjSq32RaocgYPaWDhi3ztimWUcrwo", name: "EvansOfWeb", rank: 29, profit: "12.50", wins: 2, losses: 4, influence: 22 },
  { wallet: "EjtQrPTbcMevStBkpnjsH23NfUCMhGHusTYsHuGVQZp2", name: "Zef", rank: 30, profit: "11.03", wins: 7, losses: 15, influence: 20 },
  { wallet: "AVjEtg2ECYKXYeqdRQXvaaAZBjfTjYuSMTR4WLhKoeQN", name: "Putrick", rank: 31, profit: "10.73", wins: 47, losses: 59, influence: 18 },
  { wallet: "Di75xbVUg3u1qcmZci3NcZ8rjFMj7tsnYEoFdEMjS4ow", name: "N'o", rank: 32, profit: "10.58", wins: 13, losses: 17, influence: 15 },
  { wallet: "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN", name: "Keano", rank: 33, profit: "10.44", wins: 18, losses: 20, influence: 12 },
  { wallet: "DYAn4XpAkN5mhiXkRB7dGq4Jadnx6XYgu8L5b3WGhbrt", name: "The Doc", rank: 34, profit: "10.09", wins: 13, losses: 6, influence: 10 },
  { wallet: "FpD6n8gfoZNxyAN6QqNH4TFQdV9vZEgcv5W4H2YL8k4X", name: "Hesi", rank: 35, profit: "9.86", wins: 9, losses: 31, influence: 8 },
  { wallet: "BQVz7fQ1WsQmSTMY3umdPEPPTm1sdcBcX9sP7o6kPRmB", name: "Limfork.eth", rank: 36, profit: "9.68", wins: 17, losses: 20, influence: 6 },
  { wallet: "86AEJExyjeNNgcp7GrAvCXTDicf5aGWgoERbXFiG1EdD", name: "Publix", rank: 37, profit: "9.56", wins: 9, losses: 11, influence: 5 },
  { wallet: "ATFRUwvyMh61w2Ab6AZxUyxsAfiiuG1RqL6iv3Vi9q2B", name: "Marcell", rank: 38, profit: "9.33", wins: 1, losses: 0, influence: 4 },
  { wallet: "J23qr98GjGJJqKq9CBEnyRhHbmkaVxtTJNNxKu597wsA", name: "gr3g", rank: 39, profit: "9.19", wins: 3, losses: 0, influence: 3 },
  { wallet: "8DGbkGgQewL9mx4aXzZCUChr7hBVXvPK9fYqSqc7Ajpn", name: "Ban", rank: 40, profit: "8.59", wins: 5, losses: 4, influence: 2 },
  { wallet: "FRbUNvGxYNC1eFngpn7AD3f14aKKTJVC6zSMtvj2dyCS", name: "Henn", rank: 41, profit: "7.14", wins: 21, losses: 30, influence: 1 },
  { wallet: "AeLaMjzxErZt4drbWVWvcxpVyo8p94xu5vrg41eZPFe3", name: "^1s1mple", rank: 42, profit: "6.85", wins: 35, losses: 40, influence: 1 },
  { wallet: "9cdZg6xR4c9kZiqKSzqjn4QHCXNQuC9HEWBzzMJ3mzqw", name: "Pikalosi", rank: 43, profit: "6.82", wins: 17, losses: 12, influence: 1 },
  // Additional high-influence KOLs from kolscan.io
  { wallet: "HkFt55P3PhRWHXoTFeuvkKEE4ab26xZ1bk6UmXV88Pwz", name: "Terp", rank: 44, profit: "0", wins: 0, losses: 0, influence: 50 },
  { wallet: "EeXvxkcGqMDZeTaVeawzxm9mbzZwqDUMmfG3bF7uzumH", name: "milito", rank: 45, profit: "0", wins: 0, losses: 0, influence: 50 },
];

export async function seedKolWallets() {
  console.log("🌱 Seeding KOL wallet data...");
  
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const kol of KOL_DATA) {
    try {
      // Check if wallet already exists
      const existing = await db
        .select()
        .from(kolWallets)
        .where(eq(kolWallets.walletAddress, kol.wallet))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing wallet
        await db
          .update(kolWallets)
          .set({
            displayName: kol.name,
            rank: kol.rank,
            profitSol: kol.profit,
            wins: kol.wins,
            losses: kol.losses,
            influenceScore: kol.influence,
            isVerified: true,
            source: "kolscan",
            updatedAt: new Date(),
          })
          .where(eq(kolWallets.walletAddress, kol.wallet));
        
        updated++;
        console.log(`✅ Updated: ${kol.name} (${kol.wallet.substring(0, 8)}...)`);
      } else {
        // Insert new wallet
        await db.insert(kolWallets).values({
          walletAddress: kol.wallet,
          displayName: kol.name,
          rank: kol.rank,
          profitSol: kol.profit,
          wins: kol.wins,
          losses: kol.losses,
          influenceScore: kol.influence,
          isVerified: true,
          source: "kolscan",
          lastActiveAt: new Date(),
        });
        
        inserted++;
        console.log(`✨ Inserted: ${kol.name} (${kol.wallet.substring(0, 8)}...)`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${kol.name}:`, error.message);
      skipped++;
    }
  }
  
  console.log("\n📊 Seeding Summary:");
  console.log(`  - Inserted: ${inserted} new KOL wallets`);
  console.log(`  - Updated: ${updated} existing KOL wallets`);
  console.log(`  - Skipped: ${skipped} due to errors`);
  console.log(`  - Total: ${KOL_DATA.length} KOL wallets processed`);
  console.log("\n✅ KOL wallet seeding complete!\n");
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedKolWallets()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}
