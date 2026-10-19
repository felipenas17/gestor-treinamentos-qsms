/**
 * Edge Function: alertas-vencimento
 * Cron diário (08h BRT) — verifica treinamentos, documentos e obrigações.
 * Envia e-mails individuais (treinamentos) + digest QSMS (todos os módulos) via Resend.
 *
 * Segredos necessários (supabase secrets set):
 *   RESEND_API_KEY   — chave da API Resend (https://resend.com)
 *   QSMS_EMAIL       — destinatário do digest (ex: qsms@tigerrentank.com.br)
 *   APP_URL          — URL do app (ex: https://app.tigerrentank.com.br)
 *
 * Deploy:
 *   supabase functions deploy alertas-vencimento --project-ref zwmqiuemrsyjauvohgtl
 *
 * Cron (pg_cron via Supabase Dashboard → Edge Functions → Schedule):
 *   "0 11 * * *"  =>  08:00 BRT (UTC-3)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL    = 'QSMS Tiger Rentank <qsms@tigerrentank.com.br>';
const QSMS_EMAIL    = Deno.env.get('QSMS_EMAIL') || 'qsms@tigerrentank.com.br';
const APP_URL       = Deno.env.get('APP_URL')    || 'https://app.tigerrentank.com.br';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Dias entre hoje e dateStr (negativo = vencido). Null se dateStr ausente. */
function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Decide se deve alertar hoje para este valor de dias.
 * Gatilhos: vence hoje, 7d, 15d, 30d antes; 1d, 7d, 14d depois de vencer.
 */
