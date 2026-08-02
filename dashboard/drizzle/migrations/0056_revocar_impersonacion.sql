-- Add session revocation columns to impersonation_tokens table
ALTER TABLE impersonation_tokens ADD COLUMN IF NOT EXISTS session_jti VARCHAR(64);
ALTER TABLE impersonation_tokens ADD COLUMN IF NOT EXISTS session_revoked_at TIMESTAMPTZ;

-- Index for fast revocation lookup by jti
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_session_jti ON impersonation_tokens (session_jti);
