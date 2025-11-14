"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { markStepComplete } from "@/lib/admin-progress";

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
      if (!res.ok) {
        throw new Error("Erro ao carregar configuração");
      }
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data) {
        setConfig(data);
        setFormData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: string, value: any) {
    setFormData({ ...formData, [field]: value });
    setHasChanges(true);
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        markStepComplete('config');
        setHasChanges(false);
        load();
        toast.success("Configurações salvas com sucesso!");
      } else {
        throw new Error("Erro ao salvar");
      }
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
      <main className="min-h-screen bg-[#F6EEE8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-40 bg-gray-200 rounded" />
              <div className="h-40 bg-gray-200 rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-40 bg-gray-200 rounded" />
              <div className="h-40 bg-gray-200 rounded" />
              <div className="h-40 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </main>
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
    <main className="min-h-screen bg-[#F6EEE8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#341601]">Configuração Global</h1>
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
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Margens e Markup */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Margens e Markup</CardTitle>
            <CardDescription>Definições padrão para cálculo de preços</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-[#F66807]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Como funciona
            </CardTitle>
            <CardDescription>Entenda como as configurações afetam o cálculo de preços</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-700 space-y-3">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-[#341601] min-w-[120px]">Perda Global:</span>
                <span className="text-gray-600">Percentual extra aplicado em materiais e impressão para cobrir refugos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-[#341601] min-w-[120px]">Custo por Hora:</span>
                <span className="text-gray-600">Usado para calcular custo de setup da impressão</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-[#341601] min-w-[120px]">Degrau:</span>
                <span className="text-gray-600">Arredondamento final dos preços (ex: 0.05 = múltiplos de 5 centavos)</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
