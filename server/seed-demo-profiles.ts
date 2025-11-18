import { storage } from "./storage";

async function seed() {
  console.log("Seeding demo user profiles...");

  const demos = [
    {
      id: "demo_alice",
      username: "alice",
      bio: "Early rug hunter. Charts before coffee.",
      reputationScore: 820,
      contributionCount: 37,
      activities: [
        { type: "comment", points: 50 },
        { type: "vote", points: 20 },
        { type: "watchlist_share", points: 30 },
        { type: "report", points: 20 },
        { type: "helpful_vote", points: 700 },
      ],
    },
    {
      id: "demo_bob",
      username: "bob",
      bio: "Token forensic. Loves liquidity heatmaps.",
      reputationScore: 265,
      contributionCount: 12,
      activities: [
        { type: "comment", points: 40 },
        { type: "vote", points: 25 },
        { type: "report", points: 50 },
        { type: "helpful_vote", points: 150 },
      ],
    },
  ];

  for (const d of demos) {
    // Ensure base user exists
    await storage.upsertUser({ id: d.id, email: null as any });

    // Create or update profile
    const existing = await storage.getUserProfile(d.id);
    if (!existing) {
      await storage.createUserProfile({
        userId: d.id,
        // Casting as any to keep the script simple and avoid type wrangling here
        username: d.username,
        bio: d.bio,
        visibility: "public",
        reputationScore: d.reputationScore,
        contributionCount: d.contributionCount,
      } as any);
      console.log(`Created profile for ${d.username}`);
    } else {
      await storage.updateUserProfile(d.id, {
        username: d.username,
        bio: d.bio,
        visibility: "public",
        reputationScore: d.reputationScore,
        contributionCount: d.contributionCount,
      } as any);
      console.log(`Updated profile for ${d.username}`);
    }

    // Seed a few activities so future reputation recalcs are consistent
    for (const a of d.activities) {
      await storage.recordActivity({
        userId: d.id,
        activityType: a.type,
        points: a.points,
      } as any);
    }
  }

  console.log("✅ Demo profiles seeded");
}

seed().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
