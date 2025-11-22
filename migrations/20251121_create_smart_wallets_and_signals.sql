-- Migration: create smart_wallets and smart_signals tables for alpha alerts

CREATE TABLE IF NOT EXISTS smart_wallets (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  source VARCHAR(50) DEFAULT 'gmgn',
  profit_sol NUMERIC(20,9),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_rate INTEGER DEFAULT 0,
  influence_score INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  last_active_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_smart_wallet_address ON smart_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_smart_influence ON smart_wallets(influence_score);
CREATE INDEX IF NOT EXISTS idx_smart_active ON smart_wallets(is_active);

CREATE TABLE IF NOT EXISTS smart_signals (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(255) NOT NULL,
  token_address VARCHAR(44) NOT NULL,
  action VARCHAR(10) NOT NULL DEFAULT 'buy',
  amount_tokens NUMERIC(38,12),
  price_usd NUMERIC(24,8),
  tx_signature VARCHAR(120) UNIQUE,
  confidence INTEGER DEFAULT 80,
  source VARCHAR(50) DEFAULT 'alpha-alerts',
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_smart_signals_token ON smart_signals(token_address);
CREATE INDEX IF NOT EXISTS idx_smart_signals_detected ON smart_signals(detected_at);
