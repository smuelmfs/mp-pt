"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { markStepComplete } from "@/lib/admin-progress";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CustomersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({ name: "", email: "", taxId: "", groupId: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all"|"active"|"inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  async function load() {
    setLoading(true);
    try {
    const res = await fetch("/api/admin/customers");
      if (!res.ok) {
        throw new Error("Erro ao carregar clientes");
      }
      const text = await res.text();
      const j = text ? JSON.parse(text) : [];
    setRows(Array.isArray(j) ? j : []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setRows([]);
    } finally {
    setLoading(false);
    }
  }

  async function createCustomer() {
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    try {
      setSaving(true);
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email || null,
          taxId: form.taxId || null,
          groupId: form.groupId ? Number(form.groupId) : null,
          isActive: !!form.isActive,
        }),
      });
      if (res.ok) {
        toast.success("Cliente criado com sucesso");
        markStepComplete('customers');
        setForm({ name: "", email: "", taxId: "", groupId: "", isActive: true });
        setOpenCreate(false);
        load();
      } else {
        const errorData = await res.json().catch(() => ({}));
        // Extrai mensagem de erro do objeto Zod ou erro genérico
        let errorMessage = "Falha ao criar cliente";
        
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
        
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = useMemo(() => {
    let list = rows.slice();
    if (activeFilter !== "all") list = list.filter(r => activeFilter === "active" ? r.isActive : !r.isActive);
    if (debouncedQ) {
      const term = debouncedQ.toLowerCase();
      list = list.filter(r =>
        String(r.name || "").toLowerCase().includes(term) ||
        String(r.email || "").toLowerCase().includes(term) ||
        String(r.taxId || "").toLowerCase().includes(term)
      );
    }
    return list;
  }, [rows, activeFilter, debouncedQ]);

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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#341601]">Clientes</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">Gerencie clientes e preços específicos por cliente</p>
            </div>
            <button
              onClick={()=> setOpenCreate(true)}
              className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-[#F66807] text-white text-sm sm:text-base rounded-lg hover:bg-[#F66807]/90 transition-colors font-medium w-full sm:w-auto"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">Novo Cliente</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Filtros */}
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
                placeholder="Buscar clientes (nome, email, NIF)..."
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
        </div>

        {/* Lista de Clientes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mt-4">
          {loading ? (
            <div className="py-10 text-center text-gray-500">Carregando…</div>
          ) : (
            <div className="mt-2 sm:mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F6EEE8]">
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>NIF</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? (
                    <>
                      {paginatedItems.map((c:any)=> (
                      <TableRow key={c.id}>
                        <TableCell>{c.id}</TableCell>
                        <TableCell className="uppercase font-medium">{c.name}</TableCell>
                        <TableCell>{c.email || "-"}</TableCell>
                        <TableCell>{c.taxId || "-"}</TableCell>
                        <TableCell>{c.groupId || "-"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            c.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {c.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/customers/${c.id}`}
                            className="p-2 text-gray-400 hover:text-[#F66807] transition-colors inline-flex"
                            title="Editar cliente"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        </TableCell>
                      </TableRow>
                      ))}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
                          </svg>
                          <h3 className="text-lg font-medium text-[#341601] mb-2">Nenhum cliente encontrado</h3>
                          <p className="text-gray-600">Comece criando seu primeiro cliente</p>
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

        {/* Modal Criar Cliente */}
        {openCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#341601]">Novo Cliente</h2>
                  <p className="text-sm text-gray-600 mt-1">Cadastre um cliente</p>
                </div>
                <button onClick={()=> setOpenCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#341601] mb-2">Nome *</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                    placeholder="Nome"
                    value={form.name}
                    onChange={(e)=> setForm({...form, name: e.target.value.toUpperCase()})}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">Email</label>
                    <input
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      placeholder="email@exemplo.com"
                      value={form.email}
                      onChange={(e)=> setForm({...form, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">NIF/NIPC</label>
                    <input
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      placeholder="NIF/NIPC"
                      value={form.taxId}
                      onChange={(e)=> setForm({...form, taxId: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">Grupo (ID opcional)</label>
                    <input
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      placeholder="ID do grupo"
                      value={form.groupId}
                      onChange={(e)=> setForm({...form, groupId: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="checkbox"
                      id="active"
                      checked={form.isActive}
                      onChange={(e)=> setForm({...form, isActive: e.target.checked})}
                      className="h-4 w-4 text-[#F66807] focus:ring-[#F66807] border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-[#341601]">Ativo</label>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button onClick={()=> setOpenCreate(false)} className="px-6 py-3 border border-gray-300 text-[#341601] rounded-lg hover:bg-white transition-colors">Cancelar</button>
                <button onClick={createCustomer} disabled={saving} className="px-6 py-3 bg-[#F66807] text-white rounded-lg hover:bg-[#F66807]/90 disabled:opacity-50 transition-colors font-medium">{saving? 'Salvando…':'Criar Cliente'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

