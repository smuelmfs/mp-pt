"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Material = {
  id: number;
  name: string;
  type: string;
  unit: "UNIT" | "M2" | "LOT" | "HOUR" | "SHEET";
  unitCost: string;
  active: boolean;
};

export default function MaterialsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // modal
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "",
    unit: "UNIT" as Material["unit"],
    unitCost: "0.0000",
    active: true,
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/materials?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function createMaterial() {
    if (!form.name.trim()) return alert("Informe o nome.");
    if (!form.unitCost) return alert("Informe o custo unitário.");
    setSaving(true);
    const res = await fetch("/api/admin/materials", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        type: form.type.trim() || "outro",
        unit: form.unit,
        unitCost: form.unitCost,
        active: form.active,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return alert("Erro ao criar: " + (j.error?.message || "verifique os campos"));
    }
    setOpen(false);
    setForm({ name: "", type: "", unit: "UNIT", unitCost: "0.0000", active: true });
    load();
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Materiais</h1>
        <div className="flex gap-2">
          <Input
            className="w-56"
            placeholder="Pesquisar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="outline" onClick={load}>Buscar</Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-600/90">Novo material</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo material</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="col-span-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))} placeholder="Ex.: Couché" />
                </div>
                <div className="col-span-2">
                  <Label>Tipo</Label>
                  <Input value={form.type} onChange={(e)=>setForm(f=>({...f, type:e.target.value}))} placeholder='Ex.: "papel", "vinil", "pvc"' />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select value={form.unit} onValueChange={(v)=>setForm(f=>({...f, unit: v as any}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNIT">UNIT</SelectItem>
                      <SelectItem value="M2">M2</SelectItem>
                      <SelectItem value="LOT">LOT</SelectItem>
                      <SelectItem value="HOUR">HOUR</SelectItem>
                      <SelectItem value="SHEET">SHEET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Custo unitário (€)</Label>
                  <Input value={form.unitCost} onChange={(e)=>setForm(f=>({...f, unitCost:e.target.value}))} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={(v)=>setForm(f=>({...f, active:v}))} />
                  <Label>Ativo</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button>
                <Button onClick={createMaterial} disabled={saving}>
                  {saving ? "Salvando…" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div>Carregando…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">#</th>
                <th className="py-2">Nome</th>
                <th className="py-2">Tipo</th>
                <th className="py-2">Unid</th>
                <th className="py-2">Custo</th>
                <th className="py-2">Ativo</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="py-2">{m.id}</td>
                  <td className="py-2">{m.name}</td>
                  <td className="py-2">{m.type}</td>
                  <td className="py-2">{m.unit}</td>
                  <td className="py-2">{Number(m.unitCost).toFixed(4)}</td>
                  <td className="py-2">{m.active ? "Sim" : "Não"}</td>
                  <td className="py-2">
                    <Link href={`/materials/${m.id}`} className="px-3 py-1 rounded border inline-block">
                      Detalhe
                    </Link>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Nenhum material encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
