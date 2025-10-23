"use client";
import { useState } from "react";

export default function Home() {
  const [productId, setProductId] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(1000);
  const [loading, setLoading] = useState(false);
  const [resData, setResData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<any>(null);

  async function calc() {
    setLoading(true); setErr(null); setResData(null); setSaved(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha no cálculo");
      setResData(json);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!resData) return;
    setSaving(true); setErr(null); setSaved(null);
    try {
      const res = await fetch("/api/quote/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao salvar");
      setSaved(json);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Simulador de Orçamento</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Product ID</label>
          <input
            type="number"
            value={productId}
            onChange={(e) => setProductId(parseInt(e.target.value || "0"))}
            className="border px-3 py-2 rounded w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Quantidade</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value || "0"))}
            className="border px-3 py-2 rounded w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={calc}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Calculando..." : "Calcular"}
        </button>

        <button
          onClick={save}
          disabled={!resData || saving}
          className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar orçamento"}
        </button>
      </div>

      {err && <p className="text-red-600">{err}</p>}

      {resData && (
        <>
          <h2 className="text-lg font-semibold">Resultado</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{JSON.stringify(resData, null, 2)}
          </pre>
        </>
      )}

      {saved && (
        <>
          <h2 className="text-lg font-semibold">Orçamento salvo</h2>
          <pre className="bg-green-50 p-4 rounded text-sm overflow-x-auto">
{JSON.stringify(saved, null, 2)}
          </pre>
        </>
      )}
    </main>
  );
}
