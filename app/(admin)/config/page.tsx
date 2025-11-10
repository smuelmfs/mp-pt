"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      setConfig(data);
      setFormData(data);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
    setLoading(false);
  }

  function handleChange(field: string, value: any) {
    setFormData({ ...formData, [field]: value });
    setHasChanges(true);
  }

  async function saveChanges() {
    setSaving(true);
    try {
      await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setHasChanges(false);
      load();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  // Mantém função update para compatibilidade
  async function update(field: string, value: any) {
    setFormData({ ...formData, [field]: value });
    setHasChanges(true);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6EEE8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-[#F6EEE8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium">Erro ao carregar configuração</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6EEE8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configuração Global</h1>
              <p className="text-gray-600 mt-2">Configure as regras e parâmetros globais do sistema</p>
            </div>
            <button
              onClick={saveChanges}
              disabled={saving || !hasChanges}
              className="inline-flex items-center px-6 py-3 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Salvando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </div>

        {/* Margens e Markup */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Margens e Markup</CardTitle>
            <CardDescription>Configure as margens padrão e markup operacional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Margem Padrão (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={config.marginDefault ? (Number(config.marginDefault) * 100).toString() : ""}
                  onBlur={(e) => update('marginDefault', Number(e.target.value) / 100)}
                  placeholder="30.00"
                />
                <p className="text-xs text-gray-500">Margem padrão aplicada em todos os cálculos</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Markup Operacional (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={config.markupOperational ? (Number(config.markupOperational) * 100).toString() : ""}
                  onBlur={(e) => update('markupOperational', Number(e.target.value) / 100)}
                  placeholder="15.00"
                />
                <p className="text-xs text-gray-500">Markup adicional para custos operacionais</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Arredondamento e Perdas */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Arredondamento e Perdas</CardTitle>
            <CardDescription>Configure o arredondamento de preços e percentual de perda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Degrau de Arredondamento
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={config.roundingStep ? config.roundingStep.toString() : ""}
                  onBlur={(e) => update('roundingStep', e.target.value ? Number(e.target.value) : null)}
                  placeholder="0.05"
                />
                <p className="text-xs text-gray-500">Exemplo: 0.05 = múltiplos de 5 centavos</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Perda Global (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={config.lossFactor ? (Number(config.lossFactor) * 100).toString() : ""}
                  onBlur={(e) => update('lossFactor', e.target.value ? Number(e.target.value) / 100 : null)}
                  placeholder="3.00"
                />
                <p className="text-xs text-gray-500">Percentual aplicado para cobrir refugos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impressão e Tributação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Impressão e Tributação</CardTitle>
            <CardDescription>Configure custos de impressão e impostos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tempo de Setup (min)
                </label>
                <input
                  type="number"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={config.setupTimeMin ? config.setupTimeMin.toString() : ""}
                  onBlur={(e) => update('setupTimeMin', e.target.value ? Number(e.target.value) : null)}
                  placeholder="15"
                />
                <p className="text-xs text-gray-500">Tempo padrão de setup</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Custo por Hora (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={config.printingHourCost ? config.printingHourCost.toString() : ""}
                  onBlur={(e) => update('printingHourCost', e.target.value ? Number(e.target.value) : null)}
                  placeholder="60.00"
                />
                <p className="text-xs text-gray-500">Custo horário da impressão</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  IVA (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={config.vatPercent ? (Number(config.vatPercent) * 100).toString() : ""}
                  onBlur={(e) => update('vatPercent', e.target.value ? Number(e.target.value) / 100 : null)}
                  placeholder="23.00"
                />
                <p className="text-xs text-gray-500">Taxa de IVA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-[#F6EEE8] border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-gray-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Como funciona</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li><strong>Perda Global:</strong> Percentual extra aplicado em materiais e impressão para cobrir refugos</li>
                  <li><strong>Custo por Hora:</strong> Usado para calcular custo de setup da impressão</li>
                  <li><strong>Degrau:</strong> Arredondamento final dos preços (ex: 0.05 = múltiplos de 5 centavos)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
