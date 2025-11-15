-- Create scan_history table for Pump.fun webhook integration
-- This stores all auto-scanned tokens from Pump.fun

CREATE TABLE IF NOT EXISTS scan_history (
  id SERIAL PRIMARY KEY,
  token_address VARCHAR(44) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  name VARCHAR(200),
  risk_score INTEGER NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  grade VARCHAR(20), -- Diamond, Gold, Silver, Bronze, Red Flag
  whale_count INTEGER DEFAULT 0,
  bundle_score INTEGER,
  honeypot_detected BOOLEAN DEFAULT false,
  analysis_data JSONB, -- Full TokenAnalysisResponse
  insight TEXT, -- Smart professional insight
  chart_url TEXT, -- Base64 chart image (optional)
  source VARCHAR(50) DEFAULT 'pumpfun', -- pumpfun, manual, api
  scanned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS scan_history_token_address_idx ON scan_history(token_address);
CREATE INDEX IF NOT EXISTS scan_history_scanned_at_idx ON scan_history(scanned_at DESC);
CREATE INDEX IF NOT EXISTS scan_history_risk_score_idx ON scan_history(risk_score DESC);
CREATE INDEX IF NOT EXISTS scan_history_source_idx ON scan_history(source);

-- Add comment
COMMENT ON TABLE scan_history IS 'Real-time scan history from Pump.fun webhook integration';
