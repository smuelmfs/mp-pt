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
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Orçamentos</h1>
            <p className="text-slate-600 mt-2">Crie e gerencie orçamentos para seus clientes</p>
          </div>
        </div>

      {/* Criar orçamento */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Novo orçamento</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Produto</label>
            <select
              className="border border-slate-300 px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              value={productId}
              onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">-- selecione --</option>
              {productOptions}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Quantidade</label>
            <input
              type="number"
              className="border border-slate-300 px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              value={qty}
              min={1}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
            />
          </div>
          <div className="flex items-end gap-2">
            <button className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors" onClick={handlePreview} disabled={loadingPrev}>
              {loadingPrev ? "Calculando…" : "Preview"}
            </button>
            <button className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors" onClick={handleSave} disabled={saving || !productId}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>

        {saveMsg && <div className="text-sm">{saveMsg}</div>}

        {preview && !preview.error && (
          <div className="grid grid-cols-3 gap-6 mt-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="text-sm text-slate-500">Subtotal</div>
              <div className="text-xl font-semibold text-slate-900">{money(preview.subtotal)}</div>
              <div className="text-sm text-slate-600">Materiais: {money(preview.costMat)}</div>
              <div className="text-sm text-slate-600">Impressão: {money(preview.costPrint)}</div>
              <div className="text-sm text-slate-600">Acabamentos: {money(preview.costFinish)}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="text-sm text-slate-500">Regras</div>
              <div className="text-sm text-slate-600">Markup: {(preview.markup * 100).toFixed(1)}%</div>
              <div className="text-sm text-slate-600">Margem fixa: {(preview.margin * 100).toFixed(1)}%</div>
              <div className="text-sm text-slate-600">Dinâmica: {(preview.dynamic * 100).toFixed(1)}%</div>
              <div className="text-sm text-slate-600">Arredondamento: step {preview.step}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="text-sm text-slate-500">Preço final</div>
              <div className="text-2xl font-bold text-slate-900">{money(preview.finalPrice)}</div>
            </div>
          </div>
        )}

        {preview?.error && (
          <div className="text-red-600 mt-2">Erro: {String(preview.error)}</div>
        )}
      </section>

      {/* Lista de orçamentos */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Orçamentos recentes</h2>
          <button className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors" onClick={loadQuotes}>Atualizar</button>
        </div>

        {loadingList ? (
          <div className="text-slate-600">Carregando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-3 text-slate-700 font-medium">#</th>
                  <th className="py-3 text-slate-700 font-medium">Nº</th>
                  <th className="py-3 text-slate-700 font-medium">Produto</th>
                  <th className="py-3 text-slate-700 font-medium">Valor</th>
                  <th className="py-3 text-slate-700 font-medium">Criado em</th>
                  <th className="py-3 text-slate-700 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 text-slate-600">{q.id}</td>
                    <td className="py-3 text-slate-600">{q.number}</td>
                    <td className="py-3 text-slate-600">{q.product?.name ?? "-"}</td>
                    <td className="py-3 text-slate-900 font-medium">{money(q.finalPrice)}</td>
                    <td className="py-3 text-slate-600">{new Date(q.createdAt).toLocaleString()}</td>
                    <td className="py-3">
                      <Link href={`/quotes/${q.id}`} className="px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors inline-block">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500">Sem orçamentos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </main>
  );
}
