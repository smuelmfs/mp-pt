"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Finish = {
  id: number;
  name: string;
  category: "LAMINACAO" | "VERNIZ" | "CORTE" | "DOBRA" | "OUTROS";
  unit: "UNIT" | "M2" | "LOT" | "HOUR" | "SHEET";
  baseCost: string;
  marginDefault?: string | null;
  calcType: "PER_UNIT" | "PER_M2" | "PER_LOT" | "PER_HOUR";
  minFee?: string | null;
  areaStepM2?: string | null;
  active: boolean;
};

export default function FinishesListPage() {
  const [rows, setRows] = useState<Finish[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/finishes");
    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createQuick() {
    const name = prompt("Nome (ex.: Laminação Fosca)");
    if (!name) return;
    const category = (prompt("Categoria (LAMINACAO, VERNIZ, CORTE, DOBRA, OUTROS)") || "OUTROS").toUpperCase();
    const unit = (prompt("Unidade (UNIT, M2, LOT, HOUR, SHEET)") || "UNIT").toUpperCase();
    const baseCost = prompt('Custo base (ex.: "2.0000")') || "0.0000";
    const calcType = (prompt("Tipo cálculo (PER_UNIT, PER_M2, PER_LOT, PER_HOUR)") || "PER_UNIT").toUpperCase();
    const minFee = prompt('Mínimo (opcional, ex.: "5.00")') || "";
    const marginDefault = prompt('Margem padrão (opcional, ex.: "0.1500")') || "";

    const res = await fetch("/api/admin/finishes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        unit,
        baseCost,
        calcType,
        minFee: minFee || null,
        marginDefault: marginDefault || null,
        active: true,
      }),
    });
    if (res.ok) load();
    else {
      const j = await res.json().catch(() => ({}));
      alert("Erro ao criar: " + (j.error?.message || "verifique os campos"));
    }
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Acabamentos</h1>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded border" onClick={load}>Atualizar</button>
          <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={createQuick}>
            Novo acabamento
          </button>
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
                <th className="py-2">Categoria</th>
                <th className="py-2">Unid</th>
                <th className="py-2">Custo base</th>
                <th className="py-2">Tipo calc</th>
                <th className="py-2">Min Fee</th>
                <th className="py-2">Ativo</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="border-b">
                  <td className="py-2">{f.id}</td>
                  <td className="py-2">{f.name}</td>
                  <td className="py-2">{f.category}</td>
                  <td className="py-2">{f.unit}</td>
                  <td className="py-2">{Number(f.baseCost).toFixed(4)}</td>
                  <td className="py-2">{f.calcType}</td>
                  <td className="py-2">{f.minFee ?? "-"}</td>
                  <td className="py-2">{f.active ? "Sim" : "Não"}</td>
                  <td className="py-2">
                    <Link href={`/finishes/${f.id}`} className="px-3 py-1 rounded border inline-block">
                      Detalhe
                    </Link>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">Sem registros</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
