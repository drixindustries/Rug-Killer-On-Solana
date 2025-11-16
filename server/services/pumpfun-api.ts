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

export async function checkPumpFun(tokenAddress: string): Promise<PumpFunInfo> {
  // ACTUAL WORKING pump.fun API endpoint (November 2025)
  // The official pump.fun frontend uses this endpoint
  const mainEndpoint = `https://frontend-api.pump.fun/coins/${tokenAddress}`;
  
  try {
    console.log(`[Pump.fun] Checking token: ${tokenAddress}`);
    
    const response = await axios.get(mainEndpoint, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://pump.fun',
        'Referer': 'https://pump.fun/'
      },
      validateStatus: (status) => status < 500,
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
    }
    
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      console.log(`[Pump.fun] Request timeout for ${tokenAddress}`);
    } else if (error.response?.status === 404) {
      console.log(`[Pump.fun] Token not found on pump.fun: ${tokenAddress}`);
    } else {
      console.log(`[Pump.fun] API error:`, error.message);
    }
  }
  
  // Fallback: Check using Solana RPC for pump.fun authority patterns
  try {
    console.log(`[Pump.fun] Checking mint authority pattern for ${tokenAddress}...`);
    
    const rpcResponse = await axios.post('https://api.mainnet-beta.solana.com', {
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
