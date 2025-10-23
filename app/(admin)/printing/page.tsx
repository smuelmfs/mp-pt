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

type Printing = {
  id: number;
  technology: "OFFSET" | "DIGITAL" | "UV" | "GRANDE_FORMATO";
  formatLabel?: string | null;
  colors?: string | null;
  sides?: number | null;
  unitPrice: string;
  yield?: number | null;
  setupMinutes?: number | null;
  minFee?: string | null;
  active: boolean;
};

export default function PrintingListPage() {
  const [rows, setRows] = useState<Printing[]>([]);
  const [loading, setLoading] = useState(true);

  // modal
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    technology: "OFFSET" as Printing["technology"],
    formatLabel: "",
    colors: "",
    sides: 1,
    unitPrice: "0.0000",
    yield: 1,
    setupMinutes: 0,
    minFee: "0.00",
    active: true,
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/printing");
    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createPrinting() {
    if (!form.unitPrice) return alert("Informe o preço unidade.");
    setSaving(true);
    const res = await fetch("/api/admin/printing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        technology: form.technology,
        formatLabel: form.formatLabel.trim() || null,
        colors: form.colors.trim() || null,
        sides: Number.isFinite(form.sides as any) ? Number(form.sides) : null,
        unitPrice: form.unitPrice,
        yield: Number.isFinite(form.yield as any) ? Number(form.yield) : null,
        setupMinutes: Number.isFinite(form.setupMinutes as any) ? Number(form.setupMinutes) : null,
        minFee: form.minFee || null,
        active: form.active,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return alert("Erro ao criar: " + (j.error?.message || "verifique os campos"));
    }
    setOpen(false);
    setForm({
      technology: "OFFSET", formatLabel: "", colors: "", sides: 1,
      unitPrice: "0.0000", yield: 1, setupMinutes: 0, minFee: "0.00", active: true
    });
    load();
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Impressões</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>Atualizar</Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-600/90">Nova impressão</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova impressão</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-2">
                <div>
                  <Label>Tecnologia</Label>
                  <Select value={form.technology} onValueChange={(v)=>setForm(f=>({...f, technology: v as any}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OFFSET">OFFSET</SelectItem>
                      <SelectItem value="DIGITAL">DIGITAL</SelectItem>
                      <SelectItem value="UV">UV</SelectItem>
                      <SelectItem value="GRANDE_FORMATO">GRANDE_FORMATO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lados</Label>
                  <Input
                    type="number"
                    value={form.sides}
                    onChange={(e)=>setForm(f=>({...f, sides: Number(e.target.value || 1)}))}
                  />
                </div>
                <div>
                  <Label>Formato/Descrição</Label>
                  <Input value={form.formatLabel} onChange={(e)=>setForm(f=>({...f, formatLabel:e.target.value}))} placeholder='Ex.: "SRA3", "Rolo 1,6m"' />
                </div>
                <div>
                  <Label>Cores</Label>
                  <Input value={form.colors} onChange={(e)=>setForm(f=>({...f, colors:e.target.value}))} placeholder='Ex.: "4x4", "CMYK"' />
                </div>
                <div>
                  <Label>Preço unidade (€)</Label>
                  <Input value={form.unitPrice} onChange={(e)=>setForm(f=>({...f, unitPrice:e.target.value}))} />
                </div>
                <div>
                  <Label>Yield (un/tiro)</Label>
                  <Input type="number" value={form.yield} onChange={(e)=>setForm(f=>({...f, yield:Number(e.target.value||1)}))} />
                </div>
                <div>
                  <Label>Setup (min)</Label>
                  <Input type="number" value={form.setupMinutes} onChange={(e)=>setForm(f=>({...f, setupMinutes:Number(e.target.value||0)}))} />
                </div>
                <div>
                  <Label>Min Fee (€)</Label>
                  <Input value={form.minFee} onChange={(e)=>setForm(f=>({...f, minFee:e.target.value}))} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={(v)=>setForm(f=>({...f, active:v}))} />
                  <Label>Ativo</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button>
                <Button onClick={createPrinting} disabled={saving}>
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
                <th className="py-2">Tecnologia</th>
                <th className="py-2">Formato</th>
                <th className="py-2">Cores</th>
                <th className="py-2">Lados</th>
                <th className="py-2">Preço</th>
                <th className="py-2">Yield</th>
                <th className="py-2">Setup</th>
                <th className="py-2">Min Fee</th>
                <th className="py-2">Ativo</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{p.id}</td>
                  <td className="py-2">{p.technology}</td>
                  <td className="py-2">{p.formatLabel ?? "-"}</td>
                  <td className="py-2">{p.colors ?? "-"}</td>
                  <td className="py-2">{p.sides ?? "-"}</td>
                  <td className="py-2">{Number(p.unitPrice).toFixed(4)}</td>
                  <td className="py-2">{p.yield ?? "-"}</td>
                  <td className="py-2">{p.setupMinutes ?? "-"}</td>
                  <td className="py-2">{p.minFee ?? "-"}</td>
                  <td className="py-2">{p.active ? "Sim" : "Não"}</td>
                  <td className="py-2">
                    <Link href={`/printing/${p.id}`} className="px-3 py-1 rounded border inline-block">
                      Detalhe
                    </Link>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-500">Sem registros</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
