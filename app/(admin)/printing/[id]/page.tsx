"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PrintingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/printing/${id}`);
    const json = await res.json();
    setRow(json);
    setLoading(false);
  }

  useEffect(() => {
    if (Number.isFinite(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function patch(patch: any) {
    await fetch(`/api/admin/printing/${id}`, {
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
      <Link href="/printing" className="text-blue-600 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Impressão #{row.id}</h1>

      <section className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm">Tecnologia</label>
            <select
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.technology}
              onChange={(e) => patch({ technology: e.target.value })}
            >
              <option>OFFSET</option>
              <option>DIGITAL</option>
              <option>UV</option>
              <option>GRANDE_FORMATO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm">Formato</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.formatLabel ?? ""}
              onBlur={(e) => patch({ formatLabel: e.target.value || null })}
            />
          </div>
          <div>
            <label className="block text-sm">Cores</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.colors ?? ""}
              onBlur={(e) => patch({ colors: e.target.value || null })}
            />
          </div>
          <div>
            <label className="block text-sm">Lados</label>
            <input
              className="border px-3 py-2 rounded w-full"
              type="number"
              defaultValue={row.sides ?? ""}
              onBlur={(e) => {
                const v = Number(e.target.value);
                patch({ sides: Number.isFinite(v) ? v : null });
              }}
            />
          </div>
          <div>
            <label className="block text-sm">Preço unidade</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.unitPrice}
              onBlur={(e) => patch({ unitPrice: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Rendimento (yield)</label>
            <input
              className="border px-3 py-2 rounded w-full"
              type="number"
              defaultValue={row.yield ?? ""}
              onBlur={(e) => {
                const v = Number(e.target.value);
                patch({ yield: Number.isFinite(v) ? v : null });
              }}
            />
          </div>
          <div>
            <label className="block text-sm">Setup (min)</label>
            <input
              className="border px-3 py-2 rounded w-full"
              type="number"
              defaultValue={row.setupMinutes ?? ""}
              onBlur={(e) => {
                const v = Number(e.target.value);
                patch({ setupMinutes: Number.isFinite(v) ? v : null });
              }}
            />
          </div>
          <div>
            <label className="block text-sm">Min Fee</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.minFee ?? ""}
              onBlur={(e) => patch({ minFee: e.target.value || null })}
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
