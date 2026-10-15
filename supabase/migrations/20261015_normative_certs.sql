-- Migration: create normative_certs table
-- Run this in Supabase SQL Editor → New Query

CREATE TABLE IF NOT EXISTS normative_certs (
  id                  TEXT PRIMARY KEY,
  employee_name       TEXT NOT NULL,
  employee_cpf        TEXT,
  sector              TEXT NOT NULL,
  training_name       TEXT NOT NULL,
  training_code       TEXT,
  completion_date     TEXT NOT NULL,   -- formatted as dd/mm/yyyy (pt-BR)
  validity_date       TEXT NOT NULL,   -- formatted as dd/mm/yyyy (pt-BR)
  days_remaining      INTEGER NOT NULL DEFAULT 0,
  hours               INTEGER DEFAULT 8,
  provider            TEXT,
  status              TEXT NOT NULL DEFAULT 'Certificado',
  certificate_hash    TEXT,
  certificate_file_url TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and allow all (same pattern as other tables in this project)
ALTER TABLE normative_certs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_normative_certs"
  ON normative_certs FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for certificate files (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('normative-certificates', 'normative-certificates', true)
-- ON CONFLICT DO NOTHING;
