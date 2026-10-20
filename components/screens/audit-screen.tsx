'use client';

import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck, CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, ChevronRight, FileText, GraduationCap,
  Shield, Scale, AlertOctagon, RefreshCw, Printer,
} from 'lucide-react';
import {
  Procedure, TrainingRecord, DocControl, LegalObligation, NonConformity,
} from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type FindingStatus = 'conforme' | 'atencao' | 'nao-conforme';

interface AuditFinding {
  id: string;
  module: string;
  moduleIcon: React.ReactNode;
  item: string;
  detail: string;
  status: FindingStatus;
  reference?: string;
}

interface AuditSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  findings: AuditFinding[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  // dd/mm/yyyy
  if (str.includes('/')) {
    const [d, m, y] = str.split('/');
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }
  return new Date(str + (str.length === 10 ? 'T00:00:00' : ''));
}

function daysFromNow(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - now.getTime()) / 86400000);
}

function statusDot(status: FindingStatus) {
  if (status === 'conforme') return <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />;
  if (status === 'atencao')  return <span className="w-2 h-2 rounded-full bg-amber-500  inline-block" />;
  return                            <span className="w-2 h-2 rounded-full bg-red-500    inline-block" />;
}

// ─── Score calculation ────────────────────────────────────────────────────────

