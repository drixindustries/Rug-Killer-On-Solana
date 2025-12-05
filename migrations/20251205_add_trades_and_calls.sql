-- Migration: Add trades and smart_wallet_calls tables for PnL tracking
-- Created: 2025-12-05

-- Trades table for PnL calculation (FIFO/LIFO accounting)
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  token_mint VARCHAR(44) NOT NULL,
  token_symbol VARCHAR(20),
  side VARCHAR(4) NOT NULL, -- 'buy' or 'sell'
  amount DECIMAL(38, 12) NOT NULL,
  price_usd DECIMAL(24, 12),
  price_sol DECIMAL(24, 12),
  total_usd DECIMAL(24, 8),
  total_sol DECIMAL(20, 9),
  tx_signature VARCHAR(120) UNIQUE,
  fee DECIMAL(20, 9),
  source VARCHAR(50) DEFAULT 'helius',
  traded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trades_wallet ON trades(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trades_token ON trades(token_mint);
CREATE INDEX IF NOT EXISTS idx_trades_traded_at ON trades(traded_at);
CREATE INDEX IF NOT EXISTS idx_trades_wallet_token ON trades(wallet_address, token_mint);

-- Smart wallet calls table (tracks 20%+ gain calls)
CREATE TABLE IF NOT EXISTS smart_wallet_calls (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  wallet_name VARCHAR(255),
  token_mint VARCHAR(44) NOT NULL,
  token_symbol VARCHAR(20),
  token_name VARCHAR(255),
  entry_price_usd DECIMAL(24, 12),
  current_price_usd DECIMAL(24, 12),
  peak_price_usd DECIMAL(24, 12),
  gain_percent DECIMAL(10, 4),
  peak_gain_percent DECIMAL(10, 4),
  hit_target BOOLEAN DEFAULT FALSE,
  hit_target_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  platform VARCHAR(20),
  channel_id VARCHAR(100),
  notified BOOLEAN DEFAULT FALSE,
  called_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_smart_calls_wallet ON smart_wallet_calls(wallet_address);
CREATE INDEX IF NOT EXISTS idx_smart_calls_token ON smart_wallet_calls(token_mint);
CREATE INDEX IF NOT EXISTS idx_smart_calls_status ON smart_wallet_calls(status);
CREATE INDEX IF NOT EXISTS idx_smart_calls_called_at ON smart_wallet_calls(called_at);
