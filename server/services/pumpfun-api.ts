import axios from 'axios';

interface PumpFunInfo {
  isPumpFun: boolean;
  devBought: number;
  bondingCurve: number;
  mayhemMode?: boolean;
  king?: {
    address: string;
    percentage: number;
  };
}

// Circuit breaker to prevent hammering failing pump.fun API
let pumpFunApiDown = false;
let pumpFunApiDownUntil = 0;

// Alternative API sources for pump.fun token detection
async function tryDexScreener(tokenAddress: string): Promise<PumpFunInfo | null> {
  try {
    const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
      timeout: 5000,
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.data?.pairs && response.data.pairs.length > 0) {
      const pair = response.data.pairs[0];
      
      // Check if it's a pump.fun token by looking at the DEX
      const isPumpFun = pair.dexId === 'raydium' && pair.chainId === 'solana';
      
      if (isPumpFun && pair.pairCreatedAt) {
        console.log(`[Pump.fun] Detected via DexScreener: ${pair.baseToken?.name}`);
        
        // Estimate bonding curve progress from market cap
        const marketCap = pair.fdv || pair.marketCap || 0;
        const bondingCurve = Math.min((marketCap / 85000) * 100, 100); // ~85k target
        
        return {
          isPumpFun: true,
          devBought: 0, // Unknown via DexScreener
          bondingCurve,
          mayhemMode: bondingCurve >= 99
        };
      }
    }
  } catch (error: any) {
    // Silent fail - try next source
  }
  return null;
}

async function tryGMGN(tokenAddress: string): Promise<PumpFunInfo | null> {
  try {
    const response = await axios.get(`https://gmgn.ai/defi/quotation/v1/tokens/sol/${tokenAddress}`, {
      timeout: 5000,
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (response.data?.data) {
      const token = response.data.data.token;
      
      // Check if pump.fun by looking at creation source
      if (token?.creation_tx || token?.is_show_alert) {
        console.log(`[Pump.fun] Detected via GMGN: ${token.name}`);
        
        const marketCap = parseFloat(token.market_cap || '0');
        const bondingCurve = Math.min((marketCap / 85000) * 100, 100);
        
        return {
          isPumpFun: true,
          devBought: parseFloat(token.top_10_holder_rate || '0'),
          bondingCurve,
          mayhemMode: bondingCurve >= 99
        };
      }
    }
  } catch (error: any) {
    // Silent fail - try next source
  }
  return null;
}

async function checkAlternativeSources(tokenAddress: string): Promise<PumpFunInfo> {
  // Try all alternative sources
  const dexResult = await tryDexScreener(tokenAddress);
  if (dexResult) return dexResult;
  
  const gmgnResult = await tryGMGN(tokenAddress);
  if (gmgnResult) return gmgnResult;
  
  // If all fail, use RPC fallback
  return checkPumpFunFallback(tokenAddress);
}

export async function checkPumpFun(tokenAddress: string): Promise<PumpFunInfo> {
  // Circuit breaker: Skip API if it's been failing
  const now = Date.now();
  if (pumpFunApiDown && now < pumpFunApiDownUntil) {
    console.log(`[Pump.fun] API circuit breaker active, using alternative sources for ${tokenAddress}`);
    // Try alternative sources first
    return checkAlternativeSources(tokenAddress);
  }
  
  console.log(`[Pump.fun] Checking token: ${tokenAddress}`);
  
  // STRATEGY 1: Try DexScreener first (most reliable)
  const dexResult = await tryDexScreener(tokenAddress);
  if (dexResult) return dexResult;
  
  // STRATEGY 2: Try GMGN.ai
  const gmgnResult = await tryGMGN(tokenAddress);
  if (gmgnResult) return gmgnResult;
  
  // STRATEGY 3: Try pump.fun API (often returns 530)
  const mainEndpoint = `https://frontend-api.pump.fun/coins/${tokenAddress}`;
  
  try {
    
    const response = await axios.get(mainEndpoint, {
      timeout: 5000, // Reduced timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://pump.fun',
        'Referer': 'https://pump.fun/'
      },
      validateStatus: (status) => status < 600, // Accept all non-fatal responses
    });
    
    if (response.status === 200 && response.data) {
      const data = response.data;
      
      console.log(`[Pump.fun] Response received for ${tokenAddress}`);
      
      // pump.fun API returns comprehensive token data
      const isPumpFunToken = !!(
        data.mint ||
        data.name ||
        data.symbol ||
        data.uri ||
        data.created_timestamp
      );
      
      if (isPumpFunToken) {
        // Calculate bonding curve progress
        // pump.fun uses virtual reserves to determine progress
        let bondingCurve = 0;
        
        if (data.virtual_sol_reserves !== undefined && data.virtual_token_reserves !== undefined) {
          // Calculate progress: how close to graduating (85 SOL target)
          const targetSol = 85;
          const currentSol = data.virtual_sol_reserves / 1e9; // Convert lamports to SOL
          bondingCurve = Math.min(100, (currentSol / targetSol) * 100);
        }
        
        // Check if already graduated to Raydium
        const mayhemMode = !!(data.raydium_pool || data.complete || bondingCurve >= 99);
        
        // Dev buy percentage (if creator bought their own token)
        const devBought = data.creator_percentage || 0;
        
        // King of the hill data (if applicable)
        let king = undefined;
        if (data.king_of_the_hill_timestamp && data.king_of_the_hill_user_address) {
          king = {
            address: data.king_of_the_hill_user_address,
            percentage: data.king_of_the_hill_amount || 0
          };
        }
        
        console.log(`✅ [Pump.fun] Token CONFIRMED: ${data.name} (${data.symbol})`);
        console.log(`   Mint: ${data.mint}`);
        console.log(`   Bonding Curve: ${bondingCurve.toFixed(1)}%`);
        console.log(`   Market Cap: $${data.usd_market_cap || 0}`);
        console.log(`   Graduated: ${mayhemMode ? 'YES (Raydium)' : 'NO (Bonding Curve)'}`);
        console.log(`   Created: ${data.created_timestamp ? new Date(data.created_timestamp).toISOString() : 'Unknown'}`);
        
        return {
          isPumpFun: true,
          devBought,
          bondingCurve,
          mayhemMode,
          king
        };
      }
    }
    
    if (response.status === 404) {
      console.log(`[Pump.fun] Token not found on pump.fun: ${tokenAddress}`);
      // Reset circuit breaker on successful connection
      pumpFunApiDown = false;
    } else if (response.status >= 500) {
      // 5xx errors - activate circuit breaker
      console.log(`[Pump.fun] API unavailable (${response.status}), activating circuit breaker`);
      pumpFunApiDown = true;
      pumpFunApiDownUntil = Date.now() + 60000; // Skip API for 60 seconds
    }
    
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      console.log(`[Pump.fun] Request timeout for ${tokenAddress}`);
      pumpFunApiDown = true;
      pumpFunApiDownUntil = Date.now() + 30000; // Skip for 30 seconds
    } else if (error.response?.status === 404) {
      console.log(`[Pump.fun] Token not found on pump.fun: ${tokenAddress}`);
      pumpFunApiDown = false; // Reset on successful connection
    } else if (error.response?.status >= 500) {
      console.log(`[Pump.fun] API error (${error.response?.status}):`, error.message);
      pumpFunApiDown = true;
      pumpFunApiDownUntil = Date.now() + 60000;
    } else {
      console.log(`[Pump.fun] API error:`, error.message);
    }
  }
  
  // Use RPC fallback
  return checkPumpFunFallback(tokenAddress);
}

