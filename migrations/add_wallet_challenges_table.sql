-- Migration: Add wallet_challenges table for Phantom wallet authentication
-- This table stores one-time challenges for wallet signature verification

CREATE TABLE IF NOT EXISTS wallet_challenges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  challenge TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

-- Index for quick challenge lookup
CREATE INDEX IF NOT EXISTS idx_wallet_challenges_challenge ON wallet_challenges(challenge);

-- Index for cleanup of expired challenges
CREATE INDEX IF NOT EXISTS idx_wallet_challenges_expires_at ON wallet_challenges(expires_at);
