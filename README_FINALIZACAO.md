# Finalização — Gestor de Treinamentos Internos QSMS

## Arquivos entregues neste patch

| Arquivo | O que muda |
|---|---|
| `app/page.tsx` | Conecta Supabase com fallback automático para mock |
| `lib/supabase.ts` | Helpers tipados: fetch, insert, generateLink |
| `app/api/gemini/*/route.ts` | Corrigido `gemini-3.8-flash` → `gemini-2.0-flash` (3 arquivos) |
| `scripts/seed-from-planilha.ts` | Seed com dados reais da planilha |
| `supabase/functions/alertas-vencimento/index.ts` | Cron de e-mails diários |
| `.env.example` | Variáveis necessárias atualizadas |

---

## Passo a passo para subir

### 1. Reativar o Supabase
- Acesse https://supabase.com/dashboard
- Projeto: **portal-qsms** (INACTIVE → clicar em Restore)

### 2. Aplicar o schema
```sql
-- Cole o conteúdo de lib/schema.sql no SQL Editor do Supabase
```

### 3. Configurar o .env
```bash
cp .env.example .env.local
# Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
# Encontre em: Supabase Dashboard → Settings → API
```

### 4. Rodar o seed
```bash
# Adicione SUPABASE_SERVICE_ROLE_KEY no .env.local (só para este passo)
npx ts-node scripts/seed-from-planilha.ts
# Isso insere: 24 colaboradores + 20 procedimentos + registros de treinamento
```

### 5. Configurar GEMINI_API_KEY
```bash
# Obtenha em https://aistudio.google.com/app/apikey (gratuito)
# Adicione no .env.local
```

### 6. Rodar o projeto
```bash
bun install   # ou npm install
bun dev       # ou npm run dev
# Acesse: http://localhost:3000
```

### 7. Deploy dos alertas (opcional)
```bash
supabase functions deploy alertas-vencimento
# Cron diário às 7h:
supabase functions schedule alertas-vencimento "0 7 * * *"
# Adicione RESEND_API_KEY nos secrets da Edge Function
```

---

## Fluxo com Supabase ativo

```
page.tsx
  └── useEffect → fetchDashboardMetrics()  → supabase.from('trainings')
               → fetchProcedures()         → supabase.from('procedures')
               → fetchTrainingRecords()    → join employees + procedures
               → fetchSectorChartData()    → group by sector
```

Se o Supabase não estiver configurado, o app usa os dados do mock-data.ts automaticamente.
