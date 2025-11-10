"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";

type Finish = {
  id: number;
  name: string;
  category: "LAMINACAO" | "VERNIZ" | "CORTE" | "DOBRA" | "OUTROS";
  unit: "UNIT" | "M2" | "LOT" | "HOUR" | "SHEET";
  baseCost: string;
  marginDefault?: string | null;
  calcType: "PER_UNIT" | "PER_M2" | "PER_LOT" | "PER_HOUR";
  minFee?: string | null;
  areaStepM2?: string | null;
  active: boolean;
};

export default function FinishesListPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rows, setRows] = useState<Finish[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [unitFilter, setUnitFilter] = useState<Finish["unit"] | "">("");
  const [activeFilter, setActiveFilter] = useState<"all"|"active"|"inactive">("all");
  const [sortKey, setSortKey] = useState<"name"|"category"|"baseCost">("name");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  const [form, setForm] = useState({
    name: "",
    category: "OUTROS" as Finish["category"],
    unit: "UNIT" as Finish["unit"],
    baseCost: "0.0000",
    calcType: "PER_UNIT" as Finish["calcType"],
    minFee: "",
    marginDefault: "",
    active: true,
  });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQ) params.append("q", debouncedQ);
    if (categoryFilter) params.append("category", categoryFilter);
    if (unitFilter) params.append("unit", unitFilter);
    if (activeFilter !== "all") params.append("active", activeFilter === "active" ? "true" : "false");
    const res = await fetch(`/api/admin/finishes?${params.toString()}`);
    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [debouncedQ, categoryFilter, unitFilter, activeFilter]);

  async function createFinish() {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!form.baseCost) {
      toast.error("Custo base é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/finishes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          unit: form.unit,
          baseCost: form.baseCost,
          calcType: form.calcType,
          minFee: form.minFee || null,
          marginDefault: form.marginDefault || null,
          active: form.active,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error("Erro ao criar: " + (j.error?.message || "verifique os campos"));
        return;
      }
      toast.success("Acabamento criado com sucesso!");
      setOpenCreate(false);
      setForm({
        name: "",
        category: "OUTROS",
        unit: "UNIT",
        baseCost: "0.0000",
        calcType: "PER_UNIT",
        minFee: "",
        marginDefault: "",
        active: true,
      });
      load();
    } finally {
      setSaving(false);
    }
  }

  const categoryLabels = {
    LAMINACAO: "Laminação",
    VERNIZ: "Verniz",
    CORTE: "Corte",
    DOBRA: "Dobra",
    OUTROS: "Outros"
  };

  const categoryColors = {
    LAMINACAO: "bg-gray-100 text-gray-800",
    VERNIZ: "bg-gray-100 text-gray-800",
    CORTE: "bg-gray-100 text-gray-800",
    DOBRA: "bg-gray-100 text-gray-800",
    OUTROS: "bg-gray-100 text-gray-800"
  };

  const unitLabels = {
    UNIT: "Unidade",
    M2: "Metro Quadrado",
    LOT: "Lote",
    HOUR: "Hora",
    SHEET: "Folha"
  };

  const calcTypeLabels = {
    PER_UNIT: "Por Unidade",
    PER_M2: "Por M²",
    PER_LOT: "Por Lote",
    PER_HOUR: "Por Hora"
  };

  const filteredSorted = useMemo(() => {
    let list = rows.slice();
    // Ordenação
    list.sort((a, b) => {
      let va: any; let vb: any;
      if (sortKey === "name") {
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
      } else if (sortKey === "category") {
        va = a.category;
        vb = b.category;
      } else {
        va = parseFloat(String(a.baseCost));
        vb = parseFloat(String(b.baseCost));
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [rows, sortKey, sortDir]);

  function highlight(text: string, term: string) {
    if (!text || !term) return text;
    const i = text.toLowerCase().indexOf(term.toLowerCase());
    if (i === -1) return text;
    const before = text.slice(0, i);
    const match = text.slice(i, i + term.length);
    const after = text.slice(i + term.length);
    return (<>{before}<mark className="bg-yellow-100 rounded px-0.5">{match}</mark>{after}</>);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-36 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Acabamentos</h1>
              <p className="text-gray-600 mt-2">Configure os acabamentos disponíveis para os produtos</p>
            </div>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Novo Acabamento
          </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search & Filters */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar acabamentos..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
              {q && (
                <button onClick={() => setQ("")} className="px-3 py-2 text-slate-600 hover:text-slate-900">Limpar</button>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              className="px-3 py-2 border rounded"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas categorias</option>
              <option value="LAMINACAO">Laminação</option>
              <option value="VERNIZ">Verniz</option>
              <option value="CORTE">Corte</option>
              <option value="DOBRA">Dobra</option>
              <option value="OUTROS">Outros</option>
            </select>
            <select
              className="px-3 py-2 border rounded"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value as any)}
            >
              <option value="">Todas unidades</option>
              <option value="UNIT">Unidade</option>
              <option value="M2">Metro Quadrado</option>
              <option value="LOT">Lote</option>
              <option value="HOUR">Hora</option>
              <option value="SHEET">Folha</option>
            </select>
            <select
              className="px-3 py-2 border rounded"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <div className="flex gap-2">
              <select
                className="flex-1 px-3 py-2 border rounded"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
              >
                <option value="name">Ordenar por Nome</option>
                <option value="category">Ordenar por Categoria</option>
                <option value="baseCost">Ordenar por Custo</option>
              </select>
              <button
                className="px-3 py-2 border rounded"
                onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>

        {/* Finishes Grid */}
        {filteredSorted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSorted.map((finish) => (
              <div key={finish.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categoryColors[finish.category]}`}>
                        {categoryLabels[finish.category]}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        finish.active ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {finish.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{highlight(finish.name, debouncedQ)}</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Custo Base</span>
                      <p className="font-semibold text-gray-900">€{Number(finish.baseCost).toFixed(4)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Unidade</span>
                      <p className="font-semibold text-gray-900">{unitLabels[finish.unit]}</p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs text-gray-500">Tipo de Cálculo</span>
                    <p className="font-semibold text-gray-900">{calcTypeLabels[finish.calcType]}</p>
                  </div>

                  {finish.minFee && (
                    <div>
                      <span className="text-xs text-gray-500">Taxa Mínima</span>
                      <p className="font-semibold text-gray-900">€{finish.minFee}</p>
                    </div>
                  )}

                  {finish.marginDefault && (
                    <div>
                      <span className="text-xs text-gray-500">Margem Padrão</span>
                      <p className="font-semibold text-gray-900">{(Number(finish.marginDefault) * 100).toFixed(1)}%</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link 
                    href={`/finishes/${finish.id}`}
                    className="inline-flex items-center text-sm font-medium text-black hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver Detalhes
                    </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {q ? 'Nenhum acabamento encontrado' : 'Nenhum acabamento configurado'}
            </h3>
            <p className="text-gray-600 mb-6">
              {q ? 'Tente ajustar os filtros de busca' : 'Comece criando seu primeiro acabamento para usar nos produtos'}
            </p>
            {!q && (
              <button
                onClick={() => setOpenCreate(true)}
                className="inline-flex items-center px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Criar Primeiro Acabamento
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {openCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Novo Acabamento</h2>
                  <p className="text-sm text-gray-600 mt-1">Configure um novo acabamento</p>
                </div>
                <button 
                  onClick={() => setOpenCreate(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Acabamento
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Ex: Laminação Fosca, Verniz UV"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.category}
                    onChange={(e) => setForm({...form, category: e.target.value as Finish["category"]})}
                  >
                    <option value="LAMINACAO">Laminação</option>
                    <option value="VERNIZ">Verniz</option>
                    <option value="CORTE">Corte</option>
                    <option value="DOBRA">Dobra</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidade
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.unit}
                    onChange={(e) => setForm({...form, unit: e.target.value as Finish["unit"]})}
                  >
                    <option value="UNIT">Unidade</option>
                    <option value="M2">Metro Quadrado</option>
                    <option value="LOT">Lote</option>
                    <option value="HOUR">Hora</option>
                    <option value="SHEET">Folha</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custo Base (€)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.baseCost}
                    onChange={(e) => setForm({...form, baseCost: e.target.value})}
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Cálculo
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.calcType}
                    onChange={(e) => setForm({...form, calcType: e.target.value as Finish["calcType"]})}
                  >
                    <option value="PER_UNIT">Por Unidade</option>
                    <option value="PER_M2">Por M²</option>
                    <option value="PER_LOT">Por Lote</option>
                    <option value="PER_HOUR">Por Hora</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taxa Mínima (€) - Opcional
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.minFee}
                    onChange={(e) => setForm({...form, minFee: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Margem Padrão (%) - Opcional
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.marginDefault}
                    onChange={(e) => setForm({...form, marginDefault: e.target.value})}
                    placeholder="15.00"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm({...form, active: e.target.checked})}
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm font-medium text-gray-700">
                  Acabamento ativo
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end gap-3">
                <button 
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenCreate(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  onClick={createFinish}
                  disabled={saving}
                >
                  {saving ? 'Criando...' : 'Criar Acabamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
