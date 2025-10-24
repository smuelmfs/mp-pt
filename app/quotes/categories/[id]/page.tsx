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
}

export default function CategoryProductsPage() {
  const params = useParams();
  const categoryId = params.id as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(`/api/admin/products?categoryId=${categoryId}`);
        const data = await response.json();
        setProducts(data);
        
        if (data.length > 0) {
          setCategoryName(data[0].category.name);
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
  }, [categoryId]);

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
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

        <div className="grid gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/quotes/configurator/${product.id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    {product.widthMm && product.heightMm && (
                      <span>
                        {product.widthMm}×{product.heightMm} mm
                      </span>
                    )}
                    <span>Configurar →</span>
                  </div>
                </div>
                <div className="text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-600">Não há produtos disponíveis nesta categoria.</p>
          </div>
        )}
      </div>
    </div>
  );
}