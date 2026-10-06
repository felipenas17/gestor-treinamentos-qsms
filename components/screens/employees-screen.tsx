'use client';
import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, Users, CheckCircle2 } from 'lucide-react';

const SETORES = ['Operacional','Brascabo','Operacional RDO','Transbordo MC','CS','QSMS','Suprimentos'];

interface Employee {
  id: string; name: string; role: string; sector: string;
  email: string; cpf: string; phone: string; admissionDate: string; status: string;
}

interface EmployeeModalProps {
  employee?: Employee | null;
  onSave: (e: Employee) => void;
  onClose: () => void;
}

function EmployeeModal({ employee, onSave, onClose }: EmployeeModalProps) {
  const [f, setF] = useState<Employee>(employee || {
    id: '', name: '', role: '', sector: 'Operacional',
    email: '', cpf: '', phone: '', admissionDate: '', status: 'Ativo'
  });
  const s = (k: keyof Employee, v: string) => setF(p => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.name || !f.sector || !f.email) return;
    onSave({ ...f, id: f.id || `emp-${Date.now()}` });
    onClose();
  };
  const fields: [string, keyof Employee, string][] = [
    ['Nome completo', 'name', 'col-span-2'],
    ['Função / Cargo', 'role', ''],
    ['Setor', 'sector', ''],
    ['E-mail', 'email', ''],
    ['CPF (xxx.xxx.xxx-xx)', 'cpf', ''],
    ['Telefone', 'phone', ''],
    ['Data de admissão', 'admissionDate', ''],
  ];
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <span className="font-semibold text-slate-800">{employee ? 'Editar colaborador' : 'Novo colaborador'}</span>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          {fields.map(([label, key, cls]) => (
            <div key={key} className={`flex flex-col gap-1 ${cls}`}>
              <label className="text-xs font-medium text-slate-600">{label}</label>
              {key === 'sector' ? (
                <select value={f[key]} onChange={e => s(key, e.target.value)}
                  className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  {SETORES.map(st => <option key={st}>{st}</option>)}
                </select>
              ) : (
                <input value={f[key]} onChange={e => s(key, e.target.value)}
                  className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 pb-2">
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
            Ao salvar, a matriz de treinamentos obrigatórios do setor <strong>{f.sector}</strong> será gerada automaticamente.
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4 pt-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={save} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Salvar colaborador</button>
        </div>
      </div>
    </div>
  );
}

export function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const filtered = employees.filter(e =>
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase())) &&
    (sectorFilter === '' || e.sector === sectorFilter)
  );

  const handleSave = (emp: Employee) => {
    setEmployees(prev => prev.some(e => e.id === emp.id)
      ? prev.map(e => e.id === emp.id ? emp : e)
      : [emp, ...prev]
    );
    setSavedId(emp.id);
    setTimeout(() => setSavedId(null), 3000);
  };

  const handleDelete = (id: string) => setEmployees(prev => prev.filter(e => e.id !== id));

  const counts = SETORES.map(s => ({ s, n: employees.filter(e => e.sector === s).length }));

  return (
    <div className="p-6">
      {/* KPIs por setor */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-1">
          <div className="text-xs text-slate-500 mb-1">Total colaboradores</div>
          <div className="text-2xl font-semibold text-blue-600">{employees.length}</div>
        </div>
        {counts.filter(c => c.n > 0).slice(0, 3).map(c => (
          <div key={c.s} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1 truncate">{c.s}</div>
            <div className="text-2xl font-semibold text-slate-700">{c.n}</div>
          </div>
        ))}
      </div>

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
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4"/>Novo colaborador
        </button>
      </div>

      {/* Tabela */}
      {employees.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center py-16 gap-3">
          <Users className="w-10 h-10 text-slate-300"/>
          <p className="text-slate-500 text-sm font-medium">Nenhum colaborador cadastrado</p>
          <p className="text-slate-400 text-xs">Clique em "Novo colaborador" para começar</p>
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
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">E-mail</th>
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
                        {e.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{e.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{e.cpf || '—'}</div>
                      </div>
                      {savedId === e.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1"/>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{e.role || '—'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">{e.sector}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{e.email}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{e.admissionDate || '—'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs">{e.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(e); setShowModal(true); }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-slate-500 hover:text-blue-600">
                        <Edit2 className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={() => handleDelete(e.id)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-300 text-slate-500 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
