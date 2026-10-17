-- H5S: rate-limit counters via session rows + PDF bytes (Render disk is ephemeral)
ALTER TABLE demo_sessions
  ADD COLUMN IF NOT EXISTS pdf_bytes BYTEA,
  ADD COLUMN IF NOT EXISTS client_ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS attempt INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS demo_sessions_ip_created_idx
  ON demo_sessions (client_ip_hash, created_at DESC);
