import axios from 'axios';

interface PumpFunInfo {
  isPumpFun: boolean;
  devBought: number;
  bondingCurve: number;
}

export async function checkPumpFun(tokenAddress: string): Promise<PumpFunInfo> {
  // Try with retries for transient failures
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await axios.get(`https://pump.fun/api/token/${tokenAddress}`, {
        timeout: 5000,
        validateStatus: (status) => status < 500, // Don't throw on 404
      });
      
      if (response.status === 200 && response.data) {
        const isPumpFun = !!response.data.mint; // Presence of mint field confirms pump.fun token
        return {
          isPumpFun,
          devBought: response.data.dev_bought || 0,
          bondingCurve: response.data.progress || 0,
        };
      }
      
      // 404 means not a pump.fun token, return immediately
      if (response.status === 404) {
        break;
      }
    } catch (error) {
      // Log error but don't throw - may be network issue or not a pump.fun token
      if (attempt === 0 && axios.isAxiosError(error)) {
        console.log(`[Pump.fun API] First attempt failed, retrying: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        continue;
      }
      console.log(`[Pump.fun API] Error checking token ${tokenAddress}:`, error instanceof Error ? error.message : error);
    }
  }
  
  return { isPumpFun: false, devBought: 0, bondingCurve: 0 };
}
