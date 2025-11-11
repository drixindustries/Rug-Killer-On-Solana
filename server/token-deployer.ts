import { 
  Connection, 
  Keypair, 
  PublicKey,
  SystemProgram, 
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { getCreatorWallet } from './creator-wallet';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export interface TokenDeploymentConfig {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  description?: string;
  mintKeypair?: string; // Base58 encoded secret key for vanity address
}

export interface DeploymentResult {
  success: boolean;
  mintAddress?: string;
  signature?: string;
  error?: string;
  steps: string[];
}

export class TokenDeployer {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  }

  async deployToken(config: TokenDeploymentConfig): Promise<DeploymentResult> {
    const steps: string[] = [];
    
    try {
      // Get creator wallet (payer)
      const creatorWallet = getCreatorWallet();
      if (!creatorWallet.isConfigured()) {
        return {
          success: false,
          error: 'Creator wallet not configured. Please set up your creator wallet first.',
          steps,
        };
      }

      const payer = creatorWallet.getKeypair();
      steps.push('✅ Creator wallet loaded');

      // Load or generate mint keypair
      let mintKeypair: Keypair;
      if (config.mintKeypair) {
        try {
          mintKeypair = Keypair.fromSecretKey(bs58.decode(config.mintKeypair));
          steps.push(`✅ Using provided mint address: ${mintKeypair.publicKey.toBase58()}`);
        } catch (error) {
          return {
            success: false,
            error: 'Invalid mint keypair provided',
            steps,
          };
        }
      } else {
        mintKeypair = Keypair.generate();
        steps.push(`✅ Generated new mint address: ${mintKeypair.publicKey.toBase58()}`);
      }

      // Check creator wallet balance
      const balance = await creatorWallet.getBalance();
      if (balance < 0.05) {
        return {
          success: false,
          error: `Insufficient balance. Need at least 0.05 SOL, have ${balance.toFixed(4)} SOL`,
          steps,
        };
      }
      steps.push(`✅ Balance check passed: ${balance.toFixed(4)} SOL`);

      // Get rent-exempt balance for mint account
      const lamports = await getMinimumBalanceForRentExemptMint(this.connection);
      steps.push(`✅ Calculated rent: ${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

      // Create mint account
      const createAccountIx = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      });

      // Initialize mint
      const initializeMintIx = createInitializeMintInstruction(
        mintKeypair.publicKey,
        config.decimals,
        payer.publicKey, // mint authority
        payer.publicKey, // freeze authority (can be null if you want)
        TOKEN_PROGRAM_ID
      );

      // Build and send transaction
      const transaction = new Transaction().add(createAccountIx, initializeMintIx);
      
      steps.push('🔄 Sending transaction to Solana...');
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      );

      steps.push(`✅ Token mint created! Signature: ${signature}`);

      // Create associated token account for creator
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        payer.publicKey
      );

      const createATAIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAddress,
        payer.publicKey,
        mintKeypair.publicKey
      );

      // Mint initial supply
      const mintAmount = config.supply * Math.pow(10, config.decimals);
      const mintToIx = createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAddress,
        payer.publicKey,
        mintAmount
      );

      const mintTx = new Transaction().add(createATAIx, mintToIx);
      const mintSig = await sendAndConfirmTransaction(
        this.connection,
        mintTx,
        [payer],
        { commitment: 'confirmed' }
      );

      steps.push(`✅ Minted ${config.supply.toLocaleString()} ${config.symbol} to creator wallet`);
      steps.push(`✅ Signature: ${mintSig}`);

      return {
        success: true,
        mintAddress: mintKeypair.publicKey.toBase58(),
        signature: mintSig,
        steps,
      };

    } catch (error) {
      console.error('Token deployment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        steps,
      };
    }
  }

  async getTokenInfo(mintAddress: string): Promise<{
    exists: boolean;
    supply?: string;
    decimals?: number;
    mintAuthority?: string;
    freezeAuthority?: string;
  }> {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      const mintInfo = await this.connection.getParsedAccountInfo(mintPubkey);

      if (!mintInfo.value) {
        return { exists: false };
      }

      const data = mintInfo.value.data;
      if ('parsed' in data && data.parsed.type === 'mint') {
        const info = data.parsed.info;
        return {
          exists: true,
          supply: info.supply,
          decimals: info.decimals,
          mintAuthority: info.mintAuthority,
          freezeAuthority: info.freezeAuthority,
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('Error fetching token info:', error);
      return { exists: false };
    }
  }
}

export const getTokenDeployer = () => new TokenDeployer();
