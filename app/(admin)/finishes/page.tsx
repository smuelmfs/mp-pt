"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SimplePagination } from "@/components/ui/simple-pagination";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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
    if (!form.baseCost || form.baseCost.trim() === "") {
      toast.error("Custo base é obrigatório");
      return;
    }

    // Normaliza o baseCost para garantir formato correto
    const baseCostValue = String(form.baseCost).trim();
    if (!/^\d+(\.\d{1,4})?$/.test(baseCostValue)) {
      toast.error("Custo base deve ser um número positivo com até 4 casas decimais (ex: 0.1500)");
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
          baseCost: baseCostValue,
          calcType: form.calcType,
          minFee: form.minFee?.trim() || null,
          marginDefault: form.marginDefault?.trim() || null,
          active: form.active,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const errorMsg = j.error || j.details?.fieldErrors || "verifique os campos";
        toast.error("Erro ao criar: " + (typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)));
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
    } catch (error: any) {
      toast.error("Erro ao criar: " + (error.message || "Erro desconhecido"));
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
    if (categoryFilter) list = list.filter(r => r.category === categoryFilter);
    if (unitFilter) list = list.filter(r => r.unit === unitFilter);
    if (activeFilter !== "all") list = list.filter(r => activeFilter === "active" ? r.active : !r.active);
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
  }, [rows, categoryFilter, unitFilter, activeFilter, sortKey, sortDir]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredSorted.slice(start, end);
  }, [filteredSorted, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, unitFilter, activeFilter, debouncedQ, sortKey, sortDir]);

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
      <main className="min-h-screen bg-[#F6EEE8] p-6">
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
    <main className="min-h-screen bg-[#F6EEE8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#341601]">Acabamentos</h1>
              <p className="text-gray-600 mt-2">Configure os acabamentos disponíveis para os produtos</p>
            </div>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center px-6 py-3 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors shadow-sm"
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Search & Filters */}
          <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar acabamentos..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
              {q && (
                <button onClick={() => setQ("")} className="px-4 py-2 text-gray-600 hover:text-[#F66807] transition-colors rounded-lg">Limpar</button>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <div className="flex gap-2">
              <select
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
              >
                <option value="name">Ordenar por Nome</option>
                <option value="category">Ordenar por Categoria</option>
                <option value="baseCost">Ordenar por Custo</option>
              </select>
              <button
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>

        {/* Finishes Grid */}
        {filteredSorted.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {paginatedItems.map((finish) => (
              <div key={finish.id} className="rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#341601] mb-2">{highlight(finish.name, debouncedQ)}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {categoryLabels[finish.category]}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        €{Number(finish.baseCost).toFixed(4)} / {unitLabels[finish.unit]}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      href={`/finishes/${finish.id}`}
                      className="p-2 text-gray-400 hover:text-[#F66807] transition-colors"
                      title="Editar acabamento"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      finish.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {finish.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            </div>
            <div className="rounded-lg">
              <SimplePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredSorted.length}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
              />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-[#341601] mb-2">
              {q ? 'Nenhum acabamento encontrado' : 'Nenhum acabamento configurado'}
            </h3>
            <p className="text-gray-600 mb-6">
              {q ? 'Tente ajustar os filtros de busca' : 'Comece criando seu primeiro acabamento para usar nos produtos'}
            </p>
            {!q && (
              <button
                onClick={() => setOpenCreate(true)}
                className="inline-flex items-center px-6 py-3 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors"
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
      </div>

      {/* Create Modal */}
      {openCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#341601]">Novo Acabamento</h2>
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
                <label className="block text-sm font-medium text-[#341601] mb-2">
                  Nome do Acabamento
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Ex: Laminação Fosca, Verniz UV"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Categoria
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Unidade
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Custo Base (€)
                  </label>
                  <input
                    type="text"
                    pattern="^\d+(\.\d{1,4})?$"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.baseCost}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Permite apenas números e ponto decimal
                      if (val === "" || /^\d*\.?\d{0,4}$/.test(val)) {
                        setForm({...form, baseCost: val});
                      }
                    }}
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Tipo de Cálculo
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Taxa Mínima (€) - Opcional
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.minFee}
                    onChange={(e) => setForm({...form, minFee: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Margem Padrão (%) - Opcional
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                  className="h-4 w-4 text-[#F66807] focus:ring-[#F66807] border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm font-medium text-[#341601]">
                  Acabamento ativo
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end gap-3">
                <button 
                  className="px-6 py-3 border border-gray-300 text-[#341601] rounded-lg hover:bg-white transition-colors"
                  onClick={() => setOpenCreate(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="px-6 py-3 bg-[#F66807] text-white rounded-lg hover:bg-[#F66807]/90 transition-colors"
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
