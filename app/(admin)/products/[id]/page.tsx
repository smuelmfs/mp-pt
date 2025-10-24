"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  async function load() {
    setLoading(true);
    const [prodRes, cRes, prRes, mRes, fRes] = await Promise.all([
      fetch(`/api/admin/products/${id}`),
      fetch(`/api/admin/categories`),
      fetch(`/api/admin/printing`),
      fetch(`/api/admin/materials?withVariants=1`), // ⚠️ carrega materiais com variantes
      fetch(`/api/admin/finishes`),
    ]);

    const [prod, categories, printings, mats, fins] = await Promise.all([
      prodRes.json(),
      cRes.json(),
      prRes.json(),
      mRes.json(),
      fRes.json(),
    ]);

    setRow(prod);
    setCats(Array.isArray(categories) ? categories : []);
    setPrints(Array.isArray(printings) ? printings : []);
    setMaterials(Array.isArray(mats) ? mats : []);     // blindagem
    setFinishes(Array.isArray(fins) ? fins : []);      // blindagem
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
    <main className="p-6 max-w-6xl mx-auto space-y-8">
      <a href="/products" className="text-blue-600 underline">
        ← Voltar
      </a>
      <h1 className="text-2xl font-semibold">Produto #{row.id}</h1>

      {/* Básico */}
      <section className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm">Nome</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.name}
              onBlur={(e) => update({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Categoria</label>
            <select
              className="border px-3 py-2 rounded w-full"
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
            <label className="block text-sm">Impressão</label>
            <select
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.printingId ?? ""}
              onChange={(e) => update({ printingId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">-- sem impressão --</option>
              {prints.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.technology} {p.colors ?? ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm">Margin default</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.marginDefault ?? ""}
              onBlur={(e) => update({ marginDefault: e.target.value || null })}
            />
          </div>
          <div>
            <label className="block text-sm">Markup default</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.markupDefault ?? ""}
              onBlur={(e) => update({ markupDefault: e.target.value || null })}
            />
          </div>
          <div>
            <label className="block text-sm">Rounding step</label>
            <input
              className="border px-3 py-2 rounded w-full"
              defaultValue={row.roundingStep ?? ""}
              onBlur={(e) => update({ roundingStep: e.target.value || null })}
            />
          </div>
        </div>

    {/* Dimensões para imposição automática */}
    <div className="grid grid-cols-2 gap-4 border-t pt-4">
      <div>
        <label className="block text-sm">Largura (mm)</label>
        <input
          type="number"
          className="border px-3 py-2 rounded w-full"
          defaultValue={row.widthMm ?? ""}
          onBlur={(e) => update({ widthMm: e.target.value ? Number(e.target.value) : null })}
          placeholder="Ex: 90"
        />
      </div>
      <div>
        <label className="block text-sm">Altura (mm)</label>
        <input
          type="number"
          className="border px-3 py-2 rounded w-full"
          defaultValue={row.heightMm ?? ""}
          onBlur={(e) => update({ heightMm: e.target.value ? Number(e.target.value) : null })}
          placeholder="Ex: 50"
        />
      </div>
    </div>

    {/* Mínimo de pedido */}
    <div className="grid grid-cols-2 gap-4 border-t pt-4">
      <div>
        <label className="block text-sm">Quantidade Mínima</label>
        <input
          type="number"
          className="border px-3 py-2 rounded w-full"
          defaultValue={row.minOrderQty ?? ""}
          onBlur={(e) => update({ minOrderQty: e.target.value ? Number(e.target.value) : null })}
          placeholder="Ex: 100"
        />
      </div>
      <div>
        <label className="block text-sm">Valor Mínimo (€)</label>
        <input
          type="number"
          step="0.01"
          className="border px-3 py-2 rounded w-full"
          defaultValue={row.minOrderValue ?? ""}
          onBlur={(e) => update({ minOrderValue: e.target.value ? Number(e.target.value) : null })}
          placeholder="Ex: 50.00"
        />
      </div>
    </div>

        <div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked={row.active} onChange={(e) => update({ active: e.target.checked })} />
            Ativo
          </label>
        </div>
      </section>

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
    </main>
  );
}
