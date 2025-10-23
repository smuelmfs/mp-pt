"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function FinishDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/finishes/${id}`);
    const json = await res.json();
    setRow(json);
    setLoading(false);
  }

  useEffect(() => {
    if (Number.isFinite(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function patch(patch: any) {
    await fetch(`/api/admin/finishes/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  if (!Number.isFinite(id)) return <main className="p-6 text-red-600">ID inválido</main>;
  if (loading) return <main className="p-6">Carregando…</main>;
  if (row?.error) return <main className="p-6 text-red-600">{row.error}</main>;

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/finishes" className="text-blue-600 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Acabamento #{row.id}</h1>

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
            <label className="block text-sm">Categoria</label>
            <select
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.category}
              onChange={(e) => patch({ category: e.target.value })}
            >
              <option>LAMINACAO</option>
              <option>VERNIZ</option>
              <option>CORTE</option>
              <option>DOBRA</option>
              <option>OUTROS</option>
            </select>
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
            <label className="block text-sm">Custo base</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.baseCost}
              onBlur={(e) => patch({ baseCost: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Margem default (opcional)</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.marginDefault ?? ""}
              onBlur={(e) => patch({ marginDefault: e.target.value || null })}
            />
          </div>
          <div>
            <label className="block text-sm">Tipo cálculo</label>
            <select
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.calcType}
              onChange={(e) => patch({ calcType: e.target.value })}
            >
              <option>PER_UNIT</option>
              <option>PER_M2</option>
              <option>PER_LOT</option>
              <option>PER_HOUR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm">Min Fee</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.minFee ?? ""}
              onBlur={(e) => patch({ minFee: e.target.value || null })}
            />
          </div>
          <div>
            <label className="block text-sm">Area step (m²)</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.areaStepM2 ?? ""}
              onBlur={(e) => patch({ areaStepM2: e.target.value || null })}
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
    </main>
  );
}
