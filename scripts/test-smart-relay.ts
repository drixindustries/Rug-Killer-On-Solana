import { smartMoneyRelay, getDirective } from '../server/services/smart-money-relay.js';

const wallet = {
  address: 'TestWalletAddress1234567890',
  winrate: 80,
  profit: 1200000,
  directive: getDirective(80, 1200000)
};

const event = {
  tokenMint: 'TestTokenMint1234567890',
  symbol: 'TEST',
  ageMinutes: 3,
  walletCount: 1,
  eliteWallets: [wallet],
  allSample: ['TestWallet...'],
  analysis: { riskScore: 40, holderCount: 100, topConcentration: 20 },
  timestamp: Date.now()
};

smartMoneyRelay.onEvent((evt) => {
  console.log('Received event:', {
    token: evt.tokenMint,
    eliteCount: evt.eliteWallets.length,
    directive: evt.eliteWallets[0]?.directive
  });
});

console.log('Publishing event...');
smartMoneyRelay.publish(event);

setTimeout(() => {
  console.log('Stats:', smartMoneyRelay.getStats());
}, 500);
