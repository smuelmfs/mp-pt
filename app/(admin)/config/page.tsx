"use client";

import { useEffect, useState } from "react";

export default function ConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
    setLoading(false);
  }

  async function update(field: string, value: any) {
    try {
      await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      load();
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <main className="p-6">Carregando…</main>;
  if (!config) return <main className="p-6 text-red-600">Erro ao carregar configuração</main>;

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Configuração Global</h1>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Margens e Markup</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Margem Padrão (%)</label>
            <input
              type="number"
              step="0.01"
              className="border px-3 py-2 rounded w-full"
              defaultValue={config.marginDefault ? (Number(config.marginDefault) * 100).toString() : ""}
              onBlur={(e) => update('marginDefault', Number(e.target.value) / 100)}
            />
          </div>
          <div>
            <label className="block text-sm">Markup Operacional (%)</label>
            <input
              type="number"
              step="0.01"
              className="border px-3 py-2 rounded w-full"
              defaultValue={config.markupOperational ? (Number(config.markupOperational) * 100).toString() : ""}
              onBlur={(e) => update('markupOperational', Number(e.target.value) / 100)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Arredondamento e Perdas</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Degrau de Arredondamento</label>
            <input
              type="number"
              step="0.01"
              className="border px-3 py-2 rounded w-full"
              defaultValue={config.roundingStep ? config.roundingStep.toString() : ""}
              onBlur={(e) => update('roundingStep', e.target.value ? Number(e.target.value) : null)}
              placeholder="Ex: 0.05"
            />
          </div>
          <div>
            <label className="block text-sm">Perda Global (%)</label>
            <input
              type="number"
              step="0.01"
              className="border px-3 py-2 rounded w-full"
              defaultValue={config.lossFactor ? (Number(config.lossFactor) * 100).toString() : ""}
              onBlur={(e) => update('lossFactor', e.target.value ? Number(e.target.value) / 100 : null)}
              placeholder="Ex: 3"
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Impressão</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Tempo de Setup (min)</label>
            <input
              type="number"
              className="border px-3 py-2 rounded w-full"
              defaultValue={config.setupTimeMin ? config.setupTimeMin.toString() : ""}
              onBlur={(e) => update('setupTimeMin', e.target.value ? Number(e.target.value) : null)}
              placeholder="Ex: 15"
            />
          </div>
    <div>
      <label className="block text-sm">Custo por Hora (€)</label>
      <input
        type="number"
        step="0.01"
        className="border px-3 py-2 rounded w-full"
        defaultValue={config.printingHourCost ? config.printingHourCost.toString() : ""}
        onBlur={(e) => update('printingHourCost', e.target.value ? Number(e.target.value) : null)}
        placeholder="Ex: 60.00"
      />
    </div>

    <div>
      <label className="block text-sm">IVA (%)</label>
      <input
        type="number"
        step="0.01"
        className="border px-3 py-2 rounded w-full"
        defaultValue={config.vatPercent ? (Number(config.vatPercent) * 100).toString() : ""}
        onBlur={(e) => update('vatPercent', e.target.value ? Number(e.target.value) / 100 : null)}
        placeholder="Ex: 23"
      />
    </div>
        </div>
      </section>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 Como funciona</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Perda Global:</strong> Percentual extra aplicado em materiais e impressão para cobrir refugos</li>
          <li><strong>Custo por Hora:</strong> Usado para calcular custo de setup da impressão</li>
          <li><strong>Degrau:</strong> Arredondamento final dos preços (ex: 0.05 = múltiplos de 5 centavos)</li>
        </ul>
      </div>
    </main>
  );
}
