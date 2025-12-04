-- Base Tables Migration
-- Creates all foundational tables required by the application
-- Date: 2025-11-01 (runs first)

-- Required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

-- Users table (foundation for authentication)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  profile_image_url VARCHAR(255),
  whop_user_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session storage table (required by express-session)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- ============================================================================
-- SUBSCRIPTION SYSTEM TABLES
-- ============================================================================

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  whop_membership_id VARCHAR(255) UNIQUE,
  whop_plan_id VARCHAR(255),
  trial_ends_at TIMESTAMP,
  current_period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_whop_membership ON subscriptions(whop_membership_id);

-- Subscription codes table (for lifetime access codes)
CREATE TABLE IF NOT EXISTS subscription_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code VARCHAR(255) NOT NULL UNIQUE,
  tier VARCHAR(50) NOT NULL,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_code ON subscription_codes(code);
CREATE INDEX IF NOT EXISTS idx_code_active ON subscription_codes(is_active);

-- Code redemptions table
CREATE TABLE IF NOT EXISTS code_redemptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_id TEXT NOT NULL REFERENCES subscription_codes(id),
  code VARCHAR(255) NOT NULL,
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_redemption_user ON code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_code ON code_redemptions(code_id);

-- ============================================================================
-- WALLET CONNECTION TABLES
-- ============================================================================

-- Wallet connections table (for token-gated access)
CREATE TABLE IF NOT EXISTS wallet_connections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  token_balance BIGINT NOT NULL DEFAULT 0,
  last_verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON wallet_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_eligible ON wallet_connections(is_eligible);

-- ============================================================================
-- INFLUENTIAL WALLET TRACKING
-- ============================================================================

