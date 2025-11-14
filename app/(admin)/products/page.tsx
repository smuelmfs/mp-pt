"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { markStepComplete } from "@/lib/admin-progress";
import { SimplePagination } from "@/components/ui/simple-pagination";

export default function ProductsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [prints, setPrints] = useState<any[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [openCreate, setOpenCreate] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [form, setForm] = useState<any>({
    name: "", categoryId: "", printingId: "", marginDefault: "", markupDefault: "", roundingStep: "",
    roundingStrategy: "", pricingStrategy: "", minPricePerPiece: ""
  });

  async function load() {
    try {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (productId) params.set("productId", productId);
    if (categoryFilter && categoryFilter !== "") {
      params.set("categoryId", categoryFilter);
    }
    if (activeFilter) params.set("active", activeFilter);

    const [pRes, cRes, prRes] = await Promise.all([
      fetch(`/api/admin/products?${params.toString()}`),
      fetch(`/api/admin/categories`),
      fetch(`/api/admin/printing`), // lista já existe (GET sem [id]) no teu projeto
    ]);
      
      if (!pRes.ok || !cRes.ok || !prRes.ok) {
        throw new Error("Erro ao carregar dados");
      }

      const [products, categories, printings] = await Promise.all([
        pRes.json().catch(() => []),
        cRes.json().catch(() => []),
        prRes.json().catch(() => []),
      ]);
      
      setRows(Array.isArray(products) ? products : []);
      setCats(Array.isArray(categories) ? categories : []);
      setPrints(Array.isArray(printings) ? printings : []);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setRows([]);
      setCats([]);
      setPrints([]);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return rows.slice(start, end);
  }, [rows, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(rows.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, productId, categoryFilter, activeFilter]);

  async function createProduct() {
    const body: any = {
      name: form.name,
      categoryId: Number(form.categoryId),
      printingId: form.printingId ? Number(form.printingId) : null,
      marginDefault: form.marginDefault || null,
      markupDefault: form.markupDefault || null,
      roundingStep: form.roundingStep || null,
      roundingStrategy: form.roundingStrategy || null,
      pricingStrategy: form.pricingStrategy || null,
      minPricePerPiece: form.minPricePerPiece || null,
    };
    const res = await fetch("/api/admin/products", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    if (res.ok) {
      markStepComplete('products');
      setOpenCreate(false);
      setForm({ name: "", categoryId: "", printingId: "", marginDefault: "", markupDefault: "", roundingStep: "", roundingStrategy: "", pricingStrategy: "", minPricePerPiece: "" });
      load();
    } else {
      const errorData = await res.json().catch(() => ({}));
      let errorMessage = "Falha ao criar";
      
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
      
      toast.error("Erro: " + errorMessage);
    }
  }

  return (
     <main className="min-h-screen bg-[#F6EEE8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#341601]">Produtos</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">Gerencie os produtos e suas configurações</p>
            </div>
            <button 
              onClick={()=>setOpenCreate(true)} 
              className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-[#F66807] text-white text-sm sm:text-base font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors shadow-sm w-full sm:w-auto"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">Novo Produto</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Search and Filters */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#341601] mb-2">Busca (nome, categoria ou ID)</label>
                <div className="relative">
                  <input 
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    placeholder="Ex: cartões, etiquetas ou 123"
                    value={q} 
                    onChange={(e)=>setQ(e.target.value)} 
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#341601] mb-2">ID do Produto</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                  placeholder="Ex: 101"
                  value={productId}
                  onChange={(e)=>setProductId(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#341601] mb-2">Categoria</label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                  value={categoryFilter}
                  onChange={(e)=>{
                    setCategoryFilter(e.target.value);
                    // Aplicar filtro automaticamente quando categoria muda
                    setTimeout(() => load(), 100);
                  }}
                >
                  <option value="">Todas</option>
                  {cats.map((c:any)=> <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>

              {/* Impressão filter removed as requested */}

              <div>
                <label className="block text-sm font-medium text-[#341601] mb-2">Status</label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                  value={activeFilter}
                  onChange={(e)=>setActiveFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button 
                onClick={load} 
                className="px-6 py-3 bg-[#F66807] text-white rounded-lg hover:bg-[#F66807]/90 transition-colors"
              >
                Filtrar
              </button>
              <button
                onClick={()=>{ setQ(""); setProductId(""); setCategoryFilter(""); setActiveFilter(""); load(); }}
                className="px-6 py-3 border border-gray-300 text-[#341601] rounded-lg hover:bg-white transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {rows.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {paginatedItems.map((p) => (
              <div key={p.id} className="rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#341601] mb-2">{p.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {p.category?.name || 'Sem categoria'}
                      </div>
                      {p.printing && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          {p.printing.technology} {p.printing.colors ?? ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <a
                      href={`/products/${p.id}`}
                      className="p-2 text-gray-400 hover:text-[#F66807] transition-colors"
                      title="Editar produto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </a>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      p.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {p.active ? 'Ativo' : 'Inativo'}
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
                  totalItems={rows.length}
                  onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-medium text-[#341601] mb-2">Nenhum produto encontrado</h3>
              <p className="text-gray-600 mb-6">Comece criando seu primeiro produto</p>
              <button 
                onClick={()=>setOpenCreate(true)} 
                className="inline-flex items-center px-6 py-3 bg-[#F66807] text-white rounded-lg hover:bg-[#F66807]/90 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Criar Primeiro Produto
              </button>
            </div>
          )}
        </div>
      </div>

      {openCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#341601]">Criar Novo Produto</h2>
                  <p className="text-sm text-gray-600 mt-1">Configure as informações básicas do produto</p>
                </div>
                <button 
                  onClick={()=>setOpenCreate(false)}
                  className="text-gray-400 hover:text-[#F66807] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[#341601]">Informações Básicas</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">Nome do Produto *</label>
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      placeholder="Ex: Cartões de Visita"
                      value={form.name} 
                      onChange={(e)=>setForm((f:any)=>({...f,name:e.target.value}))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">Categoria *</label>
                    <select 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      value={form.categoryId} 
                      onChange={(e)=>setForm((f:any)=>({...f,categoryId:e.target.value}))}
                    >
                      <option value="">Selecione uma categoria</option>
                      {cats.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">Impressão (opcional)</label>
                    <select 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      value={form.printingId} 
                      onChange={(e)=>setForm((f:any)=>({...f,printingId:e.target.value}))}
                    >
                      <option value="">Sem impressão específica</option>
                      {prints.map((p:any)=> (
                        <option key={p.id} value={p.id}>
                          {p.formatLabel || `${p.technology} ${p.colors ?? ""}`}
                          {p.formatLabel && ` (${p.technology}${p.colors ? ` ${p.colors}` : ""})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Configurações Financeiras */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[#341601]">Configurações Financeiras</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">Margem Padrão</label>
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      placeholder="Ex: 0.30 (30%)"
                      value={form.marginDefault} 
                      onChange={(e)=>setForm((f:any)=>({...f,marginDefault:e.target.value}))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Deixe vazio para usar a margem da categoria</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">Markup Padrão</label>
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      placeholder="Ex: 0.20 (20%)"
                      value={form.markupDefault} 
                      onChange={(e)=>setForm((f:any)=>({...f,markupDefault:e.target.value}))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Deixe vazio para usar o markup da categoria</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">Arredondamento</label>
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      placeholder="Ex: 0.05 (€0.05)"
                      value={form.roundingStep} 
                      onChange={(e)=>setForm((f:any)=>({...f,roundingStep:e.target.value}))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Deixe vazio para usar o arredondamento da categoria</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">Estratégia de Arredondamento</label>
                    <select 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      value={form.roundingStrategy} 
                      onChange={(e)=>setForm((f:any)=>({...f,roundingStrategy:e.target.value}))}
                    >
                      <option value="">Usar categoria/global</option>
                      <option value="END_ONLY">Apenas no final</option>
                      <option value="PER_STEP">Por etapa</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">END_ONLY: arredonda só o preço final | PER_STEP: arredonda cada linha</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">Estratégia de Precificação</label>
                    <select 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      value={form.pricingStrategy} 
                      onChange={(e)=>setForm((f:any)=>({...f,pricingStrategy:e.target.value}))}
                    >
                      <option value="">Usar categoria/global</option>
                      <option value="COST_MARKUP_MARGIN">Custo × Markup × Margem</option>
                      <option value="COST_MARGIN_ONLY">Custo × Margem</option>
                      <option value="MARGIN_TARGET">Margem Alvo</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Como calcular o preço final</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">Preço Mínimo por Peça</label>
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      placeholder="Ex: 0.50 (€0.50)"
                      value={form.minPricePerPiece} 
                      onChange={(e)=>setForm((f:any)=>({...f,minPricePerPiece:e.target.value}))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Preço mínimo por unidade (além do mínimo por lote)</p>
                  </div>
                </div>
              </div>

              {/* Resumo de Custos */}
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-[#341601] mb-4">Resumo de Custos</h4>
                <div className="bg-[#F6EEE8] rounded-lg p-4 space-y-2">
                  <p className="text-xs text-gray-600 mb-3">
                    O resumo completo de custos será calculado após adicionar materiais e acabamentos ao produto.
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Custo Total Estimado:</span>
                    <span className="font-semibold text-[#341601]">€0.00</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Configure materiais e acabamentos na página de edição do produto para ver o cálculo completo.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end gap-3">
                <button 
                  className="px-6 py-3 border border-gray-300 text-[#341601] rounded-lg hover:bg-white transition-colors"
                  onClick={()=>setOpenCreate(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="px-6 py-3 bg-[#F66807] text-white rounded-lg hover:bg-[#F66807]/90 transition-colors font-medium"
                  onClick={createProduct}
                >
                  Criar Produto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
