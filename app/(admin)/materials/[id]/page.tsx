"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function MaterialDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // formulário de variante
  const [vf, setVf] = useState<any>({
    label: "",
    gramagem: "",
    widthMm: "",
    heightMm: "",
    sheetsPerPack: "",
    packPrice: "",
    unitPrice: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/materials/${id}`);
    const json = await res.json();
    setRow(json);
    setFormData(json);
    setLoading(false);
  }

  function handleChange(field: string, value: any) {
    setFormData({ ...formData, [field]: value });
    setHasChanges(true);
  }

  async function saveChanges() {
    setSaving(true);
    try {
      await fetch(`/api/admin/materials/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formData),
      });
      setHasChanges(false);
      load();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Mantém função patch para compatibilidade
  async function patch(patch: any) {
    setFormData({ ...formData, ...patch });
    setHasChanges(true);
  }

  async function addVariant() {
    if (!vf.label) {
      alert("Informe o rótulo da variante.");
      return;
    }
    const body: any = {
      materialId: id,
      label: vf.label,
      gramagem: vf.gramagem ? Number(vf.gramagem) : null,
      widthMm: vf.widthMm ? Number(vf.widthMm) : null,
      heightMm: vf.heightMm ? Number(vf.heightMm) : null,
      sheetsPerPack: vf.sheetsPerPack ? Number(vf.sheetsPerPack) : null,
      packPrice: vf.packPrice || null,
      unitPrice: vf.unitPrice || null,
    };
    const res = await fetch(`/api/admin/material-variants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setVf({ label: "", gramagem: "", widthMm: "", heightMm: "", sheetsPerPack: "", packPrice: "", unitPrice: "" });
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      alert("Erro: " + (j.error?.message || "Falha ao criar variante"));
    }
  }

  const unitLabels: Record<string, string> = {
    UNIT: "Unidade",
    M2: "Metro Quadrado",
    LOT: "Lote",
    HOUR: "Hora",
    SHEET: "Folha"
  };

  if (!Number.isFinite(id)) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-red-600">ID inválido</div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (row?.error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-red-600">{row.error}</div>
        </div>
      </main>
    );
  }

  const variants = Array.isArray(row?.variants) ? row.variants : [];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/materials" className="text-gray-600 hover:text-black transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{row.name}</h1>
                <p className="text-sm text-gray-600 mt-1">Detalhes e configurações do material</p>
              </div>
            </div>
            <button
              onClick={saveChanges}
              disabled={saving || !hasChanges}
              className="inline-flex items-center px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Informações Básicas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome
              </label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                defaultValue={row.name}
                onBlur={(e) => patch({ name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                defaultValue={row.type}
                onBlur={(e) => patch({ type: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidade
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                defaultValue={row.unit}
                onChange={(e) => patch({ unit: e.target.value })}
              >
                <option value="UNIT">Unidade</option>
                <option value="M2">Metro Quadrado</option>
                <option value="LOT">Lote</option>
                <option value="HOUR">Hora</option>
                <option value="SHEET">Folha</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custo Unitário (€)
              </label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                defaultValue={row.unitCost}
                onBlur={(e) => patch({ unitCost: e.target.value })}
              />
            </div>
            
            <div className="flex items-center pt-8">
              <input
                type="checkbox"
                defaultChecked={row.active}
                onChange={(e) => patch({ active: e.target.checked })}
                className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm font-medium text-gray-700">
                Material ativo
              </label>
            </div>
          </div>
        </div>

        {/* Variantes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Variantes</h2>
              <p className="text-sm text-gray-600 mt-1">Gerencie as variações deste material</p>
            </div>
          </div>

          {variants.length > 0 ? (
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Label</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Gramagem</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Largura (mm)</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Altura (mm)</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Folhas/Pack</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Preço Pack (€)</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Preço Unit (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {variants.map((v: any) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-medium">{v.label}</td>
                      <td className="py-3 px-4 text-gray-600">{v.gramagem ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-600">{v.widthMm ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-600">{v.heightMm ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-600">{v.sheetsPerPack ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-600">{v.packPrice ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-600">{v.unitPrice ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg mb-6">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-600 text-sm">Nenhuma variante cadastrada</p>
            </div>
          )}

          {/* Formulário de Nova Variante */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Adicionar Nova Variante</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Label *
                </label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                  value={vf.label}
                  onChange={(e) => setVf((s: any) => ({ ...s, label: e.target.value }))}
                  placeholder="Ex: A4 90g"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Gramagem
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                  value={vf.gramagem}
                  onChange={(e) => setVf((s: any) => ({ ...s, gramagem: e.target.value }))}
                  placeholder="90"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Largura (mm)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                  value={vf.widthMm}
                  onChange={(e) => setVf((s: any) => ({ ...s, widthMm: e.target.value }))}
                  placeholder="210"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Altura (mm)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                  value={vf.heightMm}
                  onChange={(e) => setVf((s: any) => ({ ...s, heightMm: e.target.value }))}
                  placeholder="297"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Folhas/Pack
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                  value={vf.sheetsPerPack}
                  onChange={(e) => setVf((s: any) => ({ ...s, sheetsPerPack: e.target.value }))}
                  placeholder="500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Preço Pack (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                  value={vf.packPrice}
                  onChange={(e) => setVf((s: any) => ({ ...s, packPrice: e.target.value }))}
                  placeholder="25.00"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Preço Unit (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                  value={vf.unitPrice}
                  onChange={(e) => setVf((s: any) => ({ ...s, unitPrice: e.target.value }))}
                  placeholder="0.05"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
                  onClick={addVariant}
                >
                  Adicionar Variante
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
