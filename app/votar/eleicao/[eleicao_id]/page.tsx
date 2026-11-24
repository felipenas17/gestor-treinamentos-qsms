'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, XCircle, Vote, AlertCircle, Loader2, ChevronRight, User, Hash } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Chapa {
  id: string;
  numero_chapa: number;
  nome: string | null;
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

type Step =
  | 'identifying'  // formulário CPF + nome
  | 'identifying_loading'  // aguardando resposta da API
  | 'already_voted'
  | 'closed'
  | 'voting'
  | 'confirming'
  | 'success'
  | 'error_not_found'
  | 'error_name'
  | 'error_not_in_list'
  | 'error_generic';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VotarEleicaoPage() {
  const { eleicao_id } = useParams<{ eleicao_id: string }>();

  const [step, setStep]               = useState<Step>('identifying');
  const [cpf, setCpf]                 = useState('');
  const [nome, setNome]               = useState('');
  const [errorMsg, setErrorMsg]       = useState('');

  // After identification
  const [token, setToken]             = useState('');
  const [eleitorNome, setEleitorNome] = useState('');
  const [eleicao, setEleicao]         = useState<Eleicao | null>(null);
  const [chapas, setChapas]           = useState<Chapa[]>([]);
  const [selected, setSelected]       = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [voteError, setVoteError]     = useState('');

  // ── Identify voter ──────────────────────────────────────────────────────

  const identify = useCallback(async () => {
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) { setErrorMsg('Informe o CPF completo (11 dígitos).'); return; }
    if (!nome.trim()) { setErrorMsg('Informe seu nome completo.'); return; }

    setErrorMsg('');
    setStep('identifying_loading');

    try {
      const res = await fetch('/api/votar/identificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eleicao_id, cpf: cpfDigits, nome: nome.trim() }),
      });
      const data = await res.json();

      if (res.status === 403 && data.error === 'closed') {
        setEleicao(data.eleicao ?? null);
        setStep('closed');
        return;
      }

      if (!res.ok) {
        if (res.status === 404 && data.error?.includes('CPF')) { setStep('error_not_found'); return; }
        if (res.status === 401) { setStep('error_name'); return; }
        if (res.status === 403) { setStep('error_not_in_list'); return; }
        setErrorMsg(data.error ?? 'Erro ao identificar. Tente novamente.');
        setStep('identifying');
        return;
      }

      setEleicao(data.eleicao);

      if (data.votou) {
        setEleitorNome(data.eleitorNome ?? nome.trim());
        setStep('already_voted');
        return;
      }

      setToken(data.token);
      setEleitorNome(data.eleitorNome);
      setChapas(data.chapas ?? []);
      setStep('voting');
    } catch {
      setErrorMsg('Falha de conexão. Verifique sua internet e tente novamente.');
      setStep('identifying');
    }
  }, [cpf, nome, eleicao_id]);

  // ── Submit vote ──────────────────────────────────────────────────────────

  async function submitVote() {
    if (!selected || !token) return;
    setSubmitting(true);
    setVoteError('');
    try {
      const res = await fetch('/api/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, chapa_id: selected }),
      });
      const data = await res.json();
      if (res.ok) { setStep('success'); }
      else { setVoteError(data.error ?? 'Erro ao registrar voto'); setStep('voting'); }
    } catch {
      setVoteError('Falha de conexão. Tente novamente.');
      setStep('voting');
    } finally {
      setSubmitting(false);
    }
  }

  const chapaSelected = chapas.find(c => c.id === selected);

  // ── Layouts ──────────────────────────────────────────────────────────────

  // Identification form
  if (step === 'identifying' || step === 'identifying_loading') return (
    <PageShell>
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-2">
            <Vote className="w-7 h-7 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Votação CIPA</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Identifique-se para acessar a cédula de votação
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          {/* CPF */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              CPF
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                disabled={step === 'identifying_loading'}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-base disabled:opacity-60"
              />
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Nome completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Como está no cadastro"
                value={nome}
                onChange={e => setNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') identify(); }}
                disabled={step === 'identifying_loading'}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          <button
            onClick={identify}
            disabled={step === 'identifying_loading'}
            className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {step === 'identifying_loading'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando…</>
              : 'Acessar votação'}
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          Seus dados são usados apenas para identificação nesta votação.
        </p>
      </div>
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

  if (step === 'error_not_found') return (
    <PageShell>
      <StatusCard
        icon={<XCircle className="w-16 h-16 text-red-500" />}
        title="CPF não encontrado"
        message="Seu CPF não foi localizado na lista de colaboradores ativos. Verifique o número digitado ou consulte o RH."
        color="red"
        onBack={() => setStep('identifying')}
      />
    </PageShell>
  );

  if (step === 'error_name') return (
    <PageShell>
      <StatusCard
        icon={<XCircle className="w-16 h-16 text-red-500" />}
        title="Nome não confere"
        message="O nome informado não corresponde ao cadastro. Digite seu nome completo exatamente como está registrado na empresa."
        color="red"
        onBack={() => setStep('identifying')}
      />
    </PageShell>
  );

  if (step === 'error_not_in_list') return (
    <PageShell>
      <StatusCard
        icon={<AlertCircle className="w-16 h-16 text-yellow-500" />}
        title="Fora da lista"
        message="Você não está na lista de eleitores desta eleição. Consulte o responsável pela CIPA."
        color="yellow"
        onBack={() => setStep('identifying')}
      />
    </PageShell>
  );

  if (step === 'error_generic') return (
    <PageShell>
      <StatusCard
        icon={<XCircle className="w-16 h-16 text-red-500" />}
        title="Erro inesperado"
        message="Ocorreu um erro. Tente novamente ou consulte o responsável."
        color="red"
        onBack={() => setStep('identifying')}
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
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-2">
            <Vote className="w-7 h-7 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Confirmar voto</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Eleição CIPA {eleicao?.ano} · {fmtDate(eleicao?.data_eleicao ?? null)}
          </p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-2xl p-6 text-center space-y-1">
          <p className="text-xs uppercase tracking-widest text-orange-600 font-semibold">Sua escolha</p>
          <p className="text-4xl font-black text-orange-600">
            {chapaSelected.nome ?? `Chapa ${String(chapaSelected.numero_chapa).padStart(2, '0')}`}
          </p>
          <p className="font-semibold text-gray-800 dark:text-gray-100 mt-2">{chapaSelected.candidato_titular}</p>
          {chapaSelected.candidato_suplente && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Suplente: {chapaSelected.candidato_suplente}</p>
          )}
        </div>

        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          Após confirmar, seu voto não poderá ser alterado.
        </p>

        {voteError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 text-center">
            {voteError}
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
                      {chapa.nome ?? `Chapa ${String(chapa.numero_chapa).padStart(2, '0')}`}
                    </p>
                    <p className={[
                      'text-sm truncate mt-0.5',
                      isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400',
                    ].join(' ')}>
                      {chapa.candidato_titular}
                    </p>
                    {chapa.candidato_suplente && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                        Suplente: {chapa.candidato_suplente}
                      </p>
                    )}
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

        {voteError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 text-center">
            {voteError}
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
  icon, title, message, color, onBack,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  color: 'green' | 'red' | 'yellow';
  onBack?: () => void;
}) {
  const bg: Record<string, string> = {
    green:  'bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800',
    red:    'bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  };
  return (
    <div className="max-w-sm w-full mx-auto space-y-4">
      <div className={`rounded-2xl border p-8 text-center space-y-4 ${bg[color]}`}>
        <div className="flex justify-center">{icon}</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{message}</p>
      </div>
      {onBack && (
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
