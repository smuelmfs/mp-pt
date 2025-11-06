"use client";

import { useEffect, useMemo, useState } from "react";

type Supplier = { id: number; name: string; active: boolean };

export default function SuppliersPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all"|"active"|"inactive">("all");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQ) params.append("q", debouncedQ);
    if (activeFilter === "active") params.append("activeOnly", "1");
    const res = await fetch(`/api/admin/suppliers?${params.toString()}`);
    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
    setLoading(false);
  }

  useEffect(()=>{
    const t = setTimeout(()=> setDebouncedQ(q.trim()), 300);
    return ()=> clearTimeout(t);
  }, [q]);

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [debouncedQ, activeFilter]);

  async function createSupplier() {
    if (!formName.trim()) return alert("Informe o nome do fornecedor.");
    setSaving(true);
    const res = await fetch("/api/admin/suppliers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: formName.trim() })
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(()=>({}));
      return alert("Erro ao criar: " + (j.error || "verifique os campos"));
    }
    setOpenCreate(false);
    setFormName("");
    load();
  }

  async function updateSupplier(id: number, patch: Partial<Supplier>) {
    await fetch(`/api/admin/suppliers/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  async function deleteSupplier(id: number) {
    if (!confirm("Desativar fornecedor?")) return;
    await fetch(`/api/admin/suppliers/${id}`, { method: "DELETE" });
    load();
  }

  const filtered = useMemo(()=>{
    let list = rows.slice();
    if (activeFilter !== "all") list = list.filter(r=> activeFilter === "active" ? r.active : !r.active);
    return list;
  }, [rows, activeFilter]);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
            <p className="text-sm text-gray-600 mt-1">Cadastre, edite e desative fornecedores</p>
          </div>
          <button
            onClick={()=> setOpenCreate(true)}
            className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Novo Fornecedor
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </span>
              <input
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                placeholder="Buscar fornecedores..."
                value={q}
                onChange={(e)=> setQ(e.target.value)}
              />
            </div>
            <select className="px-3 py-2 border rounded" value={activeFilter} onChange={e=>setActiveFilter(e.target.value as any)}>
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          <div className="mt-4 divide-y divide-gray-200">
            {loading ? (
              <div className="py-10 text-center text-gray-500">Carregando…</div>
            ) : filtered.length ? (
              filtered.map(s => (
                <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${s.active? 'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{s.active? 'Ativo':'Inativo'}</span>
                    <input
                      defaultValue={s.name}
                      onBlur={(e)=> { const v=e.target.value.trim(); if (v && v!==s.name) updateSupplier(s.id, { name: v }); }}
                      className="px-3 py-2 border rounded w-72"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=> updateSupplier(s.id, { active: !s.active })} className="px-3 py-2 border rounded">
                      {s.active? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={()=> deleteSupplier(s.id)} className="px-3 py-2 border rounded text-red-600 hover:bg-red-50">Excluir</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-gray-500">Nenhum fornecedor encontrado</div>
            )}
          </div>
        </div>

        {openCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Novo Fornecedor</h2>
                  <p className="text-sm text-gray-600 mt-1">Cadastre um fornecedor pelo nome</p>
                </div>
                <button onClick={()=> setOpenCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Ex: INAPA"
                    value={formName}
                    onChange={(e)=> setFormName(e.target.value)}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button onClick={()=> setOpenCreate(false)} className="px-4 py-2 rounded border">Cancelar</button>
                <button onClick={createSupplier} disabled={saving} className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50">{saving? 'Salvando…':'Salvar'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


