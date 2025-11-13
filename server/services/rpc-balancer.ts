import { Connection } from "@solana/web3.js";

interface RpcProvider {
  url: string;
  weight: number;
  name: string;
  score: number;
  fails: number;
}

const RPC_PROVIDERS = [
  { 
    url: `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_KEY || ""}`, 
    weight: 40, 
    name: "Helius" 
  },
  { 
    url: `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY || ""}`, 
    weight: 35, 
    name: "Alchemy" 
  },
  { 
    url: "https://rpc.ankr.com/solana", 
    weight: 15, 
    name: "Ankr" 
  },
  { 
    url: "https://solana-api.projectserum.com", 
    weight: 10, 
    name: "Serum" 
  },
  { 
    url: "https://api.mainnet-beta.solana.com", 
    weight: 5, 
    name: "Public" 
  },
];

export class SolanaRpcBalancer {
  public providers: RpcProvider[];
  private totalWeight: number;

  constructor(providers: typeof RPC_PROVIDERS) {
    this.providers = providers.map(p => ({
      ...p,
      score: 100,
      fails: 0,
    }));
    this.totalWeight = providers.reduce((s, p) => s + p.weight, 0);
  }

  select(): RpcProvider {
    const healthy = this.providers.filter(p => p.score > 50);
    if (healthy.length === 0) {
      console.log('[RPC Balancer] All providers unhealthy, resetting scores');
      this.providers.forEach(p => p.score = 100);
      return this.select();
    }
    const weighted: RpcProvider[] = [];
    for (const p of healthy) {
      for (let i = 0; i < p.weight; i++) {
        weighted.push(p);
      }
    }
    const selected = weighted[Math.floor(Math.random() * weighted.length)];
    console.log(`[RPC Balancer] Selected provider: ${selected.name} (score: ${selected.score})`);
    return selected;
  }

  getConnection(): Connection {
    const provider = this.select();
    return new Connection(provider.url, { commitment: "confirmed" });
  }

  getHealthStats() {
    return this.providers.map(p => ({
      name: p.name,
      score: p.score,
      fails: p.fails,
      weight: p.weight,
    }));
  }
}

// Export singleton instance
export const rpcBalancer = new SolanaRpcBalancer(RPC_PROVIDERS);

// Health check interval - ping all providers every 30 seconds
setInterval(() => {
  rpcBalancer.providers.forEach(async (p) => {
    try {
      const conn = new Connection(p.url, { commitment: "confirmed" });
      await conn.getSlot();
      p.score = Math.min(100, p.score + 5);
    } catch (error) {
      p.score = Math.max(0, p.score - 10);
      p.fails++;
    }
  });
}, 30000);
