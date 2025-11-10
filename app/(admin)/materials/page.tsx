"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SimplePagination } from "@/components/ui/simple-pagination";

type Material = {
  id: number;
  name: string;
  type: string;
  unit: "UNIT" | "M2" | "LOT" | "HOUR" | "SHEET";
  unitCost: string;
  supplierUnitCost?: string | null;
  active: boolean;
  supplier?: { id: number; name: string } | null;
};

export default function MaterialsPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rows, setRows] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [unitFilter, setUnitFilter] = useState<Material["unit"] | "">("");
  const [activeFilter, setActiveFilter] = useState<"all"|"active"|"inactive">("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<"name"|"unitCost"|"type">("name");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    type: "",
    unit: "UNIT" as Material["unit"],
    unitCost: "0.0000",
    supplierUnitCost: "",
    active: true,
    supplierId: "",
    supplierName: "",
    // Campos para cálculo automático
    supplierRollCost: "",
    supplierRollWidth: "",
    supplierRollLength: "",
    supplierRollQuantity: "",
  });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQ) params.append("q", debouncedQ);
    if (supplierFilter) params.append("supplierId", supplierFilter);
    const res = await fetch(`/api/admin/materials?${params.toString()}`);
    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
    setLoading(false);
  }

  useEffect(()=>{
    const t = setTimeout(()=> setDebouncedQ(q.trim()), 300);
    return ()=> clearTimeout(t);
  }, [q]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [debouncedQ, supplierFilter]);

  useEffect(() => {
    fetch("/api/admin/suppliers?activeOnly=1")
      .then(r => r.json())
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, []);

  async function createMaterial() {
    if (!form.name.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    if (!form.unitCost) {
      toast.error("Informe o custo unitário.");
      return;
    }
    setSaving(true);
    try {
      // resolve supplierId: usa selecionado; se vazio e houver supplierName, cria/reativa supplier e usa o id
      let supplierIdToUse: number | null = null;
      if (form.supplierId) {
        supplierIdToUse = Number(form.supplierId);
      } else if (form.supplierName && form.supplierName.trim()) {
        const supRes = await fetch("/api/admin/suppliers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: form.supplierName.trim() })
        });
        if (supRes.ok) {
          const sup = await supRes.json();
          supplierIdToUse = sup?.id || null;
        } else {
          const j = await supRes.json().catch(()=>({}));
          toast.error("Erro ao criar fornecedor: " + (j.error || "tente novamente"));
          setSaving(false);
          return;
        }
      }

      // Calcula supplierUnitCost automaticamente se fornecido custo do rolo
      let calculatedSupplierUnitCost: string | null = null;
      if (form.supplierRollCost && form.supplierRollCost.trim()) {
        const rollCost = Number(form.supplierRollCost.replace(',', '.'));
        if (form.unit === "M2" && form.supplierRollWidth && form.supplierRollLength) {
          const width = Number(form.supplierRollWidth.replace(',', '.'));
          const length = Number(form.supplierRollLength.replace(',', '.'));
          if (width > 0 && length > 0) {
            const areaM2 = width * length;
            calculatedSupplierUnitCost = (rollCost / areaM2).toFixed(4);
          }
        } else if (form.unit === "SHEET" && form.supplierRollQuantity) {
          const qty = Number(form.supplierRollQuantity);
          if (qty > 0) {
            calculatedSupplierUnitCost = (rollCost / qty).toFixed(4);
          }
        } else if (form.unit === "UNIT") {
          calculatedSupplierUnitCost = rollCost.toFixed(4);
        }
      }

      // Usa o calculado se houver, senão usa o informado diretamente
      const finalSupplierUnitCost = calculatedSupplierUnitCost || (form.supplierUnitCost ? form.supplierUnitCost : null);

      const res = await fetch("/api/admin/materials", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        type: form.type.trim() || "outro",
        unit: form.unit,
        unitCost: form.unitCost,
        supplierUnitCost: finalSupplierUnitCost,
        active: form.active,
          supplierId: supplierIdToUse,
      }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error("Erro ao criar: " + (j.error?.message || "verifique os campos"));
        setSaving(false);
        return;
      }
      toast.success("Material criado com sucesso!");
      // refresh list and suppliers cache so the new supplier appears
      await Promise.all([
        load(),
        fetch("/api/admin/suppliers?activeOnly=1").then(r=>r.json()).then(setSuppliers).catch(()=>{})
      ]);
      setOpenCreate(false);
      setForm({ name: "", type: "", unit: "UNIT", unitCost: "0.0000", supplierUnitCost: "", active: true, supplierId: "", supplierName: "", supplierRollCost: "", supplierRollWidth: "", supplierRollLength: "", supplierRollQuantity: "" });
    } finally {
      setSaving(false);
    }
  }

  const unitLabels = {
    UNIT: "Unidade",
    M2: "Metro Quadrado",
    LOT: "Lote",
    HOUR: "Hora",
    SHEET: "Folha"
  };

  const filteredSorted = useMemo(()=>{
    let list = rows.slice();
    if (typeFilter) list = list.filter(r=> (r.type||"").toLowerCase().includes(typeFilter.toLowerCase()));
    if (unitFilter) list = list.filter(r=> r.unit===unitFilter);
    if (activeFilter!=="all") list = list.filter(r=> activeFilter==="active" ? r.active : !r.active);
    list.sort((a,b)=>{
      let va:any; let vb:any;
      if (sortKey==="name") { va=a.name.toLowerCase(); vb=b.name.toLowerCase(); }
      else if (sortKey==="type") { va=(a.type||"").toLowerCase(); vb=(b.type||"").toLowerCase(); }
      else { va=parseFloat(String(a.unitCost)); vb=parseFloat(String(b.unitCost)); }
      const cmp = va<vb? -1 : va>vb? 1 : 0;
      return sortDir==="asc"? cmp : -cmp;
    });
    return list;
  }, [rows, typeFilter, unitFilter, activeFilter, sortKey, sortDir]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredSorted.slice(start, end);
  }, [filteredSorted, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, unitFilter, activeFilter, supplierFilter, debouncedQ, sortKey, sortDir]);

  function highlight(text: string, term: string) {
    if (!term) return text;
    const i = text.toLowerCase().indexOf(term.toLowerCase());
    if (i===-1) return text;
    const before = text.slice(0,i);
    const match = text.slice(i, i+term.length);
    const after = text.slice(i+term.length);
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
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
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
              <h1 className="text-3xl font-bold text-[#341601]">Materiais</h1>
              <p className="text-gray-600 mt-2">Gerencie os materiais disponíveis para produção</p>
            </div>
                    <button
                      onClick={() => setOpenCreate(true)}
                      className="inline-flex items-center px-6 py-3 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors shadow-sm"
                    >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Novo Material
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
              placeholder="Buscar materiais..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
              {q && (
                <button onClick={()=>setQ("")} className="px-4 py-2 text-gray-600 hover:text-[#F66807] transition-colors rounded-lg">Limpar</button>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]" placeholder="Filtrar por tipo (ex.: vinil, papel)" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} />
            <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]" value={unitFilter} onChange={e=>setUnitFilter(e.target.value as any)}>
              <option value="">Todas unidades</option>
              <option value="UNIT">Unidade</option>
              <option value="M2">Metro Quadrado</option>
              <option value="LOT">Lote</option>
              <option value="HOUR">Hora</option>
              <option value="SHEET">Folha</option>
            </select>
            <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]" value={supplierFilter} onChange={e=>setSupplierFilter(e.target.value)}>
              <option value="">Todos fornecedores</option>
              {suppliers.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
            <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]" value={activeFilter} onChange={e=>setActiveFilter(e.target.value as any)}>
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <div className="flex gap-2">
              <select className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]" value={sortKey} onChange={e=>setSortKey(e.target.value as any)}>
                <option value="name">Ordenar por Nome</option>
                <option value="type">Ordenar por Tipo</option>
                <option value="unitCost">Ordenar por Custo</option>
              </select>
              <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-white transition-colors" onClick={()=>setSortDir(d=> d==="asc"?"desc":"asc")}>{sortDir==="asc"?"↑":"↓"}</button>
            </div>
          </div>
        </div>

        {/* Materials Grid */}
        {filteredSorted.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {paginatedItems.map((material) => (
              <div key={material.id} className="rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#341601] mb-2">{highlight(material.name, debouncedQ)}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {highlight(material.type||"", typeFilter)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        €{Number(material.unitCost).toFixed(4)} / {unitLabels[material.unit]}
                      </div>
                      {material.supplier && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {material.supplier.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      href={`/materials/${material.id}`}
                      className="p-2 text-gray-400 hover:text-[#F66807] transition-colors"
                      title="Editar material"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      material.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {material.active ? 'Ativo' : 'Inativo'}
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
              {q ? 'Nenhum material encontrado' : 'Nenhum material criado'}
            </h3>
            <p className="text-gray-600 mb-6">
              {q 
                ? 'Tente ajustar os termos de busca' 
                : 'Comece criando seu primeiro material para usar nos produtos'
              }
            </p>
            {!q && (
                        <button
                          onClick={() => setOpenCreate(true)}
                          className="inline-flex items-center px-6 py-3 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors"
                        >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Criar Primeiro Material
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Create Modal */}
      {openCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#341601]">Novo Material</h2>
                  <p className="text-sm text-gray-600 mt-1">Configure as informações do material</p>
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
                  Nome do Material
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Ex: Papel Couché 300g"
                />
                <p className="text-xs text-gray-500 mt-1">Nome que identifica o material</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#341601] mb-2">
                  Tipo
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                  value={form.type}
                  onChange={(e) => setForm({...form, type: e.target.value})}
                  placeholder="Ex: papel, vinil, pvc"
                />
                <p className="text-xs text-gray-500 mt-1">Categoria do material</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Fornecedor (opcional)
                  </label>
                  <input
                    list="supplier-suggestions"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.supplierName}
                    onChange={(e)=> setForm({ ...form, supplierName: e.target.value, supplierId: "" })}
                    placeholder="Digite para procurar ou criar"
                  />
                  <datalist id="supplier-suggestions">
                    {suppliers.map((s:any)=> (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">Se já existir, selecione; se não, crio automaticamente</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Custo do Fornecedor (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.supplierUnitCost}
                    onChange={(e) => setForm({...form, supplierUnitCost: e.target.value})}
                    placeholder="0.0000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Valor por unidade (ou deixe vazio e use cálculo automático abaixo)</p>
                </div>
              </div>

              {/* Cálculo Automático do Custo do Fornecedor */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-[#341601] mb-3">Cálculo Automático (opcional)</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Custo do Rolo/Pack (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      value={form.supplierRollCost}
                      onChange={(e) => setForm({...form, supplierRollCost: e.target.value})}
                      placeholder="Ex: 19.12"
                    />
                  </div>
                  {form.unit === "M2" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Largura do Rolo (m)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                          value={form.supplierRollWidth}
                          onChange={(e) => setForm({...form, supplierRollWidth: e.target.value})}
                          placeholder="Ex: 0.615"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Comprimento do Rolo (m)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                          value={form.supplierRollLength}
                          onChange={(e) => setForm({...form, supplierRollLength: e.target.value})}
                          placeholder="Ex: 5.0"
                        />
                      </div>
                    </div>
                  )}
                  {form.unit === "SHEET" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quantidade de Folhas no Pack
                      </label>
                      <input
                        type="number"
                        step="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                        value={form.supplierRollQuantity}
                        onChange={(e) => setForm({...form, supplierRollQuantity: e.target.value})}
                        placeholder="Ex: 500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Unidade
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.unit}
                    onChange={(e) => setForm({...form, unit: e.target.value as Material["unit"]})}
                  >
                    <option value="UNIT">Unidade</option>
                    <option value="M2">Metro Quadrado</option>
                    <option value="LOT">Lote</option>
                    <option value="HOUR">Hora</option>
                    <option value="SHEET">Folha</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Custo (€)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    value={form.unitCost}
                    onChange={(e) => setForm({...form, unitCost: e.target.value})}
                    placeholder="0.0000"
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
                  Material ativo
                </label>
              </div>
            </div>

            {/* Resumo de Custos */}
            {(() => {
              // Calcula o custo do fornecedor se houver campos de rolo preenchidos
              let calculatedSupplierCost: string | null = null;
              if (form.supplierRollCost && form.supplierRollCost.trim()) {
                const rollCost = Number(form.supplierRollCost.replace(',', '.'));
                if (!isNaN(rollCost) && rollCost > 0) {
                  if (form.unit === "M2" && form.supplierRollWidth && form.supplierRollLength) {
                    const w = Number(form.supplierRollWidth.replace(',', '.'));
                    const l = Number(form.supplierRollLength.replace(',', '.'));
                    if (!isNaN(w) && !isNaN(l) && w > 0 && l > 0) {
                      calculatedSupplierCost = (rollCost / (w * l)).toFixed(4);
                    }
                  } else if (form.unit === "SHEET" && form.supplierRollQuantity) {
                    const qty = Number(form.supplierRollQuantity);
                    if (!isNaN(qty) && qty > 0) {
                      calculatedSupplierCost = (rollCost / qty).toFixed(4);
                    }
                  } else if (form.unit === "UNIT") {
                    calculatedSupplierCost = rollCost.toFixed(4);
                  }
                }
              }
              const finalSupplierCost = calculatedSupplierCost || form.supplierUnitCost;
              
              if (!form.unitCost && !finalSupplierCost) return null;
              
              const unitCostValue = Number(form.unitCost || 0);
              const supplierCostValue = finalSupplierCost ? Number(finalSupplierCost) : 0;
              const totalCost = unitCostValue + supplierCostValue;
              
              return (
                <div className="border-t border-gray-200 px-6 py-4 bg-[#F6EEE8]">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#341601]">Resumo de Custos</p>
                    {form.unitCost && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Custo Unitário:</span>
                        <span className="font-semibold text-[#341601]">
                          €{unitCostValue.toFixed(4)} / {form.unit === "M2" ? "m²" : form.unit === "SHEET" ? "folha" : form.unit === "UNIT" ? "unidade" : form.unit.toLowerCase()}
                        </span>
                      </div>
                    )}
                    {finalSupplierCost && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Custo do Fornecedor:</span>
                        <span className="font-semibold text-[#341601]">
                          €{supplierCostValue.toFixed(4)} / {form.unit === "M2" ? "m²" : form.unit === "SHEET" ? "folha" : form.unit === "UNIT" ? "unidade" : form.unit.toLowerCase()}
                        </span>
                      </div>
                    )}
                    {(form.unitCost || finalSupplierCost) && (
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="text-[#341601] font-medium">Total:</span>
                        <span className="font-bold text-[#341601] text-base">
                          €{totalCost.toFixed(4)} / {form.unit === "M2" ? "m²" : form.unit === "SHEET" ? "folha" : form.unit === "UNIT" ? "unidade" : form.unit.toLowerCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

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
                          onClick={createMaterial}
                          disabled={saving}
                        >
                  {saving ? 'Criando...' : 'Criar Material'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
