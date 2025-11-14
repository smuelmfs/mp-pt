"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { markStepComplete } from "@/lib/admin-progress";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { PageLoading } from "@/components/ui/loading";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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
    try {
    const params = new URLSearchParams();
    if (debouncedQ) params.append("q", debouncedQ);
    if (technologyFilter) params.append("technology", technologyFilter);
    if (activeFilter !== "all") params.append("active", activeFilter === "active" ? "true" : "false");
    const res = await fetch(`/api/admin/printing?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Erro ao carregar impressões");
      }
      const text = await res.text();
      const json = text ? JSON.parse(text) : [];
    setRows(Array.isArray(json) ? json : []);
    } catch (error) {
      console.error("Erro ao carregar impressões:", error);
      setRows([]);
    } finally {
    setLoading(false);
    }
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
        const errorData = j;
        let errorMessage = "verifique os campos";
        
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error.formErrors && errorData.error.formErrors.length > 0) {
            errorMessage = errorData.error.formErrors[0];
          } else if (errorData.error.fieldErrors) {
            const firstField = Object.keys(errorData.error.fieldErrors)[0];
            const firstError = errorData.error.fieldErrors[firstField];
            if (Array.isArray(firstError) && firstError.length > 0) {
              errorMessage = `${firstField}: ${firstError[0]}`;
            }
          }
        }
        
        toast.error("Erro ao criar: " + errorMessage);
        return;
      }
      toast.success("Impressão criada com sucesso!");
      markStepComplete('printing');
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

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredSorted.slice(start, end);
  }, [filteredSorted, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [technologyFilter, activeFilter, debouncedQ, sortKey, sortDir]);

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
    return <PageLoading message="Carregando impressões..." />;
  }

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#341601]">Impressões</h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Configure as tecnologias e métodos de impressão disponíveis</p>
            </div>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors shadow-sm text-sm sm:text-base w-full sm:w-auto"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
              placeholder="Buscar impressões..."
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
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                <option value="formatLabel">Ordenar por Nome</option>
                <option value="technology">Ordenar por Tecnologia</option>
                <option value="unitPrice">Ordenar por Preço</option>
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

        {/* Printings Grid */}
        {filteredSorted.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {paginatedItems.map((printing) => (
              <div key={printing.id} className="rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#341601] mb-2">
                      {highlight(printing.formatLabel || 'Sem formato', debouncedQ)}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {technologyLabels[printing.technology]}
                      </div>
                      {printing.colors && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                          {printing.colors}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        €{Number(printing.unitPrice).toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      href={`/printing/${printing.id}`}
                      className="p-2 text-gray-400 hover:text-[#F66807] transition-colors"
                      title="Editar impressão"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      printing.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {printing.active ? 'Ativo' : 'Inativo'}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <h3 className="text-lg font-medium text-[#341601] mb-2">
              {q ? 'Nenhuma impressão encontrada' : 'Nenhuma impressão configurada'}
            </h3>
            <p className="text-gray-600 mb-6">
              {q ? 'Tente ajustar os filtros de busca' : 'Comece criando sua primeira configuração de impressão para usar nos produtos'}
            </p>
            {!q && (
              <button
                onClick={() => setOpenCreate(true)}
                className="inline-flex items-center px-6 py-3 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors"
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
      </div>

      {/* Create Modal */}
      {openCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#341601]">Nova Impressão</h2>
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
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Tecnologia
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Lados
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.sides}
                    onChange={(e) => setForm({...form, sides: Number(e.target.value || 1)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Formato/Descrição
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.formatLabel}
                    onChange={(e) => setForm({...form, formatLabel: e.target.value})}
                    placeholder="Ex: SRA3, Rolo 1,6m"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Cores
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.colors}
                    onChange={(e) => setForm({...form, colors: e.target.value})}
                    placeholder="Ex: 4x4, CMYK"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Preço Unitário (€)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.unitPrice}
                    onChange={(e) => setForm({...form, unitPrice: e.target.value})}
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Yield (un/tiro)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.yield}
                    onChange={(e) => setForm({...form, yield: Number(e.target.value || 1)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Setup (minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.setupMinutes}
                    onChange={(e) => setForm({...form, setupMinutes: Number(e.target.value || 0)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Taxa Mínima (€)
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
                  Impressão ativa
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
