-- Migration: Add user access control table for Whop integration and token-gating
-- Date: 2025-11-30

CREATE TABLE IF NOT EXISTS user_access_control (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL UNIQUE,  -- discord:123 or telegram:456 or discord_group:789 or telegram_group:456
  is_group BOOLEAN NOT NULL DEFAULT FALSE,
  access_type VARCHAR(50) DEFAULT 'trial',  -- trial, token_holder, paid, denied
  wallet_address VARCHAR(44),               -- Linked Solana wallet for token-gating
  trial_ends_at TIMESTAMP,                  -- 7 days from first use
  membership_expires_at TIMESTAMP,          -- For Whop subscriptions
  last_validated_at TIMESTAMP,              -- Last time access was checked
  whop_membership_id VARCHAR(255),          -- Whop membership identifier
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS user_access_identifier_idx ON user_access_control(identifier);
CREATE INDEX IF NOT EXISTS user_access_type_idx ON user_access_control(access_type);
CREATE INDEX IF NOT EXISTS user_access_trial_ends_idx ON user_access_control(trial_ends_at);
CREATE INDEX IF NOT EXISTS user_access_wallet_idx ON user_access_control(wallet_address);

-- Comments
COMMENT ON TABLE user_access_control IS 'Manages access control for users and groups with trial periods, token-gating, and Whop subscriptions';
COMMENT ON COLUMN user_access_control.identifier IS 'Unique identifier: discord:userId, telegram:userId, discord_group:groupId, telegram_group:chatId';
COMMENT ON COLUMN user_access_control.is_group IS 'Whether this is a group/channel (true) or individual user (false)';
COMMENT ON COLUMN user_access_control.access_type IS 'Current access method: trial (7-day free), token_holder (10M+ tokens), paid (Whop subscription), denied';
COMMENT ON COLUMN user_access_control.wallet_address IS 'Linked Solana wallet address for token balance verification';
COMMENT ON COLUMN user_access_control.trial_ends_at IS 'Timestamp when 7-day trial period expires';
COMMENT ON COLUMN user_access_control.membership_expires_at IS 'Timestamp when Whop subscription expires';
