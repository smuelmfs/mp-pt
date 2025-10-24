"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setOpenCreate(false);
    setForm({
      technology: "OFFSET", formatLabel: "", colors: "", sides: 1,
      unitPrice: "0.0000", yield: 1, setupMinutes: 0, minFee: "0.00", active: true
    });
    load();
  }

  const technologyLabels = {
    OFFSET: "Offset",
    DIGITAL: "Digital",
    UV: "UV",
    GRANDE_FORMATO: "Grande Formato"
  };

  const technologyColors = {
    OFFSET: "bg-blue-100 text-blue-800",
    DIGITAL: "bg-green-100 text-green-800",
    UV: "bg-purple-100 text-purple-800",
    GRANDE_FORMATO: "bg-orange-100 text-orange-800"
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Impressões</h1>
              <p className="text-slate-600 mt-2">Configure as tecnologias e métodos de impressão disponíveis</p>
            </div>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nova Impressão
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Printings Grid */}
        {rows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((printing) => (
              <div key={printing.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${technologyColors[printing.technology]}`}>
                        {technologyLabels[printing.technology]}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        printing.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {printing.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {printing.formatLabel || 'Sem formato'}
                    </h3>
                    {printing.colors && (
                      <p className="text-sm text-gray-600 mb-2">{printing.colors}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Preço Unitário</span>
                      <p className="font-semibold text-gray-900">€{Number(printing.unitPrice).toFixed(4)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Lados</span>
                      <p className="font-semibold text-gray-900">{printing.sides || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Yield</span>
                      <p className="font-semibold text-gray-900">{printing.yield || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Setup (min)</span>
                      <p className="font-semibold text-gray-900">{printing.setupMinutes || '-'}</p>
                    </div>
                  </div>

                  {printing.minFee && (
                    <div>
                      <span className="text-xs text-gray-500">Taxa Mínima</span>
                      <p className="font-semibold text-gray-900">€{printing.minFee}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link 
                    href={`/printing/${printing.id}`}
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma impressão configurada</h3>
            <p className="text-gray-600 mb-6">
              Comece criando sua primeira configuração de impressão para usar nos produtos
            </p>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Criar Primeira Impressão
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
                  <h2 className="text-xl font-semibold text-gray-900">Nova Impressão</h2>
                  <p className="text-sm text-gray-600 mt-1">Configure uma nova tecnologia de impressão</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tecnologia
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.technology}
                    onChange={(e) => setForm({...form, technology: e.target.value as Printing["technology"]})}
                  >
                    <option value="OFFSET">Offset</option>
                    <option value="DIGITAL">Digital</option>
                    <option value="UV">UV</option>
                    <option value="GRANDE_FORMATO">Grande Formato</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lados
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.sides}
                    onChange={(e) => setForm({...form, sides: Number(e.target.value || 1)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato/Descrição
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.formatLabel}
                    onChange={(e) => setForm({...form, formatLabel: e.target.value})}
                    placeholder="Ex: SRA3, Rolo 1,6m"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cores
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.colors}
                    onChange={(e) => setForm({...form, colors: e.target.value})}
                    placeholder="Ex: 4x4, CMYK"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Unitário (€)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.unitPrice}
                    onChange={(e) => setForm({...form, unitPrice: e.target.value})}
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yield (un/tiro)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.yield}
                    onChange={(e) => setForm({...form, yield: Number(e.target.value || 1)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Setup (minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.setupMinutes}
                    onChange={(e) => setForm({...form, setupMinutes: Number(e.target.value || 0)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taxa Mínima (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.minFee}
                    onChange={(e) => setForm({...form, minFee: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm({...form, active: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm font-medium text-gray-700">
                  Impressão ativa
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
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={createPrinting}
                  disabled={saving}
                >
                  {saving ? 'Criando...' : 'Criar Impressão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
