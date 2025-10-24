"use client";

import { useEffect, useState } from "react";

interface Category {
  id: number;
  name: string;
  roundingStep: number | string;
  _count?: {
    products: number;
  };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    roundingStep: 0.05
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createCategory() {
    if (!formData.name.trim()) {
      alert("Nome da categoria é obrigatório");
      return;
    }

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setOpenCreate(false);
        setFormData({ name: "", roundingStep: 0.05 });
        load();
      } else {
        const error = await res.json();
        alert("Erro: " + (error.error || "Falha ao criar categoria"));
      }
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      alert("Erro ao criar categoria");
    }
  }

  async function updateCategory(id: number) {
    if (!formData.name.trim()) {
      alert("Nome da categoria é obrigatório");
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setEditing(null);
        setFormData({ name: "", roundingStep: 0.05 });
        load();
      } else {
        const error = await res.json();
        alert("Erro: " + (error.error || "Falha ao atualizar categoria"));
      }
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
      alert("Erro ao atualizar categoria");
    }
  }

  async function deleteCategory(id: number) {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        load();
      } else {
        const error = await res.json();
        alert("Erro: " + (error.error || "Falha ao excluir categoria"));
      }
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      alert("Erro ao excluir categoria");
    }
  }

  function startEdit(category: Category) {
    setEditing(category);
    setFormData({
      name: category.name,
      roundingStep: Number(category.roundingStep)
    });
  }

  function cancelEdit() {
    setEditing(null);
    setFormData({ name: "", roundingStep: 0.05 });
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
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
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
              <p className="text-gray-600 mt-2">Organize os produtos em categorias para facilitar a navegação</p>
            </div>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nova Categoria
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar categorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        {category._count?.products || 0} produto{(category._count?.products || 0) !== 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Arredondamento: €{Number(category.roundingStep).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => startEdit(category)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Editar categoria"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Excluir categoria"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria criada'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Tente ajustar os termos de busca' 
                : 'Comece criando sua primeira categoria para organizar os produtos'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setOpenCreate(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Criar Primeira Categoria
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(openCreate || editing) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editing ? 'Editar Categoria' : 'Nova Categoria'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {editing ? 'Atualize as informações da categoria' : 'Configure as informações da nova categoria'}
                  </p>
                </div>
                <button 
                  onClick={editing ? cancelEdit : () => setOpenCreate(false)}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Cartões de Visita, Flyers, Banners"
                />
                <p className="text-xs text-gray-500 mt-1">Nome que aparecerá na lista de produtos</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arredondamento (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.roundingStep}
                  onChange={(e) => setFormData({...formData, roundingStep: parseFloat(e.target.value) || 0})}
                  placeholder="0.05"
                />
                <p className="text-xs text-gray-500 mt-1">Valor para arredondar preços (ex: 0.05 = €0.05)</p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end gap-3">
                <button 
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={editing ? cancelEdit : () => setOpenCreate(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={editing ? () => updateCategory(editing.id) : createCategory}
                >
                  {editing ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
