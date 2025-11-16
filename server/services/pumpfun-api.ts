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
  // Try multiple endpoints for pump.fun detection
  const endpoints = [
    `https://pumpapi.fun/api/tokens/${tokenAddress}`,
    `https://pump.fun/${tokenAddress}`,
    `https://api.pump.fun/v1/tokens/${tokenAddress}`
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        timeout: 8000,
        headers: {
          'User-Agent': 'RugKiller-Scanner/1.0',
          'Accept': 'application/json'
        },
        validateStatus: (status) => status < 500, // Don't throw on 404
      });
      
      if (response.status === 200 && response.data) {
        // Check for pump.fun token indicators
        const data = response.data;
        const isPumpFun = !!(data.mint || data.address || data.symbol || 
                           (typeof data === 'object' && Object.keys(data).length > 0));
        
        if (isPumpFun) {
          // Extract pump.fun specific data
          const devBought = data.dev_bought || data.devBought || 0;
          const bondingCurve = data.progress || data.bondingCurve || data.bonding_curve || 0;
          
          // Detect Mayhem Mode (when king of the hill mechanics are active)
          const mayhemMode = bondingCurve >= 100 || data.graduated || data.mayhem_mode || false;
          const king = data.king ? {
            address: data.king.address || data.king,
            percentage: data.king.percentage || data.king_percentage || 0
          } : undefined;
          
          console.log(`✅ [Pump.fun] Token detected: ${tokenAddress}, Bonding: ${bondingCurve}%, Mayhem: ${mayhemMode}`);
          
          return {
            isPumpFun: true,
            devBought,
            bondingCurve,
            mayhemMode,
            king
          };
        }
      }
      
      // 404 means not a pump.fun token, try next endpoint
      if (response.status === 404) {
        continue;
      }
    } catch (error) {
      // Try next endpoint
      continue;
    }
  }
  
  // Fallback: Check if token address matches pump.fun patterns
  try {
    // Pump.fun tokens often have specific mint authorities or follow patterns
    // This is a basic heuristic check
    const response = await axios.get(`https://api.solana.fm/v0/tokens/${tokenAddress}`, {
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });
    
    if (response.status === 200 && response.data) {
      const metadata = response.data;
      // Check if the token name/symbol contains pump.fun indicators
      const name = (metadata.name || '').toLowerCase();
      const symbol = (metadata.symbol || '').toLowerCase();
      
      if (name.includes('pump') || symbol.includes('pump') || 
          name.includes('bonding') || symbol.includes('curve')) {
        console.log(`⚠️ [Pump.fun] Possible pump.fun token detected via metadata: ${tokenAddress}`);
        return {
          isPumpFun: true,
          devBought: 0,
          bondingCurve: 0,
          mayhemMode: false
        };
      }
    }
  } catch (error) {
    // Ignore metadata check errors
  }
  
  return { isPumpFun: false, devBought: 0, bondingCurve: 0, mayhemMode: false };
}
