# Solana Rug Detector

A comprehensive web application for analyzing Solana tokens to detect potential rug pull risks.

## Overview
This application provides real-time analysis of Solana SPL tokens, checking for common rug pull indicators including mint authority, freeze authority, holder concentration, liquidity pool status, and suspicious transaction patterns.

## Recent Changes (November 11, 2025)
- Initial MVP implementation complete
- Frontend: React dashboard with exceptional visual design following design_guidelines.md
- Backend: Solana RPC integration with comprehensive risk analysis
- Error handling: Graceful fallbacks for RPC rate limits and network errors
- All MVP features implemented and tested

## Project Architecture

### Frontend (`client/`)
- **Framework**: React + TypeScript with Vite
- **Routing**: Wouter for client-side routing
- **Data Fetching**: React Query (useMutation for POST requests)
- **UI Components**: Shadcn UI + Tailwind CSS
- **Charts**: Recharts for data visualization
- **Typography**: Inter (UI) and JetBrains Mono (monospace)

### Backend (`server/`)
- **Framework**: Express.js with TypeScript
- **Blockchain Integration**: @solana/web3.js + @solana/spl-token
- **RPC**: Connects to Solana mainnet (configurable via SOLANA_RPC_URL)
- **Storage**: In-memory (MemStorage) for session data

### Shared (`shared/`)
- **Schema**: Centralized TypeScript types and Zod validation schemas
- **Type Safety**: Consistent types between frontend and backend

## Key Features (MVP Completed)

### Token Analysis
1. **Authority Checks**
   - Mint authority detection (can dev mint unlimited tokens?)
   - Freeze authority detection (can dev freeze accounts?)

2. **Holder Analysis**
   - Top 20 holder addresses with balances
   - Holder concentration percentage (top 10)
   - Interactive holder distribution chart

3. **Liquidity Assessment**
   - Liquidity pool status detection
   - Risk classification (SAFE/RISKY/UNKNOWN)

4. **Risk Scoring**
   - 0-100 risk score calculation
   - Risk level classification (LOW/MODERATE/HIGH/EXTREME)
   - Detailed red flag alerts with severity levels

5. **Transaction History**
   - Recent transaction timeline
   - Suspicious activity detection

### UI Components
- **Token Input**: Address validation with example tokens
- **Risk Score Card**: Large visual risk indicator with counter animation
- **Critical Alerts**: Color-coded alert cards for immediate red flags
- **Metrics Grid**: 6 key metrics (supply, holders, concentration, liquidity, creation date, token program)
- **Top Holders Table**: Sortable table with copy-to-clipboard functionality
- **Holder Distribution Chart**: Horizontal bar chart showing concentration
- **Transaction Timeline**: Vertical timeline with transaction type icons
- **Token Metadata Card**: Token details with Solscan integration link

## User Preferences
- Modern, data-dense dashboard design (inspired by Linear and Dexscreener)
- Clean, professional aesthetic with subtle interactions
- Color-coded risk indicators (green/yellow/orange/red)
- Monospace fonts for addresses and technical data

## Environment Configuration

### Required Environment Variables
None required for basic functionality (uses public Solana RPC by default)

### Optional Environment Variables
- `SOLANA_RPC_URL`: Custom Solana RPC endpoint (default: https://api.mainnet-beta.solana.com)
  - **Note**: Public RPC has strict rate limits (429 errors common)
  - **Recommended**: Use Helius, QuickNode, or Alchemy for production
  - Example: `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`

## Known Limitations

### Public RPC Rate Limits
The default public Solana RPC endpoint (https://api.mainnet-beta.solana.com) has very strict rate limits:
- **Impact**: May return 429 errors during analysis
- **Handling**: App gracefully handles errors with safe defaults
- **Solution**: Configure custom RPC endpoint via SOLANA_RPC_URL environment variable
- **Recommended Providers**: Helius, QuickNode, Alchemy (all have free tiers)

### Error Handling Strategy
When RPC calls fail:
1. Backend returns complete response with safe defaults
2. Risk score defaults to 100 (EXTREME)
3. Error message shown in red flags section
4. All UI components handle missing data gracefully
5. No runtime crashes - user can retry analysis

## Development

### Running the Project
```bash
npm run dev
```
This starts both Express (port 5000) and Vite dev server

### Project Structure
```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities and API client
├── server/              # Backend Express application
│   ├── solana-analyzer.ts  # Solana blockchain integration
│   ├── routes.ts        # API routes
│   └── storage.ts       # Data storage interface
├── shared/              # Shared types and schemas
│   └── schema.ts        # TypeScript types + Zod schemas
└── design_guidelines.md # Frontend design specifications
```

### API Endpoints
- **POST /api/analyze-token**
  - Request: `{ tokenAddress: string }`
  - Response: Complete TokenAnalysisResponse with risk data
  - Error handling: Returns 200 with safe defaults on RPC failures

## Testing
- End-to-end testing framework configured
- Test known tokens: USDC, SOL (wrapped)
- Error scenarios tested (invalid addresses, RPC failures)

## Next Steps / Future Enhancements
1. **RPC Configuration**: Add UI for users to input custom RPC endpoints
2. **Enhanced APIs**: Integrate Rugcheck.xyz, GoPlus, Dexscreener for additional data
3. **Honeypot Detection**: Simulate sells to detect trading restrictions
4. **Social Verification**: Check website/Twitter/Discord links
5. **Real-time Monitoring**: WebSocket integration for live updates
6. **Token Watchlist**: Save and monitor multiple tokens
7. **Historical Data**: Track token metrics over time
8. **Export Reports**: PDF/CSV export of analysis results

## Technical Decisions
- **In-memory storage**: Sufficient for MVP, no persistence needed for analysis results
- **Public RPC**: Good for demo/development, custom RPC recommended for production
- **Component-first design**: Modular, reusable components for maintainability
- **Type safety**: Shared schema ensures frontend/backend consistency
- **Error resilience**: Graceful degradation when external services fail

## Version
v1.0.0 - Initial MVP Release
