"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/customers");
    const j = await res.json();
    setRows(Array.isArray(j) ? j : []);
    setLoading(false);
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
        setForm({ name: "", email: "", taxId: "", groupId: "", isActive: true });
        load();
      } else {
        const j = await res.json();
        toast.error(j.error || "Falha ao criar cliente");
      }
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, []);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return rows.slice(start, end);
  }, [rows, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(rows.length / itemsPerPage);

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#341601]">Clientes</h1>
              <p className="text-gray-600 mt-2">Gerencie clientes e preços específicos por cliente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Novo Cliente */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#341601]">Novo Cliente</h2>
            <Button onClick={createCustomer} disabled={saving}>
              {saving ? "Salvando..." : "Criar Cliente"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label className="mb-2">Nome *</Label>
              <Input 
                placeholder="Nome" 
                value={form.name} 
                onChange={e=>setForm({...form,name:e.target.value.toUpperCase()})} 
                style={{ textTransform: "uppercase" }}
              />
            </div>
            <div>
              <Label className="mb-2">Email</Label>
              <Input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
            </div>
            <div>
              <Label className="mb-2">Tax ID</Label>
              <Input placeholder="NIF/NIPC" value={form.taxId} onChange={e=>setForm({...form,taxId:e.target.value})} />
            </div>
            <div>
              <Label className="mb-2">Grupo (ID opcional)</Label>
              <Input placeholder="ID do grupo" value={form.groupId} onChange={e=>setForm({...form,groupId:e.target.value})} />
            </div>
            <div className="flex items-center gap-3 mt-7">
              <Checkbox checked={form.isActive} onCheckedChange={(v)=>setForm({...form,isActive:!!v})} />
              <span className="text-sm text-[#341601]">Ativo</span>
            </div>
          </div>
        </div>

        {/* Lista de Clientes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-6">Carregando…</div>
          ) : (
            <>
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
                  {rows.length > 0 ? (
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <h3 className="text-lg font-medium text-[#341601] mb-2">Nenhum cliente encontrado</h3>
                          <p className="text-gray-600">Comece criando seu primeiro cliente</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {rows.length > 0 && (
                <div className="border-t border-gray-200">
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
              )}
            </>
          )}
        </div>

      </div>
    </main>
  );
}

