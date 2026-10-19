-- Adiciona coluna de revisão na tabela de procedimentos
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard/project/_/sql

ALTER TABLE procedures
  ADD COLUMN IF NOT EXISTS revision TEXT NOT NULL DEFAULT 'R00';
