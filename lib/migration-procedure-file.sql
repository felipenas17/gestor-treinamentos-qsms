-- Adiciona coluna file_url na tabela procedures
ALTER TABLE public.procedures 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Cria bucket para PDFs de procedimentos (executar no Supabase Dashboard > Storage OU via este SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('procedure-docs', 'procedure-docs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: qualquer usuário autenticado pode fazer upload
CREATE POLICY "QSMS upload procedure docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'procedure-docs');

-- RLS: leitura pública
CREATE POLICY "Public read procedure docs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'procedure-docs');
