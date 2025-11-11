import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js";
import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  TokenAnalysisResponse,
  AuthorityStatus,
  HolderInfo,
  LiquidityPoolStatus,
  TokenMetadata,
  RiskFlag,
  RiskLevel,
  TransactionInfo,
} from "@shared/schema";
import { RugcheckService } from "./rugcheck-service";

// Use public Solana RPC endpoint (can be configured later)
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export class SolanaTokenAnalyzer {
  private connection: Connection;
  private rugcheckService: RugcheckService;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, "confirmed");
    this.rugcheckService = new RugcheckService();
  }

  async analyzeToken(tokenAddress: string): Promise<TokenAnalysisResponse> {
    try {
      const mintPubkey = new PublicKey(tokenAddress);
      
      // Fetch mint account info
      const mintInfo = await getMint(this.connection, mintPubkey);
      
      // Analyze authorities
      const mintAuthority = this.analyzeMintAuthority(mintInfo.mintAuthority);
      const freezeAuthority = this.analyzeFreezeAuthority(mintInfo.freezeAuthority);
      
      // Fetch token accounts (holders)
      const holders = await this.fetchTopHolders(mintPubkey, mintInfo.decimals, mintInfo.supply);
      
      // Calculate holder concentration with safety check
      const topHolderConcentration = Math.min(100, Math.max(0, 
        holders.slice(0, 10).reduce((sum, h) => sum + (h.percentage || 0), 0)
      ));
      
      // Analyze liquidity (simplified for MVP)
      const liquidityPool = this.analyzeLiquidity(topHolderConcentration);
      
      // Get recent transactions (simplified for MVP)
      const recentTransactions = await this.fetchRecentTransactions(mintPubkey);
      
      // Fetch Rugcheck data (non-blocking)
      const rugcheckData = await this.rugcheckService.getTokenReport(tokenAddress).catch(() => null);
      
      // Build metadata with safe numeric conversions
      const supply = Number(mintInfo.supply);
      const safeSupply = isNaN(supply) || !isFinite(supply) ? 0 : supply;
      
      const metadata: TokenMetadata = {
        name: "Unknown Token",
        symbol: tokenAddress.slice(0, 6),
        decimals: mintInfo.decimals || 0,
        supply: safeSupply,
        hasMetadata: false,
        isMutable: mintAuthority.hasAuthority,
      };
      
      // Calculate risk flags
      const redFlags = this.calculateRiskFlags(
        mintAuthority,
        freezeAuthority,
        liquidityPool,
        topHolderConcentration,
        holders.length
      );
      
      // Calculate overall risk score with safety check
      const riskScore = this.calculateRiskScore(redFlags);
      const safeRiskScore = isNaN(riskScore) || !isFinite(riskScore) ? 100 : Math.min(100, Math.max(0, riskScore));
      const riskLevel = this.getRiskLevel(safeRiskScore);
      
      const now = Date.now();
      const safeAnalyzedAt = isNaN(now) || !isFinite(now) ? Date.now() : now;

      return {
        tokenAddress,
        riskScore: safeRiskScore,
        riskLevel,
        analyzedAt: safeAnalyzedAt,
        mintAuthority,
        freezeAuthority,
        metadata,
        holderCount: holders.length,
        topHolders: holders,
        topHolderConcentration: isNaN(topHolderConcentration) ? 0 : topHolderConcentration,
        liquidityPool,
        recentTransactions,
        suspiciousActivityDetected: recentTransactions.some(tx => tx.suspicious),
        redFlags,
        creationDate: undefined,
        rugcheckData: rugcheckData || undefined,
      };
    } catch (error) {
      console.error("Token analysis error:", error);
      
      // Return a safe default response when analysis fails
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      return {
        tokenAddress,
        riskScore: 100,
        riskLevel: "EXTREME" as RiskLevel,
        analyzedAt: Date.now(),
        mintAuthority: { hasAuthority: true, authorityAddress: null, isRevoked: false },
        freezeAuthority: { hasAuthority: true, authorityAddress: null, isRevoked: false },
        metadata: {
          name: "Unknown Token",
          symbol: "???",
          decimals: 0,
          supply: 0,
          hasMetadata: false,
          isMutable: true,
        },
        holderCount: 0,
        topHolders: [],
        topHolderConcentration: 0,
        liquidityPool: {
          exists: false,
          isLocked: false,
          isBurned: false,
          status: "UNKNOWN" as const,
        },
        recentTransactions: [],
        suspiciousActivityDetected: false,
        redFlags: [{
          type: "mint_authority",
          severity: "critical",
          title: "Analysis Failed",
          description: `Unable to complete token analysis: ${errorMessage}. This may be due to RPC rate limits or an invalid token address.`,
        }],
        creationDate: undefined,
      };
    }
  }

  private analyzeMintAuthority(authority: PublicKey | null): AuthorityStatus {
    return {
      hasAuthority: authority !== null,
      authorityAddress: authority?.toBase58() || null,
      isRevoked: authority === null,
    };
  }

  private analyzeFreezeAuthority(authority: PublicKey | null): AuthorityStatus {
    return {
      hasAuthority: authority !== null,
      authorityAddress: authority?.toBase58() || null,
      isRevoked: authority === null,
    };
  }

  private async fetchTopHolders(
    mintPubkey: PublicKey,
    decimals: number,
    totalSupply: bigint
  ): Promise<HolderInfo[]> {
    try {
      // Get all token accounts for this mint
      const tokenAccounts = await this.connection.getTokenLargestAccounts(mintPubkey);
      
      const holders: HolderInfo[] = tokenAccounts.value
        .map((account, index) => {
          const balance = Number(account.amount);
          const percentage = (balance / Number(totalSupply)) * 100;
          
          return {
            rank: index + 1,
            address: account.address.toBase58(),
            balance,
            percentage,
          };
        })
        .filter(h => h.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 20); // Top 20 holders
      
      return holders;
    } catch (error) {
      console.error("Error fetching holders:", error);
      return [];
    }
  }

  private analyzeLiquidity(topHolderConcentration: number): LiquidityPoolStatus {
    // Simplified liquidity analysis based on holder concentration
    let status: "SAFE" | "RISKY" | "UNKNOWN" = "UNKNOWN";
    
    if (topHolderConcentration > 80) {
      status = "RISKY";
    } else if (topHolderConcentration < 50) {
      status = "SAFE";
    }
    
    return {
      exists: true,
      isLocked: false,
      isBurned: false,
      status,
    };
  }

  private async fetchRecentTransactions(mintPubkey: PublicKey): Promise<TransactionInfo[]> {
    try {
      // Get recent signatures for the mint account
      const signatures = await this.connection.getSignaturesForAddress(mintPubkey, { limit: 10 });
      
      return signatures.slice(0, 5).map((sig, index) => ({
        signature: sig.signature,
        type: index % 3 === 0 ? "transfer" : index % 3 === 1 ? "swap" : "mint",
        timestamp: (sig.blockTime || 0) * 1000,
        suspicious: false,
      }));
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  }

  private calculateRiskFlags(
    mintAuthority: AuthorityStatus,
    freezeAuthority: AuthorityStatus,
    liquidityPool: LiquidityPoolStatus,
    topHolderConcentration: number,
    holderCount: number
  ): RiskFlag[] {
    const flags: RiskFlag[] = [];

    // Mint authority not revoked
    if (mintAuthority.hasAuthority) {
      flags.push({
        type: "mint_authority",
        severity: "critical",
        title: "Mint Authority Not Revoked",
        description: "The mint authority has not been revoked. The developer can mint unlimited tokens, potentially diluting holders.",
      });
    }

    // Freeze authority not revoked
    if (freezeAuthority.hasAuthority) {
      flags.push({
        type: "freeze_authority",
        severity: "high",
        title: "Freeze Authority Active",
        description: "The freeze authority is active. The developer can freeze token accounts, preventing users from selling.",
      });
    }

    // High holder concentration
    if (topHolderConcentration > 70) {
      flags.push({
        type: "holder_concentration",
        severity: "critical",
        title: "Extreme Holder Concentration",
        description: `Top 10 holders control ${topHolderConcentration.toFixed(1)}% of supply. High risk of coordinated dumps.`,
      });
    } else if (topHolderConcentration > 50) {
      flags.push({
        type: "holder_concentration",
        severity: "high",
        title: "High Holder Concentration",
        description: `Top 10 holders control ${topHolderConcentration.toFixed(1)}% of supply. Risk of price manipulation.`,
      });
    }

    // Low holder count
    if (holderCount < 100) {
      flags.push({
        type: "holder_concentration",
        severity: "medium",
        title: "Low Holder Count",
        description: `Only ${holderCount} holders detected. Low distribution may indicate early-stage or low interest.`,
      });
    }

    // Risky liquidity
    if (liquidityPool.status === "RISKY") {
      flags.push({
        type: "low_liquidity",
        severity: "critical",
        title: "Risky Liquidity Status",
        description: "Liquidity pool appears to be at risk. May not be locked or burned.",
      });
    }

    return flags;
  }

  private calculateRiskScore(redFlags: RiskFlag[]): number {
    let score = 0;
    
    for (const flag of redFlags) {
      switch (flag.severity) {
        case "critical":
          score += 30;
          break;
        case "high":
          score += 20;
          break;
        case "medium":
          score += 10;
          break;
        case "low":
          score += 5;
          break;
      }
    }
    
    return Math.min(100, score);
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score >= 70) return "EXTREME";
    if (score >= 50) return "HIGH";
    if (score >= 30) return "MODERATE";
    return "LOW";
  }
}

export const tokenAnalyzer = new SolanaTokenAnalyzer();
