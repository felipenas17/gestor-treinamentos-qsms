-- Migration: Gestão de EPI/EPC
-- Projeto: Tiger Rentank (zwmqiuemrsyjauvohgtl)

CREATE TABLE IF NOT EXISTS epis (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  nome             TEXT         NOT NULL,
  tipo             TEXT         NOT NULL CHECK (tipo IN ('EPI', 'EPC')),
  categoria        TEXT         NOT NULL,
  ca_numero        TEXT,
  ca_validade      DATE,
  fabricante       TEXT,
  fornecedor       TEXT,
  norma_tecnica    TEXT,
  vida_util_meses  INTEGER,
  funcoes          TEXT[]       DEFAULT '{}',
  observacoes      TEXT,
  status           TEXT         DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE epis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_epis" ON epis FOR ALL USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_epis_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER epis_updated_at
  BEFORE UPDATE ON epis
  FOR EACH ROW EXECUTE FUNCTION update_epis_updated_at();

-- Seed inicial com EPIs comuns para operações offshore
INSERT INTO epis (nome, tipo, categoria, ca_numero, ca_validade, fabricante, norma_tecnica, vida_util_meses, funcoes) VALUES
  ('Capacete de Segurança Classe B',   'EPI', 'Proteção da Cabeça',   '12345', '2027-06-30', 'MSA Safety',    'NR-6 / ABNT NBR 8221',  60, ARRAY['Operador de Guindaste','Técnico de Manutenção','Inspetor','Assistente QSMS']),
  ('Óculos de Proteção Ampla Visão',   'EPI', 'Proteção dos Olhos',   '23456', '2027-03-31', 'Uvex',          'NR-6 / ABNT NBR 15692',  36, ARRAY['Operador de Guindaste','Técnico de Manutenção']),
  ('Protetor Auditivo Tipo Concha',    'EPI', 'Proteção Auditiva',    '34567', '2026-12-31', '3M',            'NR-6 / NR-15',           24, ARRAY['Operador de Guindaste','Técnico de Manutenção']),
  ('Luva de Vaqueta',                  'EPI', 'Proteção das Mãos',    '45678', '2027-09-30', 'Kalipso',       'NR-6',                   12, ARRAY['Técnico de Manutenção','Operador de Guindaste']),
  ('Bota de Segurança com Biqueira',   'EPI', 'Proteção dos Pés',     '56789', '2027-01-31', 'Marluvas',      'NR-6 / ABNT NBR 20940',  24, ARRAY['Operador de Guindaste','Técnico de Manutenção','Assistente QSMS']),
  ('Cinto de Segurança Paraquedista',  'EPI', 'Proteção Contra Quedas','67890','2027-04-30', 'Protabras',     'NR-6 / NR-35',           60, ARRAY['Operador de Guindaste','Técnico de Manutenção']),
  ('Colete Salva-Vidas',               'EPI', 'Segurança Aquática',   '78901', '2027-08-31', 'Crewsaver',     'NR-6 / NORMAM-01',       60, ARRAY['Operador de Guindaste','Assistente QSMS']),
  ('Máscara Semifacial PFF2',          'EPI', 'Proteção Respiratória','89012', '2026-11-30', '3M',            'NR-6 / ABNT NBR 13698',   6, ARRAY['Técnico de Manutenção']),
  ('Tela de Proteção (EPC)',           'EPC', 'Proteção Coletiva',    NULL,    NULL,          'Prottector',    'NR-18',                  NULL, ARRAY['Técnico de Manutenção']),
  ('Detector de Gás Portátil',         'EPI', 'Detecção de Gases',    '90123', '2027-05-31', 'Industrial Scientific', 'NR-13',          36, ARRAY['Técnico de Manutenção','Operador de Guindaste']);
