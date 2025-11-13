"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { PageLoading } from "@/components/ui/loading";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [supplierType, setSupplierType] = useState<"existing" | "new" | "none">("none");
  const [form, setForm] = useState({
    name: "",
    type: "",
    unit: "UNIT" as Material["unit"],
    unitCost: "0.0000",
    supplierUnitCost: "",
    active: true,
    supplierId: "",
    supplierName: "",
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
      // resolve supplierId: usa selecionado; se for novo, cria/reativa supplier e usa o id
      let supplierIdToUse: number | null = null;
      if (supplierType === "none") {
        supplierIdToUse = null;
      } else if (supplierType === "existing" && form.supplierId) {
        supplierIdToUse = Number(form.supplierId);
      } else if (supplierType === "new" && form.supplierName && form.supplierName.trim()) {
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

      // Usa o custo do fornecedor informado diretamente (apenas se tiver fornecedor)
      const finalSupplierUnitCost = supplierType !== "none" && form.supplierUnitCost ? form.supplierUnitCost : null;

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
      setForm({ name: "", type: "", unit: "UNIT", unitCost: "0.0000", supplierUnitCost: "", active: true, supplierId: "", supplierName: "" });
      setSupplierType("none");
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
    return <PageLoading message="Carregando materiais..." />;
  }

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#341601]">Materiais</h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Gerencie os materiais disponíveis para produção</p>
            </div>
                    <button
                      onClick={() => setOpenCreate(true)}
                      className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors shadow-sm text-sm sm:text-base w-full sm:w-auto"
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
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
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
            <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
              <select className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]" value={sortKey} onChange={e=>setSortKey(e.target.value as any)}>
                <option value="name">Ordenar por Nome</option>
                <option value="type">Ordenar por Tipo</option>
                <option value="unitCost">Ordenar por Custo</option>
              </select>
              <button className="px-3 sm:px-4 py-3 border border-gray-300 rounded-lg hover:bg-white transition-colors min-w-[48px]" onClick={()=>setSortDir(d=> d==="asc"?"desc":"asc")}>{sortDir==="asc"?"↑":"↓"}</button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-md my-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-[#341601]">Novo Material</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Configure as informações do material</p>
                </div>
                <button 
                  onClick={() => setOpenCreate(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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

              <div>
                <label className="block text-sm font-medium text-[#341601] mb-3">
                  Fornecedor (opcional)
                </label>
                <RadioGroup 
                  value={supplierType} 
                  onValueChange={(value) => {
                    setSupplierType(value as "existing" | "new" | "none");
                    if (value === "none") {
                      setForm({ ...form, supplierId: "", supplierName: "", supplierUnitCost: "" });
                    } else if (value === "existing") {
                      setForm({ ...form, supplierName: "" });
                    } else {
                      setForm({ ...form, supplierId: "" });
                    }
                  }} 
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="none" id="supplier-none" />
                      <Label htmlFor="supplier-none" className="font-semibold text-[#341601] cursor-pointer text-base">
                        Sem Fornecedor
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="existing" id="supplier-existing" />
                      <Label htmlFor="supplier-existing" className="font-semibold text-[#341601] cursor-pointer text-base">
                        Fornecedor Cadastrado
                      </Label>
                    </div>
                    {supplierType === "existing" && (
                      <div className="ml-8 mt-3">
                        <Select
                          value={form.supplierId}
                          onValueChange={(value) => setForm({ ...form, supplierId: value, supplierName: "" })}
                        >
                          <SelectTrigger className="w-full h-11 border-2 border-gray-300 bg-white text-gray-900 shadow-sm hover:border-gray-400">
                            <SelectValue placeholder="Selecione um fornecedor" />
                          </SelectTrigger>
                          <SelectContent 
                            className="max-h-[200px]" 
                            position="popper"
                            sideOffset={4}
                            align="start"
                          >
                            {suppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id.toString()}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="new" id="supplier-new" />
                      <Label htmlFor="supplier-new" className="font-semibold text-[#341601] cursor-pointer text-base">
                        Novo Fornecedor
                      </Label>
                    </div>
                    {supplierType === "new" && (
                      <div className="ml-8 mt-3">
                        <input
                          type="text"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] h-11"
                          value={form.supplierName}
                          onChange={(e) => setForm({ ...form, supplierName: e.target.value, supplierId: "" })}
                          placeholder="Nome do novo fornecedor"
                        />
                        <p className="text-xs text-gray-500 mt-2 ml-1">
                          O fornecedor será criado automaticamente ao salvar o material
                        </p>
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </div>

              {supplierType !== "none" && (
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Custo do Fornecedor (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] h-11"
                    value={form.supplierUnitCost}
                    onChange={(e) => setForm({...form, supplierUnitCost: e.target.value})}
                    placeholder="0.0000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Custo por unidade do fornecedor</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">
                    Unidade
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] h-11"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] h-11"
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
              if (!form.unitCost && !form.supplierUnitCost) return null;
              
              const unitCostValue = Number(form.unitCost || 0);
              const supplierCostValue = form.supplierUnitCost ? Number(form.supplierUnitCost) : 0;
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
                    {form.supplierUnitCost && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Custo do Fornecedor:</span>
                        <span className="font-semibold text-[#341601]">
                          €{supplierCostValue.toFixed(4)} / {form.unit === "M2" ? "m²" : form.unit === "SHEET" ? "folha" : form.unit === "UNIT" ? "unidade" : form.unit.toLowerCase()}
                        </span>
                      </div>
                    )}
                    {(form.unitCost || form.supplierUnitCost) && (
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
            <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky bottom-0 bg-white">
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button 
                  className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-[#341601] text-sm sm:text-base rounded-lg hover:bg-white transition-colors w-full sm:w-auto"
                  onClick={() => setOpenCreate(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#F66807] text-white text-sm sm:text-base rounded-lg hover:bg-[#F66807]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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
