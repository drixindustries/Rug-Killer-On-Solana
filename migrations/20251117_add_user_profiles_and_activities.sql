-- Create social feature tables required for Leaderboard
-- Safe to run multiple times

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- user_profiles stores public community profile data
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  reputation_score INTEGER NOT NULL DEFAULT 0,
  contribution_count INTEGER NOT NULL DEFAULT 0,
  visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_reputation ON user_profiles(reputation_score);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- user_activities backs reputation calculation
CREATE TABLE IF NOT EXISTS user_activities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(20) NOT NULL,
  target_token VARCHAR(44),
  target_watchlist TEXT,
  points INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
