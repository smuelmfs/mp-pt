"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  category: {
    name: string;
  };
  widthMm: number | null;
  heightMm: number | null;
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
  categories: Array<{ id: number; name: string }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CategoriesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersData>({ materialTypes: [], finishCategories: [], categories: [] });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 });
  
  // Estados dos filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
  const [selectedFinishCategories, setSelectedFinishCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");

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
        if (activeTab !== "all") {
          params.append("categoryId", activeTab);
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
  }, [pagination.page, searchQuery, selectedMaterialTypes, selectedFinishCategories, activeTab]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedMaterialTypes([]);
    setSelectedFinishCategories([]);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
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

  const hasActiveFilters = searchQuery || selectedMaterialTypes.length > 0 || selectedFinishCategories.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="flex gap-6">
              <div className="w-64 h-96 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600 mt-2">Explore todos os produtos disponíveis</p>
          
          {/* Abas de Categorias */}
          <div className="mt-6 border-b border-gray-200">
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => handleTabChange("all")}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "all"
                    ? "border-black text-black"
                    : "border-transparent text-gray-600 hover:text-black hover:border-gray-300"
                }`}
              >
                Todos
              </button>
              {filters.categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleTabChange(category.id.toString())}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === category.id.toString()
                      ? "border-black text-black"
                      : "border-transparent text-gray-600 hover:text-black hover:border-gray-300"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filtros Laterais */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-gray-600 hover:text-black font-medium"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Busca */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filtro por Tipo de Material */}
              {filters.materialTypes.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Material
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filters.materialTypes.map((type) => (
                      <label key={type} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedMaterialTypes.includes(type)}
                          onChange={() => toggleMaterialType(type)}
                          className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro por Categoria de Acabamento */}
              {filters.finishCategories.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Categoria de Acabamento
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filters.finishCategories.map((category) => (
                      <label key={category} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedFinishCategories.includes(category)}
                          onChange={() => toggleFinishCategory(category)}
                          className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Produtos */}
          <div className="flex-1">
            <div className="grid gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/quotes/configurator/${product.id}`}
                  className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span className="text-gray-900">{product.category.name}</span>
                        {product.widthMm && product.heightMm && (
                          <span>
                            {product.widthMm}×{product.heightMm} mm
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {product.materials && product.materials.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">
                              {product.materials[0].material.type}
                            </span>
                          </div>
                        )}
                        {product.finishes && product.finishes.length > 0 && (
                          <span className="text-xs text-gray-600">
                            {product.finishes.map(f => f.finish.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-400 ml-4">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {products.length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-lg">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
                <p className="text-gray-600">Tente ajustar os filtros para encontrar produtos.</p>
              </div>
            )}

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-700 font-medium"
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
                      className={`px-4 py-2 border rounded-md font-medium ${
                        pagination.page === pageNum
                          ? 'bg-black text-white border-black'
                          : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-700 font-medium"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}