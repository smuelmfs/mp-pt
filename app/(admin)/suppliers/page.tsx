"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { markStepComplete } from "@/lib/admin-progress";
import { SimplePagination } from "@/components/ui/simple-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Supplier = { id: number; name: string; active: boolean };

export default function SuppliersPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all"|"active"|"inactive">("all");
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQ) params.append("q", debouncedQ);
    if (activeFilter === "active") params.append("activeOnly", "1");
    const res = await fetch(`/api/admin/suppliers?${params.toString()}`);
    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
    setLoading(false);
  }

  useEffect(()=>{
    const t = setTimeout(()=> setDebouncedQ(q.trim()), 300);
    return ()=> clearTimeout(t);
  }, [q]);

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [debouncedQ, activeFilter]);

  async function createSupplier() {
    if (!formName.trim()) {
      toast.error("Informe o nome do fornecedor.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: formName.trim() })
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        const errorData = j;
        // Extrai mensagem de erro do objeto Zod ou erro genérico
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
      toast.success("Fornecedor criado com sucesso!");
      markStepComplete('suppliers');
      setOpenCreate(false);
      setFormName("");
      load();
    } catch (error) {
      toast.error("Erro ao criar fornecedor");
    } finally {
      setSaving(false);
    }
  }

  async function updateSupplier(id: number, patch: Partial<Supplier>) {
    await fetch(`/api/admin/suppliers/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  async function deleteSupplier(id: number) {
    const supplier = rows.find(s => s.id === id);
    setConfirmDelete({ id, name: supplier?.name || "este fornecedor" });
  }

  async function confirmDeleteSupplier() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${confirmDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Fornecedor desativado com sucesso!");
        load();
      } else {
        toast.error("Erro ao desativar fornecedor");
      }
    } catch (error) {
      toast.error("Erro ao desativar fornecedor");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  const filtered = useMemo(()=>{
    let list = rows.slice();
    if (activeFilter !== "all") list = list.filter(r=> activeFilter === "active" ? r.active : !r.active);
    return list;
  }, [rows, activeFilter]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filtered.slice(start, end);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, debouncedQ]);

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Confirmar Desativação"
        description={`Tem certeza que deseja desativar o fornecedor "${confirmDelete?.name}"?`}
        confirmText="Desativar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={confirmDeleteSupplier}
        loading={deleting}
      />
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#341601]">Fornecedores</h1>
              <p className="text-gray-600 mt-2">Cadastre, edite e desative fornecedores</p>
            </div>
            <button
              onClick={()=> setOpenCreate(true)}
              className="inline-flex items-center px-6 py-3 bg-[#F66807] text-white rounded-lg hover:bg-[#F66807]/90 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Novo Fornecedor
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </span>
              <input
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                placeholder="Buscar fornecedores..."
                value={q}
                onChange={(e)=> setQ(e.target.value)}
              />
            </div>
            <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]" value={activeFilter} onChange={e=>setActiveFilter(e.target.value as any)}>
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-500">Carregando…</div>
          ) : (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F6EEE8]">
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? (
                    <>
                      {paginatedItems.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{s.id}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            s.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {s.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={()=> updateSupplier(s.id, { active: !s.active })}
                              className="p-2 text-gray-400 hover:text-[#F66807] transition-colors"
                              title={s.active ? 'Desativar' : 'Ativar'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {s.active ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                )}
                              </svg>
                            </button>
                            <button
                              onClick={()=> deleteSupplier(s.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Excluir fornecedor"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                      ))}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <h3 className="text-lg font-medium text-[#341601] mb-2">Nenhum fornecedor encontrado</h3>
                          <p className="text-gray-600">Comece criando seu primeiro fornecedor</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {filtered.length > 0 && (
                <div className="border-t border-gray-200">
                  <SimplePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filtered.length}
                    onItemsPerPageChange={(items) => {
                      setItemsPerPage(items);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {openCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#341601]">Novo Fornecedor</h2>
                  <p className="text-sm text-gray-600 mt-1">Cadastre um fornecedor pelo nome</p>
                </div>
                <button onClick={()=> setOpenCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">Nome</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    placeholder="Ex: INAPA"
                    value={formName}
                    onChange={(e)=> setFormName(e.target.value)}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button onClick={()=> setOpenCreate(false)} className="px-6 py-3 border border-gray-300 text-[#341601] rounded-lg hover:bg-white transition-colors">Cancelar</button>
                <button onClick={createSupplier} disabled={saving} className="px-6 py-3 bg-[#F66807] text-white rounded-lg hover:bg-[#F66807]/90 disabled:opacity-50 transition-colors font-medium">{saving? 'Salvando…':'Salvar'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


