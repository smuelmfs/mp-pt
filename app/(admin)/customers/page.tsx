"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
import { ArrowRight } from "lucide-react";

export default function CustomersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({ name: "", email: "", taxId: "", groupId: "", isActive: true });
  const [saving, setSaving] = useState(false);

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

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
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
            <h2 className="text-xl font-semibold text-gray-900">Novo Cliente</h2>
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
              <span className="text-sm text-gray-700">Ativo</span>
            </div>
          </div>
        </div>

        {/* Lista de Clientes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-6">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c:any)=> (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell className="uppercase font-medium">{c.name}</TableCell>
                    <TableCell>{c.email || "-"}</TableCell>
                    <TableCell>{c.groupId || "-"}</TableCell>
                    <TableCell>{c.isActive?"Sim":"Não"}</TableCell>
                    <TableCell>
                      <Link href={`/customers/${c.id}`}>
                        <Button size="icon" variant="outline" aria-label="Abrir">
                          <ArrowRight className="size-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

      </div>
    </main>
  );
}