// RPC fallback function
async function checkPumpFunFallback(tokenAddress: string): Promise<PumpFunInfo> {
  try {
    console.log(`[Pump.fun] Checking mint authority pattern for ${tokenAddress}...`);
    
    // Use public Solana RPC as fallback
    const rpcUrl = 'https://api.mainnet-beta.solana.com';
    const rpcResponse = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [
        tokenAddress,
        {
          encoding: 'jsonParsed',
          commitment: 'confirmed'
        }
      ]
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (rpcResponse.data?.result?.value) {
      const accountInfo = rpcResponse.data.result.value;
      const parsed = accountInfo.data?.parsed?.info;
      
      if (!parsed) {
        console.log(`[Pump.fun] Not a token account: ${tokenAddress}`);
        return { isPumpFun: false, devBought: 0, bondingCurve: 0, mayhemMode: false };
      }
      
      const mintAuthority = parsed.mintAuthority;
      const freezeAuthority = parsed.freezeAuthority;
      
      // pump.fun program authority (consistent across all pump.fun tokens)
      const PUMP_FUN_PROGRAM = 'TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM';
      
      // Check if this token was created by pump.fun program
      if (mintAuthority === PUMP_FUN_PROGRAM || freezeAuthority === PUMP_FUN_PROGRAM) {
        console.log(`✅ [Pump.fun] Token created by pump.fun program (authority match)`);
        return {
          isPumpFun: true,
          devBought: 0,
          bondingCurve: 50, // Unknown progress, assume mid-curve
          mayhemMode: false
        };
      }
      
      // Check if mint/freeze authority is null (might have graduated)
      if (mintAuthority === null && freezeAuthority === null) {
        // Could be graduated pump.fun token, but can't confirm without API
        console.log(`[Pump.fun] Token has null authorities (possibly graduated, but unconfirmed)`);
      }
    }
  } catch (error: any) {
    console.log(`[Pump.fun] RPC check failed:`, error.message);
  }
  
  console.log(`❌ [Pump.fun] NOT a pump.fun token: ${tokenAddress}`);
  return { isPumpFun: false, devBought: 0, bondingCurve: 0, mayhemMode: false };
}
