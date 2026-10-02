-- H1.1 demo_sessions for Hacktoberfest weekend pipeline
CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,
  transcript TEXT,
  note_json JSONB,
  pdf_path TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT demo_sessions_status_check CHECK (
    status IN (
      'queued',
      'stt_running',
      'llm_running',
      'pdf_running',
      'ready',
      'failed'
    )
  )
);

CREATE INDEX IF NOT EXISTS demo_sessions_status_idx ON demo_sessions (status);
CREATE INDEX IF NOT EXISTS demo_sessions_created_at_idx ON demo_sessions (created_at DESC);
