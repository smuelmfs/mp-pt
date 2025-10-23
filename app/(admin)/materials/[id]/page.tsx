"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function MaterialDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // formulário de variante
  const [vf, setVf] = useState<any>({
    label: "",
    gramagem: "",
    widthMm: "",
    heightMm: "",
    sheetsPerPack: "",
    packPrice: "",
    unitPrice: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/materials/${id}`);
    const json = await res.json();
    setRow(json);
    setLoading(false);
  }

  useEffect(() => {
    if (Number.isFinite(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function patch(patch: any) {
    await fetch(`/api/admin/materials/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  async function addVariant() {
    if (!vf.label) {
      alert("Informe o rótulo da variante.");
      return;
    }
    const body: any = {
      materialId: id,
      label: vf.label,
      gramagem: vf.gramagem ? Number(vf.gramagem) : null,
      widthMm: vf.widthMm ? Number(vf.widthMm) : null,
      heightMm: vf.heightMm ? Number(vf.heightMm) : null,
      sheetsPerPack: vf.sheetsPerPack ? Number(vf.sheetsPerPack) : null,
      packPrice: vf.packPrice || null,
      unitPrice: vf.unitPrice || null,
    };
    const res = await fetch(`/api/admin/material-variants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setVf({ label: "", gramagem: "", widthMm: "", heightMm: "", sheetsPerPack: "", packPrice: "", unitPrice: "" });
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      alert("Erro: " + (j.error?.message || "Falha ao criar variante"));
    }
  }

  if (!Number.isFinite(id)) return <main className="p-6 text-red-600">ID inválido</main>;
  if (loading) return <main className="p-6">Carregando…</main>;
  if (row?.error) return <main className="p-6 text-red-600">{row.error}</main>;

  const variants = Array.isArray(row?.variants) ? row.variants : [];

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 👇 volta para /materials (sem /admin) */}
      <Link href="/materials" className="text-blue-600 underline">
        ← Voltar
      </Link>

      <h1 className="text-2xl font-semibold">Material #{row.id}</h1>

      {/* Básico */}
      <section className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm">Nome</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.name}
              onBlur={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Tipo</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.type}
              onBlur={(e) => patch({ type: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Unidade</label>
            <select
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.unit}
              onChange={(e) => patch({ unit: e.target.value })}
            >
              <option>UNIT</option>
              <option>M2</option>
              <option>LOT</option>
              <option>HOUR</option>
              <option>SHEET</option>
            </select>
          </div>
          <div>
            <label className="block text-sm">Custo unitário</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.unitCost}
              onBlur={(e) => patch({ unitCost: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              defaultChecked={row.active}
              onChange={(e) => patch({ active: e.target.checked })}
            />
            <span className="text-sm">Ativo</span>
          </div>
        </div>
      </section>

      {/* Variantes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Variantes</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">#</th>
                <th className="py-2">Label</th>
                <th className="py-2">Gramagem</th>
                <th className="py-2">Largura (mm)</th>
                <th className="py-2">Altura (mm)</th>
                <th className="py-2">Pack (folhas)</th>
                <th className="py-2">Pack €</th>
                <th className="py-2">Unit €</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v: any) => (
                <tr key={v.id} className="border-b">
                  <td className="py-2">{v.id}</td>
                  <td className="py-2">{v.label}</td>
                  <td className="py-2">{v.gramagem ?? "-"}</td>
                  <td className="py-2">{v.widthMm ?? "-"}</td>
                  <td className="py-2">{v.heightMm ?? "-"}</td>
                  <td className="py-2">{v.sheetsPerPack ?? "-"}</td>
                  <td className="py-2">{v.packPrice ?? "-"}</td>
                  <td className="py-2">{v.unitPrice ?? "-"}</td>
                </tr>
              ))}
              {!variants.length && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Sem variantes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border rounded-xl p-4">
          <h3 className="font-medium mb-3">Adicionar variante</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm">Label</label>
              <input
                className="border px-3 py-2 rounded w-full"
                value={vf.label}
                onChange={(e) => setVf((s: any) => ({ ...s, label: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm">Gramagem</label>
              <input
                className="border px-3 py-2 rounded w-full"
                value={vf.gramagem}
                onChange={(e) => setVf((s: any) => ({ ...s, gramagem: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm">Largura (mm)</label>
              <input
                className="border px-3 py-2 rounded w-full"
                value={vf.widthMm}
                onChange={(e) => setVf((s: any) => ({ ...s, widthMm: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm">Altura (mm)</label>
              <input
                className="border px-3 py-2 rounded w-full"
                value={vf.heightMm}
                onChange={(e) => setVf((s: any) => ({ ...s, heightMm: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm">Pack (folhas)</label>
              <input
                className="border px-3 py-2 rounded w-full"
                value={vf.sheetsPerPack}
                onChange={(e) => setVf((s: any) => ({ ...s, sheetsPerPack: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm">Preço Pack (€)</label>
              <input
                className="border px-3 py-2 rounded w-full"
                value={vf.packPrice}
                onChange={(e) => setVf((s: any) => ({ ...s, packPrice: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm">Preço Unit (€)</label>
              <input
                className="border px-3 py-2 rounded w-full"
                value={vf.unitPrice}
                onChange={(e) => setVf((s: any) => ({ ...s, unitPrice: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={addVariant}>
              Adicionar variante
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
