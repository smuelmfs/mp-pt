"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CategoryProductsPage() {
  const params = useParams();
  const categoryId = params.id as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersData>({ materialTypes: [], finishCategories: [] });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 });
  
  // Estados dos filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>("");
  const [selectedFinishCategory, setSelectedFinishCategory] = useState<string>("");

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          categoryId,
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        });
        
        if (searchQuery) params.append("q", searchQuery);
        if (selectedMaterialType) params.append("materialType", selectedMaterialType);
        if (selectedFinishCategory) params.append("finishCategory", selectedFinishCategory);
        
        const response = await fetch(`/api/catalog/products?${params}`);
        const data = await response.json();
        
        setProducts(data.products);
        setFilters(data.filters);
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        });
        
        if (data.products.length > 0) {
          setCategoryName(data.products[0].category.name);
        }
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      } finally {
        setLoading(false);
      }
    }

    if (categoryId) {
      loadProducts();
    }
  }, [categoryId, pagination.page, searchQuery, selectedMaterialType, selectedFinishCategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedMaterialType("");
    setSelectedFinishCategory("");
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = searchQuery || selectedMaterialType || selectedFinishCategory;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/quotes/categories" className="hover:text-gray-900">
              Categorias
            </Link>
            <span>/</span>
            <span className="text-gray-900">{categoryName}</span>
          </nav>
          
          <h1 className="text-3xl font-bold text-gray-900">{categoryName}</h1>
          <p className="text-gray-600 mt-2">Escolha um produto para configurar</p>
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
                    className="text-xs text-blue-600 hover:text-blue-700"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Material
                  </label>
                  <select
                    value={selectedMaterialType}
                    onChange={(e) => {
                      setSelectedMaterialType(e.target.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    {filters.materialTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro por Categoria de Acabamento */}
              {filters.finishCategories.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria de Acabamento
                  </label>
                  <select
                    value={selectedFinishCategory}
                    onChange={(e) => {
                      setSelectedFinishCategory(e.target.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas</option>
                    {filters.finishCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
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
                        {product.widthMm && product.heightMm && (
                          <span>
                            {product.widthMm}×{product.heightMm} mm
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {product.materials && product.materials.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-blue-600">
                              {product.materials[0].material.type}
                            </span>
                          </div>
                        )}
                        {product.finishes && product.finishes.length > 0 && (
                          <span className="text-xs text-green-600">
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
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
                      className={`px-4 py-2 border rounded-md ${
                        pagination.page === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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