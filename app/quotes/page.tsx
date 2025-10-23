"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Product = { id: number; name: string };
type QuoteRow = {
  id: number; number: string; finalPrice: string;
  product?: { id: number; name: string } | null;
  createdAt: string;
};

function money(n: number | string | null | undefined) {
  const v = typeof n === "number" ? n : Number(n || 0);
  return `€ ${v.toFixed(2)}`;
}

export default function QuotesPage() {
  // criação rápida
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<number | "">("");
  const [qty, setQty] = useState<number>(1000);
  const [preview, setPreview] = useState<any>(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // lista
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  async function loadProducts() {
    const res = await fetch("/api/products");
    const json = await res.json();
    setProducts(Array.isArray(json) ? json : []);
  }

  async function loadQuotes() {
    setLoadingList(true);
    const res = await fetch("/api/quotes");
    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
    setLoadingList(false);
  }

  useEffect(() => {
    loadProducts();
    loadQuotes();
  }, []);

  async function handlePreview() {
    if (!productId) { alert("Selecione um produto."); return; }
    setLoadingPrev(true);
    setSaveMsg(null);
    const res = await fetch("/api/quotes/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: Number(productId), quantity: qty, params: {} }),
    });
    const json = await res.json();
    setPreview(json);
    setLoadingPrev(false);
  }

  async function handleSave() {
    if (!productId) { alert("Selecione um produto."); return; }
    setSaving(true);
    setSaveMsg(null);
    const res = await fetch("/api/quote/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: Number(productId), quantity: qty, params: {} }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setSaveMsg(`Orçamento salvo: ${json.quoteNumber}`);
      setPreview(null);
      loadQuotes();
    } else {
      setSaveMsg(`Erro: ${json.error || "Falha ao salvar"}`);
    }
  }

  const productOptions = useMemo(
    () => products.map(p => <option key={p.id} value={p.id}>{p.name}</option>),
    [products]
  );

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orçamentos</h1>
        <nav className="text-sm flex gap-4">
          <Link className="underline" href="/products">Produtos</Link>
          <Link className="underline" href="/materials">Materiais</Link>
          <Link className="underline" href="/printing">Impressões</Link>
          <Link className="underline" href="/finishes">Acabamentos</Link>
          <Link className="underline" href="/margins">Margens</Link>
        </nav>
      </div>

      {/* Criar orçamento */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Novo orçamento</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm">Produto</label>
            <select
              className="border px-3 py-2 rounded w-full"
              value={productId}
              onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">-- selecione --</option>
              {productOptions}
            </select>
          </div>
          <div>
            <label className="block text-sm">Quantidade</label>
            <input
              type="number"
              className="border px-3 py-2 rounded w-full"
              value={qty}
              min={1}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
            />
          </div>
          <div className="flex items-end gap-2">
            <button className="px-4 py-2 rounded border" onClick={handlePreview} disabled={loadingPrev}>
              {loadingPrev ? "Calculando…" : "Preview"}
            </button>
            <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={handleSave} disabled={saving || !productId}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>

        {saveMsg && <div className="text-sm">{saveMsg}</div>}

        {preview && !preview.error && (
          <div className="grid grid-cols-3 gap-6 mt-4">
            <div className="border rounded-xl p-4 space-y-2">
              <div className="text-sm text-gray-500">Subtotal</div>
              <div className="text-xl font-semibold">{money(preview.subtotal)}</div>
              <div className="text-sm">Materiais: {money(preview.costMat)}</div>
              <div className="text-sm">Impressão: {money(preview.costPrint)}</div>
              <div className="text-sm">Acabamentos: {money(preview.costFinish)}</div>
            </div>
            <div className="border rounded-xl p-4 space-y-2">
              <div className="text-sm text-gray-500">Regras</div>
              <div className="text-sm">Markup: {(preview.markup * 100).toFixed(1)}%</div>
              <div className="text-sm">Margem fixa: {(preview.margin * 100).toFixed(1)}%</div>
              <div className="text-sm">Dinâmica: {(preview.dynamic * 100).toFixed(1)}%</div>
              <div className="text-sm">Arredondamento: step {preview.step}</div>
            </div>
            <div className="border rounded-xl p-4 space-y-2">
              <div className="text-sm text-gray-500">Preço final</div>
              <div className="text-2xl font-bold">{money(preview.finalPrice)}</div>
            </div>
          </div>
        )}

        {preview?.error && (
          <div className="text-red-600 mt-2">Erro: {String(preview.error)}</div>
        )}
      </section>

      {/* Lista de orçamentos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Orçamentos recentes</h2>
          <button className="px-3 py-2 rounded border" onClick={loadQuotes}>Atualizar</button>
        </div>

        {loadingList ? (
          <div>Carregando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">#</th>
                  <th className="py-2">Nº</th>
                  <th className="py-2">Produto</th>
                  <th className="py-2">Valor</th>
                  <th className="py-2">Criado em</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.id} className="border-b">
                    <td className="py-2">{q.id}</td>
                    <td className="py-2">{q.number}</td>
                    <td className="py-2">{q.product?.name ?? "-"}</td>
                    <td className="py-2">{money(q.finalPrice)}</td>
                    <td className="py-2">{new Date(q.createdAt).toLocaleString()}</td>
                    <td className="py-2">
                      <Link href={`/quotes/${q.id}`} className="px-3 py-1 rounded border inline-block">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">Sem orçamentos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
