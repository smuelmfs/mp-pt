"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

function money(n: number | string | null | undefined) {
  const v = typeof n === "number" ? n : Number(n || 0);
  return `€ ${v.toFixed(2)}`;
}

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/quotes/${id}`);
    const json = await res.json();
    setRow(json);
    setLoading(false);
  }

  useEffect(() => {
    if (Number.isFinite(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!Number.isFinite(id)) return <main className="p-6 text-red-600">ID inválido</main>;
  if (loading) return <main className="p-6">Carregando…</main>;
  if (row?.error) return <main className="p-6 text-red-600">{row.error}</main>;

  const items = Array.isArray(row.items) ? row.items : [];

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/quotes" className="text-blue-600 underline">← Voltar</Link>
        <button className="px-3 py-1 rounded border" onClick={() => window.print()}>Imprimir/PDF</button>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Orçamento {row.number}</h1>
        <div className="text-sm text-gray-600">
          Produto: <b>{row.product?.name ?? "-"}</b> • Qtd: <b>{row.quantity}</b> • Criado em: {new Date(row.createdAt).toLocaleString()}
        </div>
      </header>

      <section className="grid grid-cols-3 gap-6">
        <div className="border rounded-xl p-4 space-y-1">
          <div className="text-sm text-gray-500">Subtotal</div>
          <div className="text-xl font-semibold">{money(row.subtotal)}</div>
          <div className="text-sm">Markup: {(Number(row.markupApplied) * 100).toFixed(1)}%</div>
          <div className="text-sm">Margem: {(Number(row.marginApplied) * 100).toFixed(1)}%</div>
          <div className="text-sm">Dinâmica: {(Number(row.dynamicAdjust) * 100).toFixed(1)}%</div>
        </div>
        <div className="border rounded-xl p-4 space-y-1">
          <div className="text-sm text-gray-500">Preço Final</div>
          <div className="text-2xl font-bold">{money(row.finalPrice)}</div>
        </div>
        <div className="border rounded-xl p-4 text-sm">
          <div className="text-gray-500 mb-1">Notas</div>
          <div>Nº: {row.number}</div>
          <div>User: {row.user?.name ?? "—"}</div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Detalhamento</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Tipo</th>
                <th className="py-2">Nome</th>
                <th className="py-2">Qtd</th>
                <th className="py-2">Unid</th>
                <th className="py-2">Custo un.</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any) => (
                <tr key={it.id} className="border-b">
                  <td className="py-2">{it.itemType}</td>
                  <td className="py-2">{it.name}</td>
                  <td className="py-2">{it.quantity ?? "-"}</td>
                  <td className="py-2">{it.unit ?? "-"}</td>
                  <td className="py-2">{it.unitCost ?? "-"}</td>
                  <td className="py-2">{it.totalCost ?? "-"}</td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">Sem itens</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
