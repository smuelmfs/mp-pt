"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";

type Printing = {
  id: number;
  technology: "OFFSET" | "DIGITAL" | "UV" | "GRANDE_FORMATO";
  formatLabel?: string | null;
  colors?: string | null;
  sides?: number | null;
  unitPrice: string;
  yield?: number | null;
  setupMinutes?: number | null;
  minFee?: string | null;
  active: boolean;
};

export default function PrintingListPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rows, setRows] = useState<Printing[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [technologyFilter, setTechnologyFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"all"|"active"|"inactive">("all");
  const [sortKey, setSortKey] = useState<"formatLabel"|"technology"|"unitPrice">("formatLabel");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  const [form, setForm] = useState({
    technology: "OFFSET" as Printing["technology"],
    formatLabel: "",
    colors: "",
    sides: 1,
    unitPrice: "0.0000",
    yield: 1,
    setupMinutes: 0,
    minFee: "0.00",
    active: true,
  });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQ) params.append("q", debouncedQ);
    if (technologyFilter) params.append("technology", technologyFilter);
    if (activeFilter !== "all") params.append("active", activeFilter === "active" ? "true" : "false");
    const res = await fetch(`/api/admin/printing?${params.toString()}`);
    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [debouncedQ, technologyFilter, activeFilter]);

  async function createPrinting() {
    if (!form.unitPrice) {
      toast.error("Informe o preço unidade.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/printing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          technology: form.technology,
          formatLabel: form.formatLabel.trim() || null,
          colors: form.colors.trim() || null,
          sides: Number.isFinite(form.sides as any) ? Number(form.sides) : null,
          unitPrice: form.unitPrice,
          yield: Number.isFinite(form.yield as any) ? Number(form.yield) : null,
          setupMinutes: Number.isFinite(form.setupMinutes as any) ? Number(form.setupMinutes) : null,
          minFee: form.minFee || null,
          active: form.active,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error("Erro ao criar: " + (j.error?.message || "verifique os campos"));
        return;
      }
      toast.success("Impressão criada com sucesso!");
      setOpenCreate(false);
      setForm({
        technology: "OFFSET", formatLabel: "", colors: "", sides: 1,
        unitPrice: "0.0000", yield: 1, setupMinutes: 0, minFee: "0.00", active: true
      });
      load();
    } finally {
      setSaving(false);
    }
  }

  const technologyLabels = {
    OFFSET: "Offset",
    DIGITAL: "Digital",
    UV: "UV",
    GRANDE_FORMATO: "Grande Formato"
  };

  const technologyColors = {
    OFFSET: "bg-gray-100 text-gray-800",
    DIGITAL: "bg-gray-100 text-gray-800",
    UV: "bg-gray-100 text-gray-800",
    GRANDE_FORMATO: "bg-gray-100 text-gray-800"
  };

  const filteredSorted = useMemo(() => {
    let list = rows.slice();
    // Ordenação
    list.sort((a, b) => {
      let va: any; let vb: any;
      if (sortKey === "formatLabel") {
        va = (a.formatLabel || "").toLowerCase();
        vb = (b.formatLabel || "").toLowerCase();
      } else if (sortKey === "technology") {
        va = a.technology;
        vb = b.technology;
      } else {
        va = parseFloat(String(a.unitPrice));
        vb = parseFloat(String(b.unitPrice));
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [rows, sortKey, sortDir]);

  function highlight(text: string | null | undefined, term: string) {
    if (!text || !term) return text || "";
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
                <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">Impressões</h1>
              <p className="text-gray-600 mt-2">Configure as tecnologias e métodos de impressão disponíveis</p>
            </div>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nova Impressão
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
              placeholder="Buscar impressões..."
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              className="px-3 py-2 border rounded"
              value={technologyFilter}
              onChange={(e) => setTechnologyFilter(e.target.value)}
            >
              <option value="">Todas tecnologias</option>
              <option value="OFFSET">Offset</option>
              <option value="DIGITAL">Digital</option>
              <option value="UV">UV</option>
              <option value="GRANDE_FORMATO">Grande Formato</option>
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
                <option value="formatLabel">Ordenar por Nome</option>
                <option value="technology">Ordenar por Tecnologia</option>
                <option value="unitPrice">Ordenar por Preço</option>
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

        {/* Printings Grid */}
        {filteredSorted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSorted.map((printing) => (
              <div key={printing.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${technologyColors[printing.technology]}`}>
                        {technologyLabels[printing.technology]}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        printing.active ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {printing.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {highlight(printing.formatLabel || 'Sem formato', debouncedQ)}
                    </h3>
                    {printing.colors && (
                      <p className="text-sm text-gray-600 mb-2">{printing.colors}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Preço Unitário</span>
                      <p className="font-semibold text-gray-900">€{Number(printing.unitPrice).toFixed(4)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Lados</span>
                      <p className="font-semibold text-gray-900">{printing.sides || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Yield</span>
                      <p className="font-semibold text-gray-900">{printing.yield || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Setup (min)</span>
                      <p className="font-semibold text-gray-900">{printing.setupMinutes || '-'}</p>
                    </div>
                  </div>

                  {printing.minFee && (
                    <div>
                      <span className="text-xs text-gray-500">Taxa Mínima</span>
                      <p className="font-semibold text-gray-900">€{printing.minFee}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link 
                    href={`/printing/${printing.id}`}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {q ? 'Nenhuma impressão encontrada' : 'Nenhuma impressão configurada'}
            </h3>
            <p className="text-gray-600 mb-6">
              {q ? 'Tente ajustar os filtros de busca' : 'Comece criando sua primeira configuração de impressão para usar nos produtos'}
            </p>
            {!q && (
              <button
                onClick={() => setOpenCreate(true)}
                className="inline-flex items-center px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Criar Primeira Impressão
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
                  <h2 className="text-xl font-semibold text-gray-900">Nova Impressão</h2>
                  <p className="text-sm text-gray-600 mt-1">Configure uma nova tecnologia de impressão</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tecnologia
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.technology}
                    onChange={(e) => setForm({...form, technology: e.target.value as Printing["technology"]})}
                  >
                    <option value="OFFSET">Offset</option>
                    <option value="DIGITAL">Digital</option>
                    <option value="UV">UV</option>
                    <option value="GRANDE_FORMATO">Grande Formato</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lados
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.sides}
                    onChange={(e) => setForm({...form, sides: Number(e.target.value || 1)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato/Descrição
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.formatLabel}
                    onChange={(e) => setForm({...form, formatLabel: e.target.value})}
                    placeholder="Ex: SRA3, Rolo 1,6m"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cores
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.colors}
                    onChange={(e) => setForm({...form, colors: e.target.value})}
                    placeholder="Ex: 4x4, CMYK"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Unitário (€)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.unitPrice}
                    onChange={(e) => setForm({...form, unitPrice: e.target.value})}
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yield (un/tiro)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.yield}
                    onChange={(e) => setForm({...form, yield: Number(e.target.value || 1)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Setup (minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.setupMinutes}
                    onChange={(e) => setForm({...form, setupMinutes: Number(e.target.value || 0)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taxa Mínima (€)
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
                  Impressão ativa
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
                  onClick={createPrinting}
                  disabled={saving}
                >
                  {saving ? 'Criando...' : 'Criar Impressão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
