-- Add motivo column to impersonation_tokens table
ALTER TABLE impersonation_tokens ADD COLUMN IF NOT EXISTS motivo TEXT NOT NULL DEFAULT '';