import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export class CreatorWalletService {
  private static instance: CreatorWalletService;
  private connection: Connection;
  private keypair: Keypair | null = null;

  private constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    this.loadKeypair();
  }

  static getInstance(): CreatorWalletService {
    if (!CreatorWalletService.instance) {
      CreatorWalletService.instance = new CreatorWalletService();
    }
    return CreatorWalletService.instance;
  }

  private loadKeypair(): void {
    const privateKey = process.env.CREATOR_WALLET_PRIVATE_KEY;
    
    if (privateKey && privateKey !== 'PLACEHOLDER') {
      try {
        this.keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
        console.log(`[CREATOR WALLET] Loaded wallet: ${this.keypair.publicKey.toBase58()}`);
      } catch (error) {
        console.error('[CREATOR WALLET] Failed to load keypair:', error);
      }
    } else {
      console.warn('[CREATOR WALLET] No private key configured. Set CREATOR_WALLET_PRIVATE_KEY to enable creator wallet features.');
    }
  }

  isConfigured(): boolean {
    return this.keypair !== null;
  }

  getPublicKey(): string | null {
    return this.keypair?.publicKey.toBase58() || null;
  }

  getPrivateKey(): string | null {
    if (!this.keypair) return null;
    return bs58.encode(this.keypair.secretKey);
  }

  async getBalance(): Promise<number> {
    if (!this.keypair) {
      throw new Error('Creator wallet not configured');
    }

    const balance = await this.connection.getBalance(this.keypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async getBalanceInLamports(): Promise<number> {
    if (!this.keypair) {
      throw new Error('Creator wallet not configured');
    }

    return await this.connection.getBalance(this.keypair.publicKey);
  }

  getKeypair(): Keypair {
    if (!this.keypair) {
      throw new Error('Creator wallet not configured');
    }
    return this.keypair;
  }

  async getWalletInfo(): Promise<{
    publicKey: string;
    balance: number;
    balanceLamports: number;
    isConfigured: boolean;
  }> {
    if (!this.keypair) {
      return {
        publicKey: '',
        balance: 0,
        balanceLamports: 0,
        isConfigured: false,
      };
    }

    const balanceLamports = await this.getBalanceInLamports();
    
    return {
      publicKey: this.keypair.publicKey.toBase58(),
      balance: balanceLamports / LAMPORTS_PER_SOL,
      balanceLamports,
      isConfigured: true,
    };
  }

  static generateNewWallet(): { publicKey: string; privateKey: string } {
    const keypair = Keypair.generate();
    return {
      publicKey: keypair.publicKey.toBase58(),
      privateKey: bs58.encode(keypair.secretKey),
    };
  }
}

export const getCreatorWallet = () => CreatorWalletService.getInstance();
