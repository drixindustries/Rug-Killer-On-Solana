import axios from 'axios';

interface PumpFunInfo {
  isPumpFun: boolean;
  devBought: number;
  bondingCurve: number;
}

export async function checkPumpFun(tokenAddress: string): Promise<PumpFunInfo> {
  try {
    const response = await axios.get(`https://pump.fun/api/token/${tokenAddress}`, {
      timeout: 5000
    });
    
    if (response.status === 200 && response.data) {
      return {
        isPumpFun: true,
        devBought: response.data.dev_bought || 0,
        bondingCurve: response.data.progress || 0
      };
    }
  } catch (error) {
    // Not a pump.fun token or API error
  }
  
  return { isPumpFun: false, devBought: 0, bondingCurve: 0 };
}