-- KOL (Key Opinion Leader) wallets
CREATE TABLE IF NOT EXISTS kol_wallets (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  twitter_handle VARCHAR(255),
  telegram_handle VARCHAR(255),
  rank INTEGER,
  profit_sol NUMERIC(20, 9),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  influence_score INTEGER DEFAULT 50,
  is_verified BOOLEAN DEFAULT FALSE,
  source VARCHAR(50) DEFAULT 'kolscan',
  notes TEXT,
  last_active_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kol_wallet_address ON kol_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_kol_rank ON kol_wallets(rank);
CREATE INDEX IF NOT EXISTS idx_kol_influence ON kol_wallets(influence_score);

-- ============================================================================
-- CRYPTO PAYMENTS TABLES
-- ============================================================================

-- Crypto payment addresses table
CREATE TABLE IF NOT EXISTS crypto_addresses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chain VARCHAR(50) NOT NULL,
  address VARCHAR(255) NOT NULL UNIQUE,
  tier VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crypto_addresses_user ON crypto_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_addresses_chain ON crypto_addresses(chain);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crypto_address_id TEXT NOT NULL UNIQUE REFERENCES crypto_addresses(id),
  chain VARCHAR(50) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  amount_expected VARCHAR(255) NOT NULL,
  amount_received VARCHAR(255),
  tx_hash VARCHAR(255) UNIQUE,
  from_address VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  confirmations INTEGER NOT NULL DEFAULT 0,
  confirmed_at TIMESTAMP,
  subscription_activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Payment audit log
CREATE TABLE IF NOT EXISTS payment_audit (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  check_type VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_payment ON payment_audit(payment_id);

-- ============================================================================
-- AI BLACKLIST TABLES
-- ============================================================================

-- Analysis runs - stores historical token analysis for ML training
CREATE TABLE IF NOT EXISTS analysis_runs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_address VARCHAR(44) NOT NULL,
  user_id TEXT REFERENCES users(id),
  risk_score INTEGER NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  analysis_data JSONB NOT NULL,
  rug_detected BOOLEAN DEFAULT FALSE,
  user_reported BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_token ON analysis_runs(token_address);
CREATE INDEX IF NOT EXISTS idx_analysis_rug ON analysis_runs(rug_detected);
CREATE INDEX IF NOT EXISTS idx_analysis_created ON analysis_runs(created_at);

-- Bad actor labels - blacklist database
CREATE TABLE IF NOT EXISTS bad_actor_labels (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  label_type VARCHAR(50) NOT NULL,
  severity INTEGER NOT NULL,
  rug_count INTEGER NOT NULL DEFAULT 0,
  total_victims INTEGER DEFAULT 0,
  total_losses VARCHAR(255),
  evidence_data JSONB,
  detection_method VARCHAR(50) NOT NULL,
  confidence INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bad_actors_wallet ON bad_actor_labels(wallet_address);
CREATE INDEX IF NOT EXISTS idx_bad_actors_severity ON bad_actor_labels(severity);
CREATE INDEX IF NOT EXISTS idx_bad_actors_active ON bad_actor_labels(is_active);
CREATE INDEX IF NOT EXISTS idx_bad_actors_label_type ON bad_actor_labels(label_type);

-- Bot configuration table
CREATE TABLE IF NOT EXISTS bot_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_user_id VARCHAR(255) NOT NULL,
  platform_username VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  min_risk_level VARCHAR(20) DEFAULT 'MODERATE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bot_config_user ON bot_config(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_config_platform ON bot_config(platform);
CREATE UNIQUE INDEX IF NOT EXISTS unique_bot_platform_user ON bot_config(platform, platform_user_id);

-- ============================================================================
-- USER FEATURES TABLES (Watchlist, Portfolio, Alerts)
-- ============================================================================

-- Watchlist entries
CREATE TABLE IF NOT EXISTS watchlist_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_address VARCHAR(44) NOT NULL,
  label VARCHAR(120),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist_entries(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_watchlist_user_token ON watchlist_entries(user_id, token_address);

-- Portfolio positions
CREATE TABLE IF NOT EXISTS portfolio_positions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_address VARCHAR(44) NOT NULL,
  quantity NUMERIC(38, 12) NOT NULL,
  avg_cost_usd NUMERIC(24, 8),
  realized_pnl_usd NUMERIC(24, 8) DEFAULT 0,
  latest_price_usd NUMERIC(24, 8),
  unrealized_pnl_usd NUMERIC(24, 8),
  pnl_pct NUMERIC(10, 4),
  last_rebalanced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_positions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_portfolio_user_token ON portfolio_positions(user_id, token_address);

-- Portfolio transactions
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  position_id TEXT NOT NULL REFERENCES portfolio_positions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tx_type VARCHAR(20) NOT NULL,
  quantity NUMERIC(38, 12) NOT NULL,
  price_usd NUMERIC(24, 8),
  fee_usd NUMERIC(24, 8) DEFAULT 0,
  note TEXT,
  executed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transaction_user_date ON portfolio_transactions(user_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_transaction_position_date ON portfolio_transactions(position_id, executed_at);

-- Price alerts
CREATE TABLE IF NOT EXISTS price_alerts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_address VARCHAR(44) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  target_value NUMERIC(24, 8) NOT NULL,
  lookback_window_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_price NUMERIC(24, 8),
  triggered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_active_scan ON price_alerts(is_active, alert_type, token_address);
CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON price_alerts(user_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS unique_alert_config ON price_alerts(user_id, token_address, alert_type, target_value);

-- ============================================================================
-- ANALYTICS TABLES (Advanced Analytics Dashboard)
-- ============================================================================

-- Token snapshots
CREATE TABLE IF NOT EXISTS token_snapshots (
  id SERIAL PRIMARY KEY,
  token_address VARCHAR(44) NOT NULL,
  captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  price_usd NUMERIC(20, 8),
  risk_score INTEGER NOT NULL,
  holder_count INTEGER,
  volume_24h NUMERIC(20, 2),
  liquidity_usd NUMERIC(20, 2),
  risk_flags JSONB,
  tx_count_24h INTEGER,
  analyzer_version VARCHAR(10) DEFAULT '1.0'
);

CREATE INDEX IF NOT EXISTS idx_snapshots_token ON token_snapshots(token_address);
CREATE INDEX IF NOT EXISTS idx_snapshots_captured ON token_snapshots(captured_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_token_time ON token_snapshots(token_address, captured_at);

-- Trending tokens
CREATE TABLE IF NOT EXISTS trending_tokens (
  token_address VARCHAR(44) PRIMARY KEY,
  score NUMERIC(10, 2) NOT NULL,
  score_breakdown JSONB NOT NULL,
  rank INTEGER NOT NULL,
  volume_24h NUMERIC(20, 2),
  velocity NUMERIC(10, 2),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trending_rank ON trending_tokens(rank);
CREATE INDEX IF NOT EXISTS idx_trending_score ON trending_tokens(score);
CREATE INDEX IF NOT EXISTS idx_trending_updated ON trending_tokens(updated_at);

-- Risk statistics
CREATE TABLE IF NOT EXISTS risk_statistics (
  id SERIAL PRIMARY KEY,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  total_analyzed INTEGER NOT NULL DEFAULT 0,
  rug_detected INTEGER NOT NULL DEFAULT 0,
  false_positives INTEGER NOT NULL DEFAULT 0,
  common_flags JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_risk_stats_window ON risk_statistics(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_risk_stats_updated ON risk_statistics(updated_at);

-- ============================================================================
-- SOCIAL FEATURES TABLES (Community Features)
-- ============================================================================

-- Token comments
CREATE TABLE IF NOT EXISTS token_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_address VARCHAR(44) NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  rating INTEGER,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  downvote_count INTEGER NOT NULL DEFAULT 0,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_comments_token ON token_comments(token_address);
CREATE INDEX IF NOT EXISTS idx_token_comments_user ON token_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_token_comments_created ON token_comments(created_at);

-- Comment votes
CREATE TABLE IF NOT EXISTS comment_votes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id TEXT NOT NULL REFERENCES token_comments(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_comment_vote ON comment_votes(user_id, comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);

-- Community votes
CREATE TABLE IF NOT EXISTS community_votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_address VARCHAR(44) NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL,
  confidence INTEGER NOT NULL,
  reason TEXT,
  weight NUMERIC(10, 2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_community_vote ON community_votes(token_address, user_id);
CREATE INDEX IF NOT EXISTS idx_community_votes_token ON community_votes(token_address);
CREATE INDEX IF NOT EXISTS idx_community_votes_user ON community_votes(user_id);

-- Community vote summaries
CREATE TABLE IF NOT EXISTS community_vote_summaries (
  token_address VARCHAR(44) PRIMARY KEY,
  safe_weight NUMERIC(20, 2) NOT NULL DEFAULT 0,
  risky_weight NUMERIC(20, 2) NOT NULL DEFAULT 0,
  scam_weight NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_votes INTEGER NOT NULL DEFAULT 0,
  consensus VARCHAR(10),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_community_vote_summaries_consensus ON community_vote_summaries(consensus);

-- Shared watchlists
CREATE TABLE IF NOT EXISTS shared_watchlists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  share_slug VARCHAR(20) NOT NULL UNIQUE,
  followers_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shared_watchlists_owner ON shared_watchlists(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_watchlists_public ON shared_watchlists(is_public);
CREATE INDEX IF NOT EXISTS idx_shared_watchlists_slug ON shared_watchlists(share_slug);

-- Watchlist followers
CREATE TABLE IF NOT EXISTS watchlist_followers (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  watchlist_id TEXT NOT NULL REFERENCES shared_watchlists(id) ON DELETE CASCADE,
  followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_watchlist_follower ON watchlist_followers(user_id, watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_followers_user ON watchlist_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_followers_watchlist ON watchlist_followers(watchlist_id);

-- Token reports
CREATE TABLE IF NOT EXISTS token_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_address VARCHAR(44) NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_type VARCHAR(20) NOT NULL,
  evidence TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewer_id TEXT REFERENCES users(id),
  resolution_notes TEXT,
  severity_score INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_reports_token ON token_reports(token_address);
CREATE INDEX IF NOT EXISTS idx_token_reports_reporter ON token_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_token_reports_status ON token_reports(status);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Core user table for authentication and profile management';
COMMENT ON TABLE sessions IS 'Session storage for express-session';
COMMENT ON TABLE subscriptions IS 'User subscription management with Whop integration';
COMMENT ON TABLE wallet_connections IS 'Solana wallet connections for token-gated access';
COMMENT ON TABLE kol_wallets IS 'Key Opinion Leader wallet tracking';
COMMENT ON TABLE analysis_runs IS 'Historical token analysis for ML training';
COMMENT ON TABLE bad_actor_labels IS 'Blacklist database for known scammers';

-- Migration complete
SELECT 'Base tables migration completed successfully' AS status;