function shouldAlert(d: number): boolean {
  if (d >= 0) return d === 0 || d === 7 || d === 15 || d === 30;
  return d === -1 || d % 7 === 0; // dia seguinte ao vencimento + semanalmente
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[MOCK] → ${to} | ${subject}`);
    return true;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) {
      console.error('Resend error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('sendEmail exception:', e);
    return false;
  }
}

function urgency(d: number) {
  if (d < 0)  return { color: '#dc2626', bg: '#fef2f2', label: '🔴 VENCIDO' };
  if (d === 0) return { color: '#dc2626', bg: '#fef2f2', label: '🔴 VENCE HOJE' };
  if (d <= 7)  return { color: '#ea580c', bg: '#fff7ed', label: '🟠 URGENTE' };
  if (d <= 15) return { color: '#d97706', bg: '#fffbeb', label: '🟡 ATENÇÃO' };
  return       { color: '#2563eb', bg: '#eff6ff', label: '🔵 AVISO' };
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('pt-BR');
}

function fmtDays(d: number): string {
  if (d < 0) return `Vencido há ${Math.abs(d)} dia${Math.abs(d) !== 1 ? 's' : ''}`;
  if (d === 0) return 'Vence hoje';
  return `Vence em ${d} dia${d !== 1 ? 's' : ''}`;
}

// ─── Templates de e-mail ─────────────────────────────────────────────────────

function buildTrainingEmail(
  empName: string,
  procCode: string,
  procName: string,
  validityDate: string,
  d: number
): string {
  const u = urgency(d);
  return `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:24px">
  <div style="background:#0f1117;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#fff;margin:0;font-size:16px">🛡️ Gestor de Treinamentos — Tiger Rentank QSMS</h2>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;padding:24px;border-radius:0 0 8px 8px">
    <p style="color:#475569;font-size:14px;margin-bottom:16px">
      Olá, <strong>${empName}</strong>,
    </p>
    <div style="background:${u.bg};border-left:4px solid ${u.color};padding:12px 16px;border-radius:4px;margin:0 0 16px">
      <p style="color:${u.color};font-weight:700;margin:0 0 4px;font-size:14px">
        ${u.label}: ${procCode} — ${procName}
      </p>
      <p style="color:#64748b;margin:0;font-size:13px">
        Validade: <strong>${fmtDate(validityDate)}</strong> &nbsp;|&nbsp; ${fmtDays(d)}
      </p>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.6">
      ${d < 0
        ? 'Seu certificado está <strong>vencido</strong>. Regularize junto ao setor de QSMS para manter sua habilitação operacional.'
        : 'Seu certificado está próximo do vencimento. Realize a avaliação de reciclagem antes do prazo para manter sua certificação ativa.'
      }
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/provas"
         style="background:#2563eb;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        Realizar Avaliação de Reciclagem
      </a>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">
      Tiger Rentank do Brasil — QSMS Offshore | Petrobras · PRIO · Clariant · MODEC<br>
      E-mail automático. Dúvidas: qsms@tigerrentank.com.br
    </p>
  </div>
</div>`;
}

interface DigestRow { label: string; d: number; extra?: string }

function buildDigestEmail(
  date: string,
  trainings: DigestRow[],
  docs: DigestRow[],
  obrigacoes: DigestRow[],
  enviados: number
): string {
  const kpi = (label: string, val: number, color: string) => `
    <div style="flex:1;min-width:110px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center">
      <p style="margin:0;font-size:22px;font-weight:800;color:${color}">${val}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#64748b">${label}</p>
    </div>`;

  const tableRows = (rows: DigestRow[]) => rows.map(r => {
    const u = urgency(r.d);
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#334155">${r.label}${r.extra ? ` <span style="color:#94a3b8">(${r.extra})</span>` : ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:600;color:${u.color};white-space:nowrap">${fmtDays(r.d)}</td>
    </tr>`;
  }).join('');

  const section = (title: string, rows: DigestRow[], icon: string) => rows.length === 0 ? '' : `
    <h4 style="color:#0f1117;font-size:13px;margin:20px 0 8px">${icon} ${title}</h4>
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
      ${tableRows(rows)}
    </table>`;

  const total = trainings.length + docs.length + obrigacoes.length;

  return `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <div style="background:#0f1117;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#fff;margin:0;font-size:16px">📊 Resumo Diário QSMS — ${date}</h2>
    <p style="color:#94a3b8;margin:4px 0 0;font-size:12px">Tiger Rentank do Brasil</p>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;padding:24px;border-radius:0 0 8px 8px">
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      ${kpi('Treinamentos', trainings.length, '#ef4444')}
      ${kpi('Documentos', docs.length, '#f59e0b')}
      ${kpi('Obrigações', obrigacoes.length, '#8b5cf6')}
      ${kpi('E-mails enviados', enviados, '#10b981')}
    </div>
    ${total === 0
      ? '<p style="color:#10b981;font-weight:600;font-size:14px">✅ Nenhum alerta crítico hoje. Sistema operando normalmente.</p>'
      : section('Treinamentos', trainings, '👷') + section('Controle Documental', docs, '📄') + section('Obrigações Legais', obrigacoes, '⚖️')
    }
    <p style="color:#94a3b8;font-size:11px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">
      Gerado automaticamente às 08:00 BRT · Tiger Rentank QSMS · Sistema SGI
    </p>
  </div>
</div>`;
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    console.log('[alertas-vencimento] Iniciando...');
    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    let enviados = 0;

    const trainingDigest: DigestRow[] = [];
    const docDigest: DigestRow[]      = [];
    const obrigDigest: DigestRow[]    = [];

    // ── 1. Treinamentos ──────────────────────────────────────────────────────
    const { data: trainings, error: tErr } = await supabase
      .from('trainings')
      .select(`
        id, validity_date, status,
        employees (name, email),
        procedures (code, name)
      `)
      .in('status', ['Certificado', 'Reciclar', 'Vencido'])
      .not('validity_date', 'is', null);

    if (tErr) {
      console.error('[alertas-vencimento] trainings query error:', tErr.message);
    }

    for (const row of (trainings || []) as any[]) {
      const d = daysUntil(row.validity_date);
      if (d === null || !shouldAlert(d)) continue;

      const empName  = row.employees?.name  || 'Colaborador';
      const empEmail = row.employees?.email as string | undefined;
      const procCode = row.procedures?.code || '—';
      const procName = row.procedures?.name || '—';

      trainingDigest.push({ label: `${empName} — ${procCode} ${procName}`, d });

      if (empEmail) {
        const subject = d < 0
          ? `🔴 Certificado vencido: ${procCode} | Tiger Rentank QSMS`
          : `⚠️ Reciclagem em ${d}d: ${procCode} | Tiger Rentank QSMS`;
        const ok = await sendEmail(
          empEmail, subject,
          buildTrainingEmail(empName, procCode, procName, row.validity_date, d)
        );
        if (ok) enviados++;
      }
    }

    // ── 2. Controle Documental ────────────────────────────────────────────────
    const { data: docs, error: dErr } = await supabase
      .from('doc_control')
      .select('id, code, name, expiry_date, base')
      .not('expiry_date', 'is', null);

    if (dErr) {
      console.error('[alertas-vencimento] doc_control query error:', dErr.message);
    }

    for (const doc of (docs || []) as any[]) {
      const d = daysUntil(doc.expiry_date);
      if (d === null || !shouldAlert(d)) continue;
      docDigest.push({
        label: `${doc.code} — ${doc.name}`,
        d,
        extra: doc.base || undefined,
      });
    }

    // ── 3. Obrigações Legais ─────────────────────────────────────────────────
    const { data: obrigacoes, error: oErr } = await supabase
      .from('legal_obligations')
      .select('id, title, next_due_date, responsible, base')
      .not('next_due_date', 'is', null);

    if (oErr) {
      console.error('[alertas-vencimento] legal_obligations query error:', oErr.message);
    }

    for (const o of (obrigacoes || []) as any[]) {
      const d = daysUntil(o.next_due_date);
      if (d === null || !shouldAlert(d)) continue;
      obrigDigest.push({
        label: o.title,
        d,
        extra: o.responsible || undefined,
      });
    }

    // ── 4. Digest para QSMS ──────────────────────────────────────────────────
    const total = trainingDigest.length + docDigest.length + obrigDigest.length;
    const digestSubject = total > 0
      ? `📊 Resumo QSMS — ${total} alerta${total !== 1 ? 's' : ''} | ${today}`
      : `✅ Resumo QSMS — Tudo em dia | ${today}`;

    const digestOk = await sendEmail(
      QSMS_EMAIL,
      digestSubject,
      buildDigestEmail(today, trainingDigest, docDigest, obrigDigest, enviados)
    );
    if (digestOk) enviados++;

    const summary = {
      date: today,
      trainings: trainingDigest.length,
      docs: docDigest.length,
      obrigacoes: obrigDigest.length,
      enviados,
    };

    console.log('[alertas-vencimento] ✅', JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[alertas-vencimento] Erro fatal:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
