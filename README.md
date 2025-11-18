# Rug Killer on Solana

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solana](https://img.shields.io/badge/Solana-14F195?style=flat&logo=solana&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Detection Rate](https://img.shields.io/badge/Detection_Rate-99%25%2B-brightgreen)
![Live Status](https://img.shields.io/badge/Status-Live-success)

**Advanced Solana token security analysis platform - Protect yourself from rug pulls with cutting-edge 2025 detection methods.**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

---

## Features

### Multi-Layer Detection
- **Liquidity Analysis** - Pool depth, lock periods, LP token burns
- **Holder Distribution** - Whale detection with CEX wallet filtering  
- **Creator Tracking** - Multi-account detection & blacklist verification
- **Smart Contract Analysis** - Mint/freeze authority checks
- **AI-Powered Risk Assessment** - Machine learning scam detection

### Pump.fun Integration
- **Live Auto-Scanning** - Every new token launch analyzed instantly
- **Real-Time WebSocket** - Live scan feed to all clients
- **Grade System** - Diamond, Gold, Silver, Bronze, Red Flag
- **Scan History** - Database of last 100 auto-scanned tokens

### Whale Detection
- **1% Supply Threshold** - Detects large early accumulation
- **40+ CEX Wallets Filtered** - Binance, OKX, Bybit, etc.
- **Smart Insights** - Actionable recommendations
- **Discord/Telegram Alerts** - Real-time notifications
- **Wallet Age Safety Score** - 0-100 scoring system to detect aged wallet manipulation

### Modern UI
- Beautiful dark mode interface
- Mobile-optimized responsive design
- Real-time updates via WebSockets
- Interactive charts and visualizations

---

## Quick Start

\\\ash
# Clone the repository
git clone https://github.com/drixindustries/Rug-Killer-On-Solana.git
cd Rug-Killer-On-Solana

# Install server dependencies
cd server
npm install

# Install client dependencies  
cd ../client
npm install

# Set up environment (see docs/QUICK_START.md)
cp .env.example .env

# Run the server
cd ../server
npm run dev

# Run the client (in new terminal)
cd client
npm run dev
\\\

Visit \http://localhost:5173\ 

---

## Deploy to Railway

1. Fork this repository
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repository
4. Add environment variables (see [RPC_SETUP_GUIDE.md](RPC_SETUP_GUIDE.md) and [DEPLOYMENT.md](DEPLOYMENT.md))
5. Deploy 

---

## Documentation

- [Quick Start Guide](docs/QUICK_START.md)
- [API Reference](docs/API.md)
- [Advanced Rug Detection](docs/ADVANCED_RUG_DETECTION.md)
- [Pump.fun Integration](docs/QUICKSTART_PUMPFUN.md)
- [Railway Deployment](DEPLOYMENT.md)
- [RPC Setup Guide](RPC_SETUP_GUIDE.md)
- [Discord Bot Setup](DISCORD_BOT_SETUP.md)

---

## Tech Stack

**Frontend:** React + TypeScript + Vite + Tailwind CSS + Framer Motion  
**Backend:** Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL  
**Blockchain:** Solana Web3.js + SPL Token + Metaplex  
**Integrations:** DexScreener API, GoPlus Security API, Discord.js

---

## Contributing

Contributions welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Disclaimer

This tool is for educational purposes only. Always DYOR before investing. Rug Killer cannot guarantee 100% accuracy.

---

**Built for the Solana community**

[Star us on GitHub](https://github.com/drixindustries/Rug-Killer-On-Solana) | [Report Bug](https://github.com/drixindustries/Rug-Killer-On-Solana/issues)
