'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, Users, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchEmployees, upsertEmployee, deleteEmployee, autoGenerateMatrixForEmployee, isSupabaseConfigured } from '@/lib/supabase';

const SETORES = ['Operacional','Brascabo','Operacional RDO','Transbordo MC','CS','QSMS','Suprimentos'];
const STATUS_OPTIONS = ['Ativo', 'Embarcado', 'Desembarcado', 'Afastado'];

interface Employee {
  id: string; name: string; role: string; sector: string;
  email: string; cpf_masked: string; phone: string;
  admission_date: string; status: string;
}

const EMPTY_EMPLOYEE: Employee = {
  id: '', name: '', role: '', sector: 'Operacional',
  email: '', cpf_masked: '', phone: '', admission_date: '', status: 'Ativo'
};

interface EmployeeModalProps {
  employee?: Employee | null;
  onSave: (e: Employee) => Promise<void>;
  onClose: () => void;
}

function EmployeeModal({ employee, onSave, onClose }: EmployeeModalProps) {
  const [f, setF] = useState<Employee>(employee ? { ...employee } : { ...EMPTY_EMPLOYEE });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const s = (k: keyof Employee, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.name.trim() || !f.sector || !f.email.trim()) {
      setError('Nome, setor e e-mail são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(f);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar colaborador.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <span className="font-semibold text-slate-800">{employee ? 'Editar colaborador' : 'Novo colaborador'}</span>
          <button onClick={onClose} disabled={saving}><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          {/* Nome */}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Nome completo *</label>
            <input value={f.name} onChange={e => s('name', e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          {/* Função */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Função / Cargo</label>
            <input value={f.role} onChange={e => s('role', e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          {/* Setor */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Setor *</label>
            <select value={f.sector} onChange={e => s('sector', e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              {SETORES.map(st => <option key={st}>{st}</option>)}
            </select>
          </div>
          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">E-mail *</label>
            <input value={f.email} onChange={e => s('email', e.target.value)} type="email"
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          {/* Telefone */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Telefone</label>
            <input value={f.phone} onChange={e => s('phone', e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          {/* CPF mascarado */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">CPF (xxx.xxx.xxx-xx)</label>
            <input value={f.cpf_masked} onChange={e => s('cpf_masked', e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          {/* Admissão */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Data de admissão</label>
            <input value={f.admission_date} onChange={e => s('admission_date', e.target.value)} type="date"
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select value={f.status} onChange={e => s('status', e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              {STATUS_OPTIONS.map(st => <option key={st}>{st}</option>)}
            </select>
          </div>
        </div>

        {!employee && (
          <div className="px-5 pb-2">
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
              Ao salvar, a matriz de treinamentos obrigatórios do setor <strong>{f.sector}</strong> será gerada automaticamente.
            </div>
          </div>
        )}

        {error && (
          <div className="mx-5 mb-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0"/>{error}
          </div>
        )}

        <div className="flex justify-end gap-2 px-5 pb-4 pt-3">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
            {saving ? 'Salvando...' : 'Salvar colaborador'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [matrixToast, setMatrixToast] = useState<{ id: string; count: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    const data = await fetchEmployees();
    if (data) setEmployees(data as Employee[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]); // eslint-disable-line react-hooks/set-state-in-effect

  const filtered = employees.filter(e =>
    (e.name.toLowerCase().includes(search.toLowerCase()) ||
     (e.role || '').toLowerCase().includes(search.toLowerCase())) &&
    (sectorFilter === '' || e.sector === sectorFilter)
  );

  const handleSave = async (emp: Employee) => {
    const isNew = !emp.id;
    const saved = await upsertEmployee({
      id: emp.id || undefined,
      name: emp.name,
      role: emp.role,
      sector: emp.sector,
      email: emp.email,
      phone: emp.phone,
      cpf_masked: emp.cpf_masked,
      admission_date: emp.admission_date || undefined,
      status: emp.status,
    });

    if (!saved) throw new Error('Falha ao salvar no banco de dados. Verifique a conexão com o Supabase.');

    // Reload from DB for consistency
    await loadEmployees();
    setSavedId(saved.id);
    setTimeout(() => setSavedId(null), 3000);

    // Auto-gerar matriz para novos colaboradores
    if (isNew && saved.id) {
      const { count } = await autoGenerateMatrixForEmployee(saved.id, emp.sector);
      if (count > 0) {
        setMatrixToast({ id: saved.id, count });
        setTimeout(() => setMatrixToast(null), 5000);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteEmployee(id);
    if (ok) {
      setEmployees(prev => prev.filter(e => e.id !== id));
    }
    setDeleteConfirm(null);
  };

  const counts = SETORES.map(s => ({ s, n: employees.filter(e => e.sector === s).length }));
  const activeCounts = counts.filter(c => c.n > 0);

  return (
    <div className="p-6">
      {/* KPIs por setor */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Total colaboradores</div>
          <div className="text-2xl font-semibold text-blue-600">{employees.length}</div>
        </div>
        {activeCounts.slice(0, 3).map(c => (
          <div key={c.s} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1 truncate">{c.s}</div>
            <div className="text-2xl font-semibold text-slate-700">{c.n}</div>
          </div>
        ))}
      </div>

      {/* Toast: matriz gerada */}
      {matrixToast && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600"/>
          <span><strong>{matrixToast.count} treinamento{matrixToast.count > 1 ? 's' : ''}</strong> pendente{matrixToast.count > 1 ? 's' : ''} gerado{matrixToast.count > 1 ? 's' : ''} automaticamente para o colaborador.</span>
        </div>
      )}

      {/* Filtros + ação */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar colaborador ou função..."
              className="pl-8 pr-3 h-9 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 w-56"/>
          </div>
          <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}
            className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">Todos os setores</option>
            {SETORES.map(s => <option key={s}>{s}</option>)}
          </select>
          {!isSupabaseConfigured && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              Supabase não configurado — dados não persistem
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSupabaseConfigured && (
            <button onClick={loadEmployees} disabled={loading}
              className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
            </button>
          )}
          <button onClick={() => { setEditing(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4"/>Novo colaborador
          </button>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center py-16 gap-2">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin"/>
          <span className="text-slate-500 text-sm">Carregando colaboradores...</span>
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center py-16 gap-3">
          <Users className="w-10 h-10 text-slate-300"/>
          <p className="text-slate-500 text-sm font-medium">Nenhum colaborador cadastrado</p>
          <p className="text-slate-400 text-xs">Clique em &quot;Novo colaborador&quot; para começar</p>
          <button onClick={() => { setEditing(null); setShowModal(true); }}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4"/>Cadastrar primeiro colaborador
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Colaborador</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Função</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Setor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Contato</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Admissão</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Ação</th>
            </tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${savedId === e.id ? 'bg-emerald-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
                        {e.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{e.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{e.cpf_masked || '—'}</div>
                      </div>
                      {savedId === e.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1"/>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{e.role || '—'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">{e.sector}</span></td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-600">{e.email}</div>
                    {e.phone && <div className="text-xs text-slate-400">{e.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{e.admission_date || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${
                      e.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      e.status === 'Embarcado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      e.status === 'Desembarcado' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>{e.status || 'Ativo'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {deleteConfirm === e.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-red-600 mr-1">Confirmar?</span>
                        <button onClick={() => handleDelete(e.id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700">Sim</button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50">Não</button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(e); setShowModal(true); }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-slate-500 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5"/>
                        </button>
                        <button onClick={() => setDeleteConfirm(e.id)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-300 text-slate-500 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-sm">Nenhum resultado para o filtro atual.</div>
          )}
        </div>
      )}

      {showModal && (
        <EmployeeModal
          employee={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
