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
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "OUTROS" as Finish["category"],
    unit: "UNIT" as Finish["unit"],
    baseCost: "0.0000",
    calcType: "PER_UNIT" as Finish["calcType"],
    minFee: "",
    marginDefault: "",
    active: true,
  });

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

  async function createFinish() {
    if (!form.name.trim()) return alert("Nome é obrigatório");
    if (!form.baseCost) return alert("Custo base é obrigatório");

    setSaving(true);
    const res = await fetch("/api/admin/finishes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        baseCost: form.baseCost,
        calcType: form.calcType,
        minFee: form.minFee || null,
        marginDefault: form.marginDefault || null,
        active: form.active,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return alert("Erro ao criar: " + (j.error?.message || "verifique os campos"));
    }
    setOpenCreate(false);
    setForm({
      name: "",
      category: "OUTROS",
      unit: "UNIT",
      baseCost: "0.0000",
      calcType: "PER_UNIT",
      minFee: "",
      marginDefault: "",
      active: true,
    });
    load();
  }

  const categoryLabels = {
    LAMINACAO: "Laminação",
    VERNIZ: "Verniz",
    CORTE: "Corte",
    DOBRA: "Dobra",
    OUTROS: "Outros"
  };

  const categoryColors = {
    LAMINACAO: "bg-gray-100 text-gray-800",
    VERNIZ: "bg-gray-100 text-gray-800",
    CORTE: "bg-gray-100 text-gray-800",
    DOBRA: "bg-gray-100 text-gray-800",
    OUTROS: "bg-gray-100 text-gray-800"
  };

  const unitLabels = {
    UNIT: "Unidade",
    M2: "Metro Quadrado",
    LOT: "Lote",
    HOUR: "Hora",
    SHEET: "Folha"
  };

  const calcTypeLabels = {
    PER_UNIT: "Por Unidade",
    PER_M2: "Por M²",
    PER_LOT: "Por Lote",
    PER_HOUR: "Por Hora"
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-36 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Acabamentos</h1>
              <p className="text-gray-600 mt-2">Configure os acabamentos disponíveis para os produtos</p>
            </div>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Novo Acabamento
          </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Finishes Grid */}
        {rows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((finish) => (
              <div key={finish.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categoryColors[finish.category]}`}>
                        {categoryLabels[finish.category]}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        finish.active ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {finish.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{finish.name}</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Custo Base</span>
                      <p className="font-semibold text-gray-900">€{Number(finish.baseCost).toFixed(4)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Unidade</span>
                      <p className="font-semibold text-gray-900">{unitLabels[finish.unit]}</p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs text-gray-500">Tipo de Cálculo</span>
                    <p className="font-semibold text-gray-900">{calcTypeLabels[finish.calcType]}</p>
                  </div>

                  {finish.minFee && (
                    <div>
                      <span className="text-xs text-gray-500">Taxa Mínima</span>
                      <p className="font-semibold text-gray-900">€{finish.minFee}</p>
                    </div>
                  )}

                  {finish.marginDefault && (
                    <div>
                      <span className="text-xs text-gray-500">Margem Padrão</span>
                      <p className="font-semibold text-gray-900">{(Number(finish.marginDefault) * 100).toFixed(1)}%</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link 
                    href={`/finishes/${finish.id}`}
                    className="inline-flex items-center text-sm font-medium text-black hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver Detalhes
                    </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum acabamento configurado</h3>
            <p className="text-gray-600 mb-6">
              Comece criando seu primeiro acabamento para usar nos produtos
            </p>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Criar Primeiro Acabamento
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {openCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Novo Acabamento</h2>
                  <p className="text-sm text-gray-600 mt-1">Configure um novo acabamento</p>
                </div>
                <button 
                  onClick={() => setOpenCreate(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Acabamento
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Ex: Laminação Fosca, Verniz UV"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.category}
                    onChange={(e) => setForm({...form, category: e.target.value as Finish["category"]})}
                  >
                    <option value="LAMINACAO">Laminação</option>
                    <option value="VERNIZ">Verniz</option>
                    <option value="CORTE">Corte</option>
                    <option value="DOBRA">Dobra</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidade
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.unit}
                    onChange={(e) => setForm({...form, unit: e.target.value as Finish["unit"]})}
                  >
                    <option value="UNIT">Unidade</option>
                    <option value="M2">Metro Quadrado</option>
                    <option value="LOT">Lote</option>
                    <option value="HOUR">Hora</option>
                    <option value="SHEET">Folha</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custo Base (€)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.baseCost}
                    onChange={(e) => setForm({...form, baseCost: e.target.value})}
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Cálculo
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.calcType}
                    onChange={(e) => setForm({...form, calcType: e.target.value as Finish["calcType"]})}
                  >
                    <option value="PER_UNIT">Por Unidade</option>
                    <option value="PER_M2">Por M²</option>
                    <option value="PER_LOT">Por Lote</option>
                    <option value="PER_HOUR">Por Hora</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taxa Mínima (€) - Opcional
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.minFee}
                    onChange={(e) => setForm({...form, minFee: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Margem Padrão (%) - Opcional
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    value={form.marginDefault}
                    onChange={(e) => setForm({...form, marginDefault: e.target.value})}
                    placeholder="15.00"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm({...form, active: e.target.checked})}
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm font-medium text-gray-700">
                  Acabamento ativo
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end gap-3">
                <button 
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenCreate(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  onClick={createFinish}
                  disabled={saving}
                >
                  {saving ? 'Criando...' : 'Criar Acabamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
