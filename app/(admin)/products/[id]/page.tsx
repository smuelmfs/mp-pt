"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'basic' | 'materials' | 'finishes'>('basic');

  // dados para selects
  const [cats, setCats] = useState<any[]>([]);
  const [prints, setPrints] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [finishes, setFinishes] = useState<any[]>([]);

  // add material/finish forms
  const [pmForm, setPmForm] = useState<any>({
    materialId: "",
    variantId: "",
    qtyPerUnit: "",
    wasteFactor: "",
  });
  const [pfForm, setPfForm] = useState<any>({
    finishId: "",
    calcTypeOverride: "",
    qtyPerUnit: "",
    costOverride: "",
  });

  // tiragens sugeridas
  const [suggestedQuantities, setSuggestedQuantities] = useState<any[]>([]);
  
  // form para tiragens
  const [quantityForm, setQuantityForm] = useState<any>({
    quantity: "",
    label: "",
    order: 0
  });

  async function load() {
    setLoading(true);
    const [prodRes, cRes, prRes, mRes, fRes, quantitiesRes] = await Promise.all([
      fetch(`/api/admin/products/${id}`),
      fetch(`/api/admin/categories`),
      fetch(`/api/admin/printing`),
      fetch(`/api/admin/materials?withVariants=1`), // ⚠️ carrega materiais com variantes
      fetch(`/api/admin/finishes`),
      fetch(`/api/admin/products/${id}/suggested-quantities`),
    ]);

    const [prod, categories, printings, mats, fins, quantities] = await Promise.all([
      prodRes.json(),
      cRes.json(),
      prRes.json(),
      mRes.json(),
      fRes.json(),
      quantitiesRes.json(),
    ]);

    setRow(prod);
    setCats(Array.isArray(categories) ? categories : []);
    setPrints(Array.isArray(printings) ? printings : []);
    setMaterials(Array.isArray(mats) ? mats : []);     // blindagem
    setFinishes(Array.isArray(fins) ? fins : []);      // blindagem
    setSuggestedQuantities(Array.isArray(quantities) ? quantities : []);
    setLoading(false);
  }

  useEffect(() => {
    if (Number.isFinite(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function update(patch: any) {
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  // criar/atualizar composição
  async function addMaterial() {
    if (!pmForm.materialId || !pmForm.qtyPerUnit) {
      alert("Escolha um material e informe Qty/Un.");
      return;
    }
    const body: any = {
      productId: id,
      materialId: Number(pmForm.materialId),
      variantId: pmForm.variantId ? Number(pmForm.variantId) : null,
      qtyPerUnit: pmForm.qtyPerUnit,
      wasteFactor: pmForm.wasteFactor || null,
    };
    const res = await fetch(`/api/admin/product-materials`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setPmForm({ materialId: "", variantId: "", qtyPerUnit: "", wasteFactor: "" });
      load();
    } else {
      const j = await res.json();
      alert("Erro: " + (j.error?.message || "Falha ao salvar material"));
    }
  }

  async function removePM(idPM: number) {
    await fetch(`/api/admin/product-materials/${idPM}`, { method: "DELETE" });
    load();
  }

  async function addFinish() {
    if (!pfForm.finishId) {
      alert("Escolha um acabamento.");
      return;
    }
    const body: any = {
      productId: id,
      finishId: Number(pfForm.finishId),
      calcTypeOverride: pfForm.calcTypeOverride || null,
      qtyPerUnit: pfForm.qtyPerUnit || null,
      costOverride: pfForm.costOverride || null,
    };
    const res = await fetch(`/api/admin/product-finishes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setPfForm({ finishId: "", calcTypeOverride: "", qtyPerUnit: "", costOverride: "" });
      load();
    } else {
      const j = await res.json();
      alert("Erro: " + (j.error?.message || "Falha ao salvar acabamento"));
    }
  }

  async function removePF(idPF: number) {
    await fetch(`/api/admin/product-finishes/${idPF}`, { method: "DELETE" });
    load();
  }

  // opções de materiais com variantes (blindado)
  const materialOptions = useMemo(() => {
    const list = Array.isArray(materials) ? materials : [];
    return list.map((m: any) => ({
      id: m.id,
      name: m.name,
      variants: Array.isArray(m.variants) ? m.variants : [],
    }));
  }, [materials]);

  if (!Number.isFinite(id)) return <main className="p-6 text-red-600">ID inválido</main>;
  if (loading) return <main className="p-6">Carregando…</main>;
  if (row?.error) return <main className="p-6 text-red-600">{row.error}</main>;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <a href="/products" className="hover:text-gray-900">Produtos</a>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900">{row.name}</span>
          </nav>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{row.name}</h1>
              <p className="text-gray-600 mt-2">Configure materiais e acabamentos - o comercial escolherá entre eles</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                row.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {row.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <nav className="flex space-x-0" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Informações Básicas
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'materials'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Materiais
            </button>
            <button
              onClick={() => setActiveTab('finishes')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'finishes'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
              Acabamentos
            </button>
          </nav>
        </div>

        {/* Conteúdo das tabs */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Informações Básicas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Produto</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={row.name}
                  onBlur={(e) => update({ name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={row.categoryId}
                  onChange={(e) => update({ categoryId: Number(e.target.value) })}
                >
                  {cats.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Impressão</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={row.printingId ?? ""}
                  onChange={(e) => update({ printingId: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Sem impressão específica</option>
                  {prints.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.technology} {p.colors ?? ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Margem Padrão</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 0.30 (30%)"
                  defaultValue={row.marginDefault ?? ""}
                  onBlur={(e) => update({ marginDefault: e.target.value || null })}
                />
                <p className="text-xs text-gray-500 mt-1">Deixe vazio para usar a margem da categoria</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Markup Padrão</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 0.20 (20%)"
                  defaultValue={row.markupDefault ?? ""}
                  onBlur={(e) => update({ markupDefault: e.target.value || null })}
                />
                <p className="text-xs text-gray-500 mt-1">Deixe vazio para usar o markup da categoria</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Arredondamento</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 0.05 (€0.05)"
                  defaultValue={row.roundingStep ?? ""}
                  onBlur={(e) => update({ roundingStep: e.target.value || null })}
                />
                <p className="text-xs text-gray-500 mt-1">Deixe vazio para usar o arredondamento da categoria</p>
              </div>
            </div>

            {/* Dimensões para imposição automática */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dimensões do Produto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Largura (mm)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue={row.widthMm ?? ""}
                    onBlur={(e) => update({ widthMm: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Ex: 90"
                  />
                  <p className="text-xs text-gray-500 mt-1">Para cálculo de imposição automática</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Altura (mm)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue={row.heightMm ?? ""}
                    onBlur={(e) => update({ heightMm: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Ex: 50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Para cálculo de imposição automática</p>
                </div>
              </div>
            </div>

            {/* Mínimo de pedido */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Mínimo de Pedido</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade Mínima</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue={row.minOrderQty ?? ""}
                    onBlur={(e) => update({ minOrderQty: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Ex: 100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor Mínimo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue={row.minOrderValue ?? ""}
                    onBlur={(e) => update({ minOrderValue: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Ex: 50.00"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="active"
                  defaultChecked={row.active} 
                  onChange={(e) => update({ active: e.target.checked })} 
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm font-medium text-gray-700">
                  Produto ativo
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">Produtos inativos não aparecem para o comercial</p>
            </div>

            {/* Tiragens Sugeridas */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tiragens Sugeridas</h3>
              <p className="text-sm text-gray-600 mb-4">Configure as quantidades que aparecerão como sugestões para o comercial.</p>
              
              {/* Lista de tiragens */}
              <div className="space-y-2 mb-4">
                {suggestedQuantities.map((qty: any) => (
                  <div key={qty.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{qty.quantity} unidades</span>
                      {qty.label && <span className="text-sm text-gray-500">({qty.label})</span>}
                    </div>
                    <button 
                      className="text-red-600 hover:text-red-800 text-sm"
                      onClick={() => {/* TODO: implementar exclusão */}}
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Formulário para adicionar tiragem */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Adicionar Tiragem</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantidade</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={quantityForm.quantity}
                      onChange={(e) => setQuantityForm({...quantityForm, quantity: e.target.value})}
                      placeholder="Ex: 100, 250, 500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rótulo (opcional)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={quantityForm.label}
                      onChange={(e) => setQuantityForm({...quantityForm, label: e.target.value})}
                      placeholder="Ex: Pequena tiragem"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      onClick={() => {/* TODO: implementar adição */}}
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {activeTab === 'materials' && (
        <>
          {/* Materiais do produto */}
          <section className="space-y-3">
        <h2 className="text-lg font-semibold">Materiais</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">#</th>
                <th className="py-2">Material</th>
                <th className="py-2">Variante</th>
                <th className="py-2">Qty/Un</th>
                <th className="py-2">Perda</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(row.materials) && row.materials.length > 0 ? (
                row.materials.map((pm: any) => (
                  <tr key={pm.id} className="border-b">
                    <td className="py-2">{pm.id}</td>
                    <td className="py-2">{pm.material?.name}</td>
                    <td className="py-2">{pm.variant?.label ?? "-"}</td>
                    <td className="py-2">{Number(pm.qtyPerUnit).toFixed(4)}</td>
                    <td className="py-2">{pm.wasteFactor ? Number(pm.wasteFactor).toFixed(4) : "-"}</td>
                    <td className="py-2">
                      <button className="px-3 py-1 rounded border" onClick={() => removePM(pm.id)}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    Sem materiais
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border rounded-xl p-4">
          <h3 className="font-medium mb-3">Adicionar material</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm">Material</label>
              <select
                className="border px-3 py-2 rounded w-full"
                value={pmForm.materialId}
                onChange={(e) => setPmForm((f: any) => ({ ...f, materialId: e.target.value, variantId: "" }))}
              >
                <option value="">-- selecione --</option>
                {materialOptions.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Variante</label>
              <select
                className="border px-3 py-2 rounded w-full"
                value={pmForm.variantId}
                onChange={(e) => setPmForm((f: any) => ({ ...f, variantId: e.target.value }))}
              >
                <option value="">-- opcional --</option>
                {materialOptions
                  .find((m: any) => String(m.id) === String(pmForm.materialId))
                  ?.variants?.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Qty por unidade</label>
              <input
                className="border px-3 py-2 rounded w-full"
                value={pmForm.qtyPerUnit}
                onChange={(e) => setPmForm((f: any) => ({ ...f, qtyPerUnit: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm">Perda (ex 0.02)</label>
              <input
                className="border px-3 py-2 rounded w-full"
                value={pmForm.wasteFactor}
                onChange={(e) => setPmForm((f: any) => ({ ...f, wasteFactor: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={addMaterial}>
              Adicionar
            </button>
          </div>
        </div>
          </section>
        </>
      )}

      {activeTab === 'finishes' && (
        <>
          {/* Acabamentos do produto */}
          <section className="space-y-3">
        <h2 className="text-lg font-semibold">Acabamentos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">#</th>
                <th className="py-2">Acabamento</th>
                <th className="py-2">Tipo calc</th>
                <th className="py-2">Qty/Un</th>
                <th className="py-2">Custo override</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(row.finishes) && row.finishes.length > 0 ? (
                row.finishes.map((pf: any) => (
                  <tr key={pf.id} className="border-b">
                    <td className="py-2">{pf.id}</td>
                    <td className="py-2">{pf.finish?.name}</td>
                    <td className="py-2">{pf.calcTypeOverride ?? pf.finish?.calcType}</td>
                    <td className="py-2">{pf.qtyPerUnit ? Number(pf.qtyPerUnit).toFixed(4) : "-"}</td>
                    <td className="py-2">{pf.costOverride ? Number(pf.costOverride).toFixed(4) : "-"}</td>
                    <td className="py-2">
                      <button className="px-3 py-1 rounded border" onClick={() => removePF(pf.id)}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    Sem acabamentos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border rounded-xl p-4">
          <h3 className="font-medium mb-3">Adicionar acabamento</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm">Acabamento</label>
              <select
                className="border px-3 py-2 rounded w-full"
                value={pfForm.finishId}
                onChange={(e) => setPfForm((f: any) => ({ ...f, finishId: e.target.value }))}
              >
                <option value="">-- selecione --</option>
                {finishes.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Tipo cálculo (override)</label>
              <select
                className="border px-3 py-2 rounded w-full"
                value={pfForm.calcTypeOverride}
                onChange={(e) => setPfForm((f: any) => ({ ...f, calcTypeOverride: e.target.value }))}
              >
                <option value="">(usar do acabamento)</option>
                <option>PER_UNIT</option>
                <option>PER_M2</option>
                <option>PER_LOT</option>
                <option>PER_HOUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm">Qty por unidade</label>
              <input
                className="border px-3 py-2 rounded w-full"
                value={pfForm.qtyPerUnit}
                onChange={(e) => setPfForm((f: any) => ({ ...f, qtyPerUnit: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm">Custo override (€)</label>
              <input
                className="border px-3 py-2 rounded w-full"
                value={pfForm.costOverride}
                onChange={(e) => setPfForm((f: any) => ({ ...f, costOverride: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={addFinish}>
              Adicionar
            </button>
          </div>
        </div>
          </section>
        </>
      )}

      </div>
    </main>
  );
}
