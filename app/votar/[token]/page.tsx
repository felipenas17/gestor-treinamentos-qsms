'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, XCircle, Vote, AlertCircle, Loader2, ChevronRight } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Chapa {
  id: string;
  numero_chapa: number;
  candidato_titular: string;
  candidato_suplente: string | null;
}

interface Eleicao {
  id: string;
  ano: number;
  data_eleicao: string | null;
  status: string;
  observacoes: string | null;
}

type Step = 'loading' | 'invalid' | 'already_voted' | 'closed' | 'voting' | 'confirming' | 'success' | 'error';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VotarPage() {
  const { token } = useParams<{ token: string }>();

  const [step, setStep]               = useState<Step>('loading');
  const [eleitorNome, setEleitorNome] = useState('');
  const [eleicao, setEleicao]         = useState<Eleicao | null>(null);
  const [chapas, setChapas]           = useState<Chapa[]>([]);
  const [selected, setSelected]       = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

  const load = useCallback(async () => {
    if (!token) { setStep('invalid'); return; }
    try {
      const res = await fetch(`/api/votar?token=${token}`);
      if (!res.ok) { setStep('invalid'); return; }
      const data = await res.json();
      setEleitorNome(data.eleitor.nome);
      setEleicao(data.eleicao);
      setChapas(data.chapas);
      if (data.eleitor.votou) { setStep('already_voted'); return; }
      if (data.eleicao.status !== 'em_andamento') { setStep('closed'); return; }
      setStep('voting');
    } catch {
      setStep('error');
    }
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function submitVote() {
    if (!selected) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, chapa_id: selected }),
      });
      const data = await res.json();
      if (res.ok) { setStep('success'); }
      else { setErrorMsg(data.error ?? 'Erro ao registrar voto'); setStep('voting'); }
    } catch {
      setErrorMsg('Falha de conexão. Tente novamente.');
      setStep('voting');
    } finally {
      setSubmitting(false);
    }
  }

  const chapaSelected = chapas.find(c => c.id === selected);

  // ── Layouts ─────────────────────────────────────────────────────────────

  if (step === 'loading') return (
    <PageShell>
      <div className="flex flex-col items-center gap-4 py-16 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-sm">Carregando urna…</p>
      </div>
    </PageShell>
  );

  if (step === 'invalid') return (
    <PageShell>
      <StatusCard
        icon={<XCircle className="w-16 h-16 text-red-500" />}
        title="Link inválido"
        message="Este QR Code não foi reconhecido. Verifique se escaneou o código correto e tente novamente."
        color="red"
      />
    </PageShell>
  );

  if (step === 'closed') return (
    <PageShell>
      <StatusCard
        icon={<AlertCircle className="w-16 h-16 text-yellow-500" />}
        title="Votação encerrada"
        message={eleicao
          ? `A eleição CIPA ${eleicao.ano} não está aberta para votação no momento. Consulte o responsável.`
          : 'Esta eleição não está disponível para votação.'}
        color="yellow"
      />
    </PageShell>
  );

  if (step === 'already_voted') return (
    <PageShell>
      <StatusCard
        icon={<CheckCircle className="w-16 h-16 text-green-500" />}
        title="Voto já registrado"
        message={`Olá, ${eleitorNome}. Seu voto na eleição CIPA ${eleicao?.ano ?? ''} já foi contabilizado. Obrigado pela participação!`}
        color="green"
      />
    </PageShell>
  );

  if (step === 'success') return (
    <PageShell>
      <StatusCard
        icon={<CheckCircle className="w-16 h-16 text-green-500" />}
        title="Voto registrado!"
        message={`Obrigado, ${eleitorNome}! Seu voto foi contabilizado com sucesso para a eleição CIPA ${eleicao?.ano ?? ''}. O resultado será divulgado após o encerramento da votação.`}
        color="green"
      />
    </PageShell>
  );

  if (step === 'confirming' && chapaSelected) return (
    <PageShell>
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-2">
            <Vote className="w-7 h-7 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Confirmar voto</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Eleição CIPA {eleicao?.ano} · {fmtDate(eleicao?.data_eleicao ?? null)}</p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-2xl p-6 text-center space-y-1">
          <p className="text-xs uppercase tracking-widest text-orange-600 font-semibold">Sua escolha</p>
          <p className="text-4xl font-black text-orange-600">Chapa {String(chapaSelected.numero_chapa).padStart(2, '0')}</p>
          <p className="font-semibold text-gray-800 dark:text-gray-100 mt-2">{chapaSelected.candidato_titular}</p>
          {chapaSelected.candidato_suplente && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Suplente: {chapaSelected.candidato_suplente}</p>
          )}
        </div>

        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          Após confirmar, seu voto não poderá ser alterado.
        </p>

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setStep('voting')}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={submitVote}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : 'Confirmar voto'}
          </button>
        </div>
      </div>
    </PageShell>
  );

  // ── Voting ballot ──────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-2">
            <Vote className="w-7 h-7 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Eleição CIPA {eleicao?.ano}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Olá, <strong>{eleitorNome}</strong>. Escolha uma chapa para votar.
          </p>
          {eleicao?.data_eleicao && (
            <p className="text-xs text-gray-400">{fmtDate(eleicao.data_eleicao)}</p>
          )}
        </div>

        {/* Chapas */}
        <div className="space-y-3">
          {chapas.map(chapa => {
            const isSelected = selected === chapa.id;
            return (
              <button
                key={chapa.id}
                onClick={() => setSelected(isSelected ? null : chapa.id)}
                className={[
                  'w-full text-left rounded-2xl border-2 p-5 transition-all',
                  isSelected
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 bg-white dark:bg-gray-800',
                ].join(' ')}
              >
                <div className="flex items-center gap-4">
                  {/* Chapa number */}
                  <div className={[
                    'w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0',
                    isSelected
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
                  ].join(' ')}>
                    {String(chapa.numero_chapa).padStart(2, '0')}
                  </div>

                  {/* Names */}
                  <div className="flex-1 min-w-0">
                    <p className={[
                      'font-semibold truncate',
                      isSelected ? 'text-orange-700 dark:text-orange-300' : 'text-gray-800 dark:text-gray-100',
                    ].join(' ')}>
                      {chapa.candidato_titular}
                    </p>
                    {chapa.candidato_suplente && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        Suplente: {chapa.candidato_suplente}
                      </p>
                    )}
                    <p className={[
                      'text-xs mt-1 font-medium',
                      isSelected ? 'text-orange-500' : 'text-gray-400',
                    ].join(' ')}>
                      Chapa {String(chapa.numero_chapa).padStart(2, '0')}
                    </p>
                  </div>

                  {/* Radio indicator */}
                  <div className={[
                    'w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                    isSelected
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-gray-300 dark:border-gray-600',
                  ].join(' ')}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        {/* Vote button */}
        <button
          onClick={() => { if (selected) setStep('confirming'); }}
          disabled={!selected}
          className="w-full py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-bold text-base transition-colors flex items-center justify-center gap-2"
        >
          Votar na chapa selecionada
          {selected && <ChevronRight className="w-5 h-5" />}
        </button>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          Seu voto é individual e será registrado de forma segura.
        </p>
      </div>
    </PageShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-start py-10 px-4">
      {/* Tiger Rentank branding */}
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">Tiger Rentank</p>
        <p className="text-xs text-gray-400 mt-0.5">Sistema de Gestão QSMS</p>
      </div>
      {children}
      <p className="mt-10 text-xs text-gray-300 dark:text-gray-600 text-center">
        Eleição CIPA · Portal QSMS
      </p>
    </div>
  );
}

function StatusCard({
  icon, title, message, color,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  color: 'green' | 'red' | 'yellow';
}) {
  const bg: Record<string, string> = {
    green:  'bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800',
    red:    'bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  };
  return (
    <div className={`max-w-sm w-full mx-auto rounded-2xl border p-8 text-center space-y-4 ${bg[color]}`}>
      <div className="flex justify-center">{icon}</div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{message}</p>
    </div>
  );
}
