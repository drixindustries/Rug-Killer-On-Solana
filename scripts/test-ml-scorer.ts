import { mlScorer } from '../server/services/ml-scorer';

// Minimal feature example (borrowed from sample CSV first row)
const features = {
  topHolderPercent: 42.3,
  top10Concentration: 78.5,
  holderCount: 37,
  liquidityUSD: 5200,
  poolLocked: false,
  poolBurned: false,
  mintEnabled: true,
  freezeEnabled: false,
  ageHours: 3,
  volume24h: 420,
  txns24h: 180,
  priceChange24h: -55,
  buyPressure: 0.28,
  isPumpFun: true,
  bondingCurve: 35,
  hasWebsite: false,
  hasTwitter: false,
  hasTelegram: false
};

const result = mlScorer.score(features);
console.log('ML Score Result:\n', JSON.stringify(result, null, 2));
