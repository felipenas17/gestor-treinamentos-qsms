/**
 * Edge Function: alertas-vencimento
 * Roda diariamente via cron do Supabase.
 * Busca certificações vencendo em 30 e 7 dias + já vencidas e envia e-mails.
 * 
 * Deploy: supabase functions deploy alertas-vencimento
 * Cron: supabase functions schedule alertas-vencimento "0 7 * * *" (todo dia às 7h)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'QSMS Tiger Rentank <qsms@tigerrentank.com.br>';

interface AlertRecord {
  employee_name: string;
  employee_email: string;
  procedure_name: string;
  procedure_code: string;
  days_remaining: number;
  validity_date: string;
  status: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log(`[MOCK EMAIL] Para: ${to} | ${subject}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) console.error('Erro Resend:', await res.text());
}

function buildEmailHtml(record: AlertRecord): string {
  const urgencyColor = record.days_remaining < 0 ? '#dc2626' : record.days_remaining <= 7 ? '#ea580c' : '#d97706';
  const urgencyLabel = record.days_remaining < 0 ? '🔴 VENCIDO' : record.days_remaining <= 7 ? '🟠 URGENTE' : '🟡 ATENÇÃO';

  return `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:24px">
      <div style="background:#0f1117;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="color:#ffffff;margin:0;font-size:16px">🛡️ Gestor de Treinamentos — Tiger Rentank QSMS</h2>
      </div>
      <div style="background:#ffffff;border:1px solid #e2e8f0;padding:24px;border-radius:0 0 8px 8px">
        <p style="color:#475569;font-size:14px">Olá, <strong>${record.employee_name}</strong>,</p>
        <div style="background:${urgencyColor}15;border-left:4px solid ${urgencyColor};padding:12px 16px;border-radius:4px;margin:16px 0">
          <p style="color:${urgencyColor};font-weight:600;margin:0;font-size:14px">${urgencyLabel}: ${record.procedure_code} — ${record.procedure_name}</p>
          <p style="color:#64748b;margin:4px 0 0;font-size:13px">
            Validade: ${record.validity_date} &nbsp;|&nbsp; 
            ${record.days_remaining < 0 ? `Vencido há ${Math.abs(record.days_remaining)} dias` : `Vence em ${record.days_remaining} dias`}
          </p>
        </div>
        <p style="color:#64748b;font-size:13px;line-height:1.6">
          ${record.days_remaining < 0
            ? 'Este certificado está <strong>vencido</strong>. Entre em contato com o setor de QSMS imediatamente para regularização e agendamento de reciclagem.'
            : 'Seu certificado está próximo do vencimento. Acesse o link abaixo para realizar a avaliação de reciclagem antes do prazo.'}
        </p>
        <div style="text-align:center;margin:24px 0">
          <a href="${Deno.env.get('APP_URL') || 'https://app.tigerrentank.com.br'}/provas" 
             style="background:#2563eb;color:#ffffff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
            Realizar Avaliação de Reciclagem
          </a>
        </div>
        <p style="color:#94a3b8;font-size:11px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">
          Tiger Rentank do Brasil — QSMS Offshore | Clientes: Petrobras, PRIO, Clariant, MODEC<br>
          Este é um e-mail automático. Dúvidas: qsms@tigerrentank.com.br
        </p>
      </div>
    </div>
  `;
}

Deno.serve(async (_req) => {
  try {
    console.log('[alertas-vencimento] Iniciando verificação diária...');

    // Buscar registros vencidos ou vencendo em até 30 dias
    const { data: alertas, error } = await supabase
      .from('trainings')
      .select(`
        days_remaining,
        validity_date,
        status,
        procedures (code, name),
        employees (name, email)
      `)
      .or('status.eq.Vencido,status.eq.Reciclar')
      .order('days_remaining');

    if (error) throw error;
    if (!alertas || alertas.length === 0) {
      return new Response(JSON.stringify({ message: 'Sem alertas para enviar.' }), { status: 200 });
    }

    let enviados = 0;
    const logs: string[] = [];

    for (const row of alertas as any[]) {
      if (!row.employees?.email) continue;

      const record: AlertRecord = {
        employee_name: row.employees.name,
        employee_email: row.employees.email,
        procedure_name: row.procedures?.name || '—',
        procedure_code: row.procedures?.code || '—',
        days_remaining: row.days_remaining,
        validity_date: new Date(row.validity_date).toLocaleDateString('pt-BR'),
        status: row.status,
      };

      // Só envia nos gatilhos: vencido, 30 dias, 7 dias
      const d = record.days_remaining;
      const shouldSend = d < 0 || d <= 7 || (d <= 30 && d % 7 === 0);
      if (!shouldSend) continue;

      const subject = d < 0
        ? `🔴 VENCIDO: ${record.procedure_code} | Tiger Rentank QSMS`
        : `⚠️ Reciclagem em ${d} dias: ${record.procedure_code} | QSMS`;

      await sendEmail(record.employee_email, subject, buildEmailHtml(record));
      logs.push(`${record.employee_name} — ${record.procedure_code} (${d} dias)`);
      enviados++;
    }

    // Notificar QSMS também com resumo
    const vencidos = alertas.filter((r: any) => r.status === 'Vencido').length;
    const reciclar = alertas.filter((r: any) => r.status === 'Reciclar').length;

    await sendEmail(
      'qsms@tigerrentank.com.br',
      `📊 Resumo diário QSMS — ${new Date().toLocaleDateString('pt-BR')}`,
      `<div style="font-family:Arial,sans-serif;padding:24px">
        <h3 style="color:#0f1117">Resumo de Alertas — ${new Date().toLocaleDateString('pt-BR')}</h3>
        <p>🔴 <strong>${vencidos}</strong> certificações vencidas</p>
        <p>🟡 <strong>${reciclar}</strong> certificações a reciclar</p>
        <p>📧 <strong>${enviados}</strong> e-mails enviados</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
        <pre style="font-size:12px;color:#475569">${logs.join('\n')}</pre>
      </div>`
    );

    console.log(`[alertas-vencimento] ✅ ${enviados} alertas enviados.`);
    return new Response(JSON.stringify({ enviados, vencidos, reciclar, logs }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[alertas-vencimento] Erro:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
