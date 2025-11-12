"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLoading, ListSkeleton } from "@/components/ui/loading";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Product {
  id: number;
  name: string;
  category: {
    name: string;
  };
  widthMm: number | null;
  heightMm: number | null;
  printing?: {
    id: number;
    technology: string;
    formatLabel: string | null;
    colors: string | null;
  } | null;
  materials?: Array<{
    material: {
      id: number;
      name: string;
      type: string;
    };
  }>;
  finishes?: Array<{
    finish: {
      id: number;
      name: string;
      category: string;
    };
  }>;
}

interface FiltersData {
  materialTypes: string[];
  finishCategories: string[];
  printingTechnologies: string[];
  printingFormats: string[];
  printingColors: string[];
  categories: Array<{ id: number; name: string }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CustomerOption { id: number; name: string }

export default function CategoriesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersData>({ 
    materialTypes: [], 
    finishCategories: [], 
    printingTechnologies: [],
    printingFormats: [],
    printingColors: [],
    categories: [] 
  });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 });
  
  // Estados dos filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
  const [selectedFinishCategories, setSelectedFinishCategories] = useState<string[]>([]);
  const [selectedPrintingTechnology, setSelectedPrintingTechnology] = useState<string>("");
  const [selectedPrintingFormat, setSelectedPrintingFormat] = useState<string>("");
  const [selectedPrintingColors, setSelectedPrintingColors] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Estados para seleção múltipla de produtos
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  // Estados para modal de cliente
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerType, setCustomerType] = useState<"existing" | "manual">("existing");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [multiQuoteCustomerId, setMultiQuoteCustomerId] = useState<string>("");

  // Carregar clientes ativos para filtro
  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch("/api/admin/customers?activeOnly=true");
        if (res.ok) {
          const data = await res.json();
          const opts = (Array.isArray(data) ? data : [])
            .map((c: any) => ({ id: c.id, name: c.name })) as CustomerOption[];
          setCustomers(opts);
        }
      } catch (_) {}
    }
    loadCustomers();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        });
        
        if (searchQuery) params.append("q", searchQuery);
        if (selectedMaterialTypes.length > 0) {
          selectedMaterialTypes.forEach(type => params.append("materialType", type));
        }
        if (selectedFinishCategories.length > 0) {
          selectedFinishCategories.forEach(cat => params.append("finishCategory", cat));
        }
        if (selectedPrintingTechnology) {
          params.append("printingTechnology", selectedPrintingTechnology);
        }
        if (selectedPrintingFormat) {
          params.append("printingFormat", selectedPrintingFormat);
        }
        if (selectedPrintingColors) {
          params.append("printingColors", selectedPrintingColors);
        }
        if (activeTab !== "all") {
          params.append("categoryId", activeTab);
        }
        if (selectedCustomer) {
          params.append("customerId", selectedCustomer);
        }
        
        const response = await fetch(`/api/catalog/products?${params}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erro na API:', response.status, errorData);
          return;
        }
        
        const data = await response.json();
        
        // Verificar se a estrutura de dados está correta
        if (!data || !data.products || !data.pagination || !data.filters) {
          console.error('Estrutura de dados inválida:', data);
          return;
        }
        
        setProducts(data.products);
        setFilters(data.filters);
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        });
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [pagination.page, searchQuery, selectedMaterialTypes, selectedFinishCategories, selectedPrintingTechnology, selectedPrintingFormat, selectedPrintingColors, activeTab, selectedCustomer]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedMaterialTypes([]);
    setSelectedFinishCategories([]);
    setSelectedPrintingTechnology("");
    setSelectedPrintingFormat("");
    setSelectedPrintingColors("");
    setSelectedCustomer("");
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Limpar filtros de material e acabamento quando a categoria mudar
    // pois os filtros disponíveis mudarão dinamicamente
    setSelectedMaterialTypes([]);
    setSelectedFinishCategories([]);
    setSelectedPrintingTechnology("");
    setSelectedPrintingFormat("");
    setSelectedPrintingColors("");
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleMaterialType = (type: string) => {
    setSelectedMaterialTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleFinishCategory = (category: string) => {
    setSelectedFinishCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = searchQuery || selectedMaterialTypes.length > 0 || selectedFinishCategories.length > 0 || selectedPrintingTechnology || selectedPrintingFormat || selectedPrintingColors;

  // Funções para seleção múltipla
  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleStartMultiQuote = () => {
    if (selectedProducts.size === 0) {
      alert("Selecione pelo menos um produto para criar o orçamento");
      return;
    }
    if (selectedProducts.size === 1) {
      alert("Para usar o modo de seleção múltipla, é necessário selecionar pelo menos 2 produtos. Selecione apenas 1 produto, use o modo normal de orçamento.");
      return;
    }
    // Abrir modal para selecionar cliente
    setShowCustomerModal(true);
  };

  const handleConfirmCustomerAndStart = () => {
    if (customerType === "manual" && !manualCustomerName.trim()) {
      alert("Por favor, preencha o nome do cliente/solicitante");
      return;
    }

    const productsArray = Array.from(selectedProducts);
    const finalCustomerId = customerType === "existing" ? multiQuoteCustomerId : "";
    const finalCustomerName = customerType === "manual" ? manualCustomerName.trim() : "";

    // Salvar produtos selecionados e informações do cliente no sessionStorage
    sessionStorage.setItem('multiQuoteProducts', JSON.stringify(productsArray));
    sessionStorage.setItem('multiQuoteCustomerId', finalCustomerId);
    sessionStorage.setItem('multiQuoteCustomerName', finalCustomerName);
    sessionStorage.setItem('multiQuoteCustomerType', customerType);
    sessionStorage.setItem('multiQuoteCurrentIndex', '0');
    
    // Fechar modal e redirecionar
    setShowCustomerModal(false);
    window.location.href = `/quotes/configurator/${productsArray[0]}${finalCustomerId ? `?customerId=${finalCustomerId}` : ''}`;
  };

  if (loading) {
    return <PageLoading message="Carregando produtos..." />;
  }

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#341601]">Produtos</h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Explore todos os produtos disponíveis</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode);
                  if (!isMultiSelectMode) {
                    setSelectedProducts(new Set());
                  }
                }}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isMultiSelectMode
                    ? 'bg-[#F66807] text-white hover:bg-[#E55A00]'
                    : 'bg-gray-100 text-[#341601] hover:bg-gray-200'
                }`}
              >
                {isMultiSelectMode ? '✓ Modo Seleção' : 'Selecionar Múltiplos'}
              </button>
              {isMultiSelectMode && selectedProducts.size > 1 && (
                <Button
                  onClick={handleStartMultiQuote}
                  size="sm"
                >
                  Orçar {selectedProducts.size} Produtos
                </Button>
              )}
              {isMultiSelectMode && selectedProducts.size === 1 && (
                <div className="text-xs text-gray-500 px-2 py-1 italic">
                  Selecione pelo menos 2 produtos para orçamento múltiplo
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Cliente */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#341601] text-xl font-bold">Informações do Cliente</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Para quem é este orçamento? Selecione um cliente cadastrado ou informe o nome do solicitante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <RadioGroup value={customerType} onValueChange={(value) => setCustomerType(value as "existing" | "manual")} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="font-semibold text-[#341601] cursor-pointer text-base">
                    Cliente Cadastrado
                  </Label>
                </div>
                {customerType === "existing" && (
                  <div className="ml-8 mt-3">
                    <Select
                      value={multiQuoteCustomerId}
                      onValueChange={(value) => setMultiQuoteCustomerId(value)}
                    >
                      <SelectTrigger className="w-full h-11 border-2 border-gray-300 bg-white text-gray-900 shadow-sm hover:border-gray-400">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent 
                        className="max-h-[200px]" 
                        position="popper"
                        sideOffset={4}
                        align="start"
                      >
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="font-semibold text-[#341601] cursor-pointer text-base">
                    Informar Nome do Solicitante
                  </Label>
                </div>
                {customerType === "manual" && (
                  <div className="ml-8 mt-3">
                    <Input
                      type="text"
                      placeholder="Nome do cliente ou solicitante"
                      value={manualCustomerName}
                      onChange={(e) => setManualCustomerName(e.target.value)}
                      className="w-full h-11"
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      Este nome será registrado no orçamento para identificação
                    </p>
                  </div>
                )}
              </div>
            </RadioGroup>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowCustomerModal(false)}
                className="w-full sm:w-auto min-w-[120px]"
                size="lg"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmCustomerAndStart}
                disabled={
                  (customerType === "existing" && !multiQuoteCustomerId) ||
                  (customerType === "manual" && !manualCustomerName.trim())
                }
                className="w-full sm:w-auto min-w-[160px]"
                size="lg"
              >
                Iniciar Orçamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          
          {/* Abas de Categorias */}
          <div className="mt-4 sm:mt-6">
            <div className="bg-white rounded-lg border border-gray-200 p-1">
              <div className="flex gap-1 overflow-x-auto hide-scrollbar scroll-smooth">
                <button
                  onClick={() => handleTabChange("all")}
                  className={`px-5 py-2.5 font-medium text-sm rounded-md transition-all whitespace-nowrap flex-shrink-0 ${
                    activeTab === "all"
                      ? "bg-[#F66807] text-white font-semibold shadow-sm"
                      : "bg-transparent text-[#341601] hover:bg-[#F6EEE8] hover:text-[#F66807]"
                  }`}
                >
                  Todos
                </button>
                {filters.categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleTabChange(category.id.toString())}
                    className={`px-5 py-2.5 font-medium text-sm rounded-md transition-all whitespace-nowrap flex-shrink-0 ${
                      activeTab === category.id.toString()
                        ? "bg-[#F66807] text-white font-semibold shadow-sm"
                        : "bg-transparent text-[#341601] hover:bg-[#F6EEE8] hover:text-[#F66807]"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Filtros Laterais */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 lg:sticky lg:top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#341601]">Filtros</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-[#341601] hover:text-[#F66807] font-medium"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Busca */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#341601] mb-2">
                  Buscar
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  placeholder="Nome do produto..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                />
              </div>

              {/* Cliente */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#341601] mb-2">
                  Cliente
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => {
                    setSelectedCustomer(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-3 py-2 border-2 border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] hover:border-gray-400 transition-colors text-sm"
                >
                  <option value="">Todos os clientes</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id.toString()}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Tipo de Material */}
              {filters.materialTypes.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#341601] mb-3">
                    Tipo de Material
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filters.materialTypes.map((type) => (
                      <label key={type} className="flex items-center space-x-2 cursor-pointer hover:bg-[#F6EEE8] p-2 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedMaterialTypes.includes(type)}
                          onChange={() => toggleMaterialType(type)}
                          className="h-4 w-4 text-[#F66807] focus:ring-[#F66807] border-gray-300 rounded"
                        />
                        <span className="text-sm text-[#341601]">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro por Categoria de Acabamento */}
              {filters.finishCategories.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#341601] mb-3">
                    Categoria de Acabamento
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filters.finishCategories.map((category) => (
                      <label key={category} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedFinishCategories.includes(category)}
                          onChange={() => toggleFinishCategory(category)}
                          className="h-4 w-4 text-[#F66807] focus:ring-[#F66807] border-gray-300 rounded"
                        />
                        <span className="text-sm text-[#341601]">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro por Tecnologia de Impressão */}
              {filters.printingTechnologies.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#341601] mb-3">
                    Tecnologia de Impressão
                  </label>
                  <select
                    value={selectedPrintingTechnology}
                    onChange={(e) => {
                      setSelectedPrintingTechnology(e.target.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="w-full px-3 py-2 border-2 border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] hover:border-gray-400 transition-colors text-sm"
                  >
                    <option value="">Todas as tecnologias</option>
                    {filters.printingTechnologies.map((tech) => (
                      <option key={tech} value={tech}>
                        {tech}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro por Formato de Impressão */}
              {filters.printingFormats.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#341601] mb-3">
                    Formato de Impressão
                  </label>
                  <select
                    value={selectedPrintingFormat}
                    onChange={(e) => {
                      setSelectedPrintingFormat(e.target.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="w-full px-3 py-2 border-2 border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] hover:border-gray-400 transition-colors text-sm"
                  >
                    <option value="">Todos os formatos</option>
                    {filters.printingFormats.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro por Cores de Impressão */}
              {filters.printingColors.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#341601] mb-3">
                    Cores de Impressão
                  </label>
                  <select
                    value={selectedPrintingColors}
                    onChange={(e) => {
                      setSelectedPrintingColors(e.target.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="w-full px-3 py-2 border-2 border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] hover:border-gray-400 transition-colors text-sm"
                  >
                    <option value="">Todas as cores</option>
                    {filters.printingColors.map((colors) => (
                      <option key={colors} value={colors}>
                        {colors}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </aside>

          {/* Produtos */}
          <div className="flex-1 min-w-0">
            <div className="grid gap-4">
              {products.map((product) => {
                const isSelected = selectedProducts.has(product.id);
                return (
                  <div
                    key={product.id}
                    className={`relative bg-white rounded-lg shadow-sm border-2 transition-all ${
                      isMultiSelectMode
                        ? isSelected
                          ? 'border-[#F66807] bg-orange-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                        : 'border-gray-200 hover:shadow-md'
                    }`}
                    onClick={() => {
                      if (isMultiSelectMode) {
                        toggleProductSelection(product.id);
                      }
                    }}
                  >
                    {isMultiSelectMode && (
                      <div className="absolute top-4 right-4 z-10">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#F66807] border-[#F66807]'
                            : 'bg-white border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-[#341601] break-words">{product.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
                            <span className="text-[#341601] font-medium">{product.category.name}</span>
                            {product.widthMm && product.heightMm && (
                              <span>
                                {product.widthMm}×{product.heightMm} mm
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {product.printing && (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                                  {product.printing.technology}
                                  {product.printing.formatLabel && ` - ${product.printing.formatLabel}`}
                                  {product.printing.colors && ` (${product.printing.colors})`}
                                </span>
                              </div>
                            )}
                            {product.materials && product.materials.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                  {product.materials[0].material.type}
                                </span>
                              </div>
                            )}
                            {product.finishes && product.finishes.length > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                                {product.finishes.map(f => f.finish.name).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                        {!isMultiSelectMode && (
                          <Link
                            href={`/quotes/configurator/${product.id}${selectedCustomer ? `?customerId=${selectedCustomer}` : ""}`}
                            className="text-gray-400 ml-4 hover:text-[#F66807] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {products.length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-[#341601] mb-2">Nenhum produto encontrado</h3>
                <p className="text-gray-600">Tente ajustar os filtros para encontrar produtos.</p>
              </div>
            )}

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white text-[#341601] font-medium"
                >
                  Anterior
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-4 py-2 border rounded-lg font-medium ${
                        pagination.page === pageNum
                          ? 'bg-[#F66807] text-white border-[#F66807]'
                          : 'border-gray-300 hover:bg-white text-[#341601]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white text-[#341601] font-medium"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}