function sectionScore(findings: AuditFinding[]) {
  if (!findings.length) return 100;
  const weight = { conforme: 1, atencao: 0.5, 'nao-conforme': 0 } as const;
  const sum = findings.reduce((a, f) => a + weight[f.status], 0);
  return Math.round((sum / findings.length) * 100);
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AuditScreenProps {
  procedures:       Procedure[];
  records:          TrainingRecord[];
  documents:        DocControl[];
  obligations:      LegalObligation[];
  nonConformities:  NonConformity[];
}

export function AuditScreen({
  procedures, records, documents, obligations, nonConformities,
}: AuditScreenProps) {
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [generatedAt, setGeneratedAt] = useState<string>('');

  // ── Build findings on demand ────────────────────────────────────────────────
  const sections: AuditSection[] = useMemo(() => {
    if (!generated) return [];

    // 1. Documentos
    const docFindings: AuditFinding[] = documents.map(doc => {
      const exp = parseDate(doc.expiryDate);
      const days = exp ? daysFromNow(exp) : null;
      let status: FindingStatus = 'conforme';
      let detail = 'Vigente e dentro do prazo.';
      if (days === null) {
        status = 'atencao';
        detail = 'Sem data de vencimento cadastrada.';
      } else if (days < 0) {
        status = 'nao-conforme';
        detail = `Vencido há ${Math.abs(days)} dia(s).`;
      } else if (days <= 30) {
        status = 'atencao';
        detail = `Vence em ${days} dia(s).`;
      }
      return {
        id: `doc-${doc.id}`,
        module: 'Controle Documental',
        moduleIcon: <Shield className="w-3.5 h-3.5" />,
        item: `${doc.code} — ${doc.name}`,
        detail,
        status,
        reference: doc.docType,
      };
    });

    // 2. Obrigações Legais
    const oblFindings: AuditFinding[] = obligations.map(obl => {
      const next = parseDate(obl.nextDueDate);
      const days = next ? daysFromNow(next) : null;
      let status: FindingStatus = 'conforme';
      let detail = 'Em dia.';
      if (days === null) {
        status = 'atencao';
        detail = 'Sem próxima data de execução definida.';
      } else if (days < 0) {
        status = 'nao-conforme';
        detail = `Atrasada há ${Math.abs(days)} dia(s).`;
      } else if (days <= 30) {
        status = 'atencao';
        detail = `Vence em ${days} dia(s).`;
      }
      return {
        id: `obl-${obl.id}`,
        module: 'Obrigações Legais',
        moduleIcon: <Scale className="w-3.5 h-3.5" />,
        item: obl.title,
        detail,
        status,
        reference: obl.frequency,
      };
    });

    // 3. Treinamentos
    const trainingByProc: Record<string, TrainingRecord[]> = {};
    records.forEach(r => {
      if (!trainingByProc[r.procedureCode]) trainingByProc[r.procedureCode] = [];
      trainingByProc[r.procedureCode].push(r);
    });
    const trainFindings: AuditFinding[] = records.map(r => {
      let status: FindingStatus = 'conforme';
      let detail = 'Certificação válida.';
      if (r.status === 'Vencido') {
        status = 'nao-conforme';
        detail = `Certificação vencida (${r.validityDate}).`;
      } else if (r.status === 'Reciclar') {
        status = 'atencao';
        detail = `Reciclagem necessária. Vence em ${r.daysRemaining} dia(s).`;
      } else if (r.status === 'Pendente') {
        status = 'atencao';
        detail = 'Treinamento pendente — ainda não realizado.';
      }
      return {
        id: `tr-${r.id}`,
        module: 'Treinamentos',
        moduleIcon: <GraduationCap className="w-3.5 h-3.5" />,
        item: `${r.employeeName} — ${r.procedureName}`,
        detail,
        status,
        reference: r.procedureCode,
      };
    });

    // 4. Procedimentos
    const procFindings: AuditFinding[] = procedures.map(p => {
      let status: FindingStatus = 'conforme';
      let detail = 'Ativo e vigente.';
      if (p.status === 'Arquivado') {
        status = 'atencao';
        detail = 'Arquivado — verificar necessidade de reativação.';
      } else if (p.status === 'Em Revisão') {
        status = 'atencao';
        detail = 'Em revisão — aguardando aprovação.';
      }
      if (p.docRevisionStatus === 'Vencido') {
        status = 'nao-conforme';
        detail = 'Prazo de revisão documental vencido.';
      } else if (p.docRevisionStatus === 'Para Revisão' && status === 'conforme') {
        status = 'atencao';
        detail = 'Próximo da data de revisão documental.';
      }
      return {
        id: `proc-${p.id}`,
        module: 'Procedimentos',
        moduleIcon: <FileText className="w-3.5 h-3.5" />,
        item: `${p.code} — ${p.name}`,
        detail,
        status,
        reference: p.revision,
      };
    });

    // 5. NC / CAPA
    const ncFindings: AuditFinding[] = nonConformities.map(nc => {
      let status: FindingStatus = 'conforme';
      let detail = 'Encerrada.';
      if (nc.status === 'Aberta') {
        const detected = parseDate(nc.detectedDate);
        const days = detected ? Math.abs(daysFromNow(detected)) : 0;
        status = days > 30 ? 'nao-conforme' : 'atencao';
        detail = `Aberta há ${days} dia(s) sem tratamento.`;
      } else if (nc.status === 'Em tratamento' || nc.status === 'Aguardando verificação') {
        const dead = parseDate(nc.deadline);
        const days = dead ? daysFromNow(dead) : null;
        if (days !== null && days < 0) {
          status = 'nao-conforme';
          detail = `Prazo de fechamento vencido há ${Math.abs(days)} dia(s).`;
        } else {
          status = 'atencao';
          detail = `Em andamento.${days !== null ? ` Prazo: ${days} dia(s).` : ''}`;
        }
      }
      return {
        id: `nc-${nc.id}`,
        module: 'NC / CAPA',
        moduleIcon: <AlertOctagon className="w-3.5 h-3.5" />,
        item: `${nc.code} — ${nc.title}`,
        detail,
        status,
        reference: nc.severity,
      };
    });

    return [
      { id: 'docs',      label: 'Controle Documental',  icon: <Shield      className="w-4 h-4" />, findings: docFindings   },
      { id: 'obls',      label: 'Obrigações Legais',    icon: <Scale       className="w-4 h-4" />, findings: oblFindings   },
      { id: 'trainings', label: 'Treinamentos',         icon: <GraduationCap className="w-4 h-4" />, findings: trainFindings },
      { id: 'procs',     label: 'Procedimentos',        icon: <FileText    className="w-4 h-4" />, findings: procFindings  },
      { id: 'ncs',       label: 'NC / CAPA',            icon: <AlertOctagon className="w-4 h-4" />, findings: ncFindings    },
    ];
  }, [generated, procedures, records, documents, obligations, nonConformities]);

  // ── Overall score ───────────────────────────────────────────────────────────
  const allFindings = sections.flatMap(s => s.findings);
  const overallScore = sectionScore(allFindings);
  const totalNC  = allFindings.filter(f => f.status === 'nao-conforme').length;
  const totalAtt = allFindings.filter(f => f.status === 'atencao').length;
  const totalOK  = allFindings.filter(f => f.status === 'conforme').length;

  function toggleSection(id: string) {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleGenerate() {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 900)); // simulate scan
    setGenerated(true);
    setGenerating(false);
    setGeneratedAt(new Date().toLocaleString('pt-BR'));
    // expand all by default
    setExpandedSections({ docs: true, obls: true, trainings: true, procs: true, ncs: true });
  }

  function handlePrint() {
    window.print();
  }

  // ── Render: pre-generation ─────────────────────────────────────────────────
  if (!generated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 min-h-[60vh]">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
          <ClipboardCheck className="w-8 h-8 text-blue-600" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Auditoria Interna Automática</h2>
          <p className="text-sm text-slate-500">
            Varre todos os módulos do sistema — documentos, obrigações, treinamentos,
            procedimentos e NCs — e gera um relatório completo de conformidade.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 w-full max-w-sm">
          {[
            ['📄', `${documents.length} documentos`],
            ['⚖️', `${obligations.length} obrigações`],
            ['🎓', `${records.length} registros de treinamento`],
            ['📋', `${procedures.length} procedimentos`],
            ['🚨', `${nonConformities.length} NCs`],
          ].map(([icon, label]) => (
            <div key={label as string} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow transition"
        >
          {generating
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analisando…</>
            : <><ClipboardCheck className="w-4 h-4" /> Gerar Auditoria</>}
        </button>
      </div>
    );
  }

  // ── Render: results ─────────────────────────────────────────────────────────
  const scoreColor =
    overallScore >= 80 ? 'text-emerald-600' :
    overallScore >= 60 ? 'text-amber-600'   : 'text-red-600';
  const scoreBg =
    overallScore >= 80 ? 'bg-emerald-50 border-emerald-200' :
    overallScore >= 60 ? 'bg-amber-50 border-amber-200'     : 'bg-red-50 border-red-200';

  return (
    <div className="flex-1 flex flex-col gap-0 min-h-0">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Auditoria Interna</h2>
            <p className="text-[11px] text-slate-400">Gerada em {generatedAt}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
          <button
            onClick={() => { setGenerated(false); setExpandedSections({}); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Nova Auditoria
          </button>
        </div>
      </div>

      {/* ── Score cards ── */}
      <div className="px-6 py-4 bg-white border-b border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`rounded-xl border px-4 py-3 ${scoreBg}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Score Geral</p>
            <p className={`text-2xl font-extrabold ${scoreColor}`}>{overallScore}<span className="text-base font-bold">%</span></p>
          </div>
          <div className="rounded-xl border bg-red-50 border-red-200 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Não Conformes</p>
            <p className="text-2xl font-extrabold text-red-600">{totalNC}</p>
          </div>
          <div className="rounded-xl border bg-amber-50 border-amber-200 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Atenção</p>
            <p className="text-2xl font-extrabold text-amber-600">{totalAtt}</p>
          </div>
          <div className="rounded-xl border bg-emerald-50 border-emerald-200 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Conformes</p>
            <p className="text-2xl font-extrabold text-emerald-600">{totalOK}</p>
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {sections.map(section => {
          const score = sectionScore(section.findings);
          const nc  = section.findings.filter(f => f.status === 'nao-conforme').length;
          const att = section.findings.filter(f => f.status === 'atencao').length;
          const open = expandedSections[section.id] ?? true;

          return (
            <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Section header */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition"
              >
                <span className="text-slate-500">{section.icon}</span>
                <span className="font-semibold text-sm text-slate-800 flex-1 text-left">{section.label}</span>
                {/* pills */}
                {nc > 0 && (
                  <span className="flex items-center gap-1 bg-red-50 text-red-600 text-[11px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                    <XCircle className="w-3 h-3" /> {nc}
                  </span>
                )}
                {att > 0 && (
                  <span className="flex items-center gap-1 bg-amber-50 text-amber-600 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                    <AlertTriangle className="w-3 h-3" /> {att}
                  </span>
                )}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  score >= 80 ? 'bg-emerald-50 text-emerald-600' :
                  score >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                }`}>{score}%</span>
                {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Findings list */}
              {open && section.findings.length > 0 && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {section.findings.map(f => (
                    <div key={f.id} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="mt-1 flex-shrink-0">{statusDot(f.status)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{f.item}</p>
                        <p className={`text-[11px] mt-0.5 ${
                          f.status === 'conforme'     ? 'text-emerald-600' :
                          f.status === 'atencao'      ? 'text-amber-600'   : 'text-red-600'
                        }`}>{f.detail}</p>
                      </div>
                      {f.reference && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{f.reference}</span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                        f.status === 'conforme'    ? 'bg-emerald-50 text-emerald-700' :
                        f.status === 'atencao'     ? 'bg-amber-50 text-amber-700'    : 'bg-red-50 text-red-700'
                      }`}>
                        {f.status === 'conforme' ? 'Conforme' : f.status === 'atencao' ? 'Atenção' : 'NC'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {open && section.findings.length === 0 && (
                <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 italic">Nenhum item cadastrado neste módulo.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
