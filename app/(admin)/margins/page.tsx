"use client";

import { useEffect, useMemo, useState } from "react";

type Scope = "GLOBAL" | "CATEGORY" | "PRODUCT";

export default function MarginsPage() {
  const [tab, setTab] = useState<"FIXA"|"DINAMICA">("FIXA");
  const [scope, setScope] = useState<Scope>("GLOBAL");
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [prods, setProds] = useState<any[]>([]);

  const [formFixed, setFormFixed] = useState<any>({
    scope: "GLOBAL", categoryId: "", productId: "", margin: "0.30", startsAt: "", endsAt: "", active: true
  });

  const [formDyn, setFormDyn] = useState<any>({
    scope: "GLOBAL", categoryId: "", productId: "", minSubtotal: "", minQuantity: "",
    adjustPercent: "-0.0500", maxAdjust: "", priority: 100, stackable: false,
    startsAt: "", endsAt: "", active: true
  });

  async function load() {
    const [cRes, pRes] = await Promise.all([
      fetch(`/api/admin/categories`),
      fetch(`/api/admin/products`),
    ]);
    setCats(await cRes.json());
    setProds(await pRes.json());
  }
  useEffect(() => { load(); }, []);

  const queryParams = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("scope", scope);
    return sp.toString();
  }, [scope]);

  async function loadRules() {
    const url = tab === "FIXA"
      ? `/api/admin/margin-rules?${queryParams}`
      : `/api/admin/margin-rules-dyn?${queryParams}`;
    const res = await fetch(url);
    setRows(await res.json());
  }
  useEffect(() => { loadRules(); /* eslint-disable-next-line */ }, [tab, scope]);

  async function createFixed() {
    const body: any = {
      scope: formFixed.scope,
      categoryId: formFixed.categoryId ? Number(formFixed.categoryId) : undefined,
      productId: formFixed.productId ? Number(formFixed.productId) : undefined,
      margin: formFixed.margin,
      startsAt: formFixed.startsAt || null,
      endsAt: formFixed.endsAt || null,
      active: !!formFixed.active,
    };
    const res = await fetch(`/api/admin/margin-rules`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    if (res.ok) {
      setFormFixed({ scope, categoryId: "", productId: "", margin: "0.30", startsAt: "", endsAt: "", active: true });
      loadRules();
    } else {
      const j = await res.json(); alert("Erro: "+(j.error?.message || "Falha ao criar"));
    }
  }

  async function createDyn() {
    const body: any = {
      scope: formDyn.scope,
      categoryId: formDyn.categoryId ? Number(formDyn.categoryId) : undefined,
      productId: formDyn.productId ? Number(formDyn.productId) : undefined,
      minSubtotal: formDyn.minSubtotal || null,
      minQuantity: formDyn.minQuantity ? Number(formDyn.minQuantity) : null,
      adjustPercent: formDyn.adjustPercent,
      maxAdjust: formDyn.maxAdjust || null,
      priority: Number(formDyn.priority) || 100,
      stackable: !!formDyn.stackable,
      startsAt: formDyn.startsAt || null,
      endsAt: formDyn.endsAt || null,
      active: !!formDyn.active,
    };
    const res = await fetch(`/api/admin/margin-rules-dyn`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    if (res.ok) {
      setFormDyn({ scope, categoryId: "", productId: "", minSubtotal: "", minQuantity: "", adjustPercent: "-0.0500", maxAdjust: "", priority: 100, stackable: false, startsAt: "", endsAt: "", active: true });
      loadRules();
    } else {
      const j = await res.json(); alert("Erro: "+(j.error?.message || "Falha ao criar"));
    }
  }

  async function toggleActive(kind: "FIXA"|"DINAMICA", id: number, active: boolean) {
    const url = kind === "FIXA" ? `/api/admin/margin-rules/${id}` : `/api/admin/margin-rules-dyn/${id}`;
    await fetch(url, { method: "PATCH", headers: { "content-type":"application/json" }, body: JSON.stringify({ active }) });
    loadRules();
  }

  async function remove(kind: "FIXA"|"DINAMICA", id: number) {
    const url = kind === "FIXA" ? `/api/admin/margin-rules/${id}` : `/api/admin/margin-rules-dyn/${id}`;
    await fetch(url, { method: "DELETE" });
    loadRules();
  }

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Margens</h1>
        <div className="flex gap-2">
          <button className={`px-3 py-1 rounded border ${tab==="FIXA" ? "bg-black text-white" : ""}`} onClick={()=>setTab("FIXA")}>Fixas</button>
          <button className={`px-3 py-1 rounded border ${tab==="DINAMICA" ? "bg-black text-white" : ""}`} onClick={()=>setTab("DINAMICA")}>Dinâmicas</button>
        </div>
      </div>

      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm">Scope</label>
          <select className="border px-3 py-2 rounded" value={scope} onChange={(e)=>setScope(e.target.value as Scope)}>
            <option>GLOBAL</option>
            <option>CATEGORY</option>
            <option>PRODUCT</option>
          </select>
        </div>
        <button className="px-3 py-2 rounded border" onClick={loadRules}>Atualizar</button>
      </div>

      {/* Lista */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">#</th>
              <th className="py-2">Scope</th>
              <th className="py-2">Categoria</th>
              <th className="py-2">Produto</th>
              {tab==="FIXA" ? (<th className="py-2">Margem</th>) : (
                <>
                  <th className="py-2">Min Subtotal</th>
                  <th className="py-2">Min Qtd</th>
                  <th className="py-2">Ajuste %</th>
                  <th className="py-2">Priority</th>
                  <th className="py-2">Stack</th>
                </>
              )}
              <th className="py-2">Ativa</th>
              <th className="py-2">Vigência</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r:any)=>(
              <tr key={r.id} className="border-b">
                <td className="py-2">{r.id}</td>
                <td className="py-2">{r.scope}</td>
                <td className="py-2">{r.category?.name ?? "-"}</td>
                <td className="py-2">{r.product?.name ?? "-"}</td>
                {tab==="FIXA" ? (
                  <td className="py-2">{Number(r.margin).toFixed(4)}</td>
                ) : (
                  <>
                    <td className="py-2">{r.minSubtotal ?? "-"}</td>
                    <td className="py-2">{r.minQuantity ?? "-"}</td>
                    <td className="py-2">{Number(r.adjustPercent).toFixed(4)}</td>
                    <td className="py-2">{r.priority}</td>
                    <td className="py-2">{r.stackable ? "Sim" : "Não"}</td>
                  </>
                )}
                <td className="py-2">{r.active ? "Sim" : "Não"}</td>
                <td className="py-2">
                  {(r.startsAt ? new Date(r.startsAt).toLocaleDateString() : "—") + " → " + (r.endsAt ? new Date(r.endsAt).toLocaleDateString() : "—")}
                </td>
                <td className="py-2 flex gap-2">
                  <button className="px-2 py-1 border rounded" onClick={()=>toggleActive(tab, r.id, !r.active)}>{r.active ? "Desativar" : "Ativar"}</button>
                  <button className="px-2 py-1 border rounded" onClick={()=>remove(tab, r.id)}>Apagar</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={12} className="py-8 text-center text-gray-500">Sem regras</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Criar nova */}
      {tab === "FIXA" ? (
        <div className="border rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold">Nova regra fixa</h2>
          <div className="grid grid-cols-6 gap-4">
            <div>
              <label className="block text-sm">Scope</label>
              <select className="border px-3 py-2 rounded w-full" value={formFixed.scope}
                onChange={(e)=>setFormFixed((f:any)=>({...f, scope:e.target.value}))}>
                <option>GLOBAL</option>
                <option>CATEGORY</option>
                <option>PRODUCT</option>
              </select>
            </div>
            {formFixed.scope==="CATEGORY" && (
              <div className="col-span-2">
                <label className="block text-sm">Categoria</label>
                <select className="border px-3 py-2 rounded w-full" value={formFixed.categoryId}
                  onChange={(e)=>setFormFixed((f:any)=>({...f, categoryId:e.target.value}))}>
                  <option value="">-- selecione --</option>
                  {cats.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {formFixed.scope==="PRODUCT" && (
              <div className="col-span-2">
                <label className="block text-sm">Produto</label>
                <select className="border px-3 py-2 rounded w-full" value={formFixed.productId}
                  onChange={(e)=>setFormFixed((f:any)=>({...f, productId:e.target.value}))}>
                  <option value="">-- selecione --</option>
                  {prods.map((p:any)=> <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm">Margem (ex 0.30)</label>
              <input className="border px-3 py-2 rounded w-full" value={formFixed.margin}
                onChange={(e)=>setFormFixed((f:any)=>({...f, margin:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm">Início</label>
              <input type="datetime-local" className="border px-3 py-2 rounded w-full" value={formFixed.startsAt}
                onChange={(e)=>setFormFixed((f:any)=>({...f, startsAt:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm">Fim</label>
              <input type="datetime-local" className="border px-3 py-2 rounded w-full" value={formFixed.endsAt}
                onChange={(e)=>setFormFixed((f:any)=>({...f, endsAt:e.target.value}))}/>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={!!formFixed.active} onChange={(e)=>setFormFixed((f:any)=>({...f, active:e.target.checked}))}/>
              <span className="text-sm">Ativa</span>
            </div>
          </div>
          <div className="flex justify-end">
            <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={createFixed}>Criar</button>
          </div>
        </div>
      ) : (
        <div className="border rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold">Nova regra dinâmica</h2>
          <div className="grid grid-cols-6 gap-4">
            <div>
              <label className="block text-sm">Scope</label>
              <select className="border px-3 py-2 rounded w-full" value={formDyn.scope}
                onChange={(e)=>setFormDyn((f:any)=>({...f, scope:e.target.value}))}>
                <option>GLOBAL</option>
                <option>CATEGORY</option>
                <option>PRODUCT</option>
              </select>
            </div>
            {formDyn.scope==="CATEGORY" && (
              <div className="col-span-2">
                <label className="block text-sm">Categoria</label>
                <select className="border px-3 py-2 rounded w-full" value={formDyn.categoryId}
                  onChange={(e)=>setFormDyn((f:any)=>({...f, categoryId:e.target.value}))}>
                  <option value="">-- selecione --</option>
                  {cats.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {formDyn.scope==="PRODUCT" && (
              <div className="col-span-2">
                <label className="block text-sm">Produto</label>
                <select className="border px-3 py-2 rounded w-full" value={formDyn.productId}
                  onChange={(e)=>setFormDyn((f:any)=>({...f, productId:e.target.value}))}>
                  <option value="">-- selecione --</option>
                  {prods.map((p:any)=> <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm">Min Subtotal (€)</label>
              <input className="border px-3 py-2 rounded w-full" value={formDyn.minSubtotal}
                onChange={(e)=>setFormDyn((f:any)=>({...f, minSubtotal:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm">Min Qtd</label>
              <input className="border px-3 py-2 rounded w-full" value={formDyn.minQuantity}
                onChange={(e)=>setFormDyn((f:any)=>({...f, minQuantity:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm">Ajuste (%) ex -0.0500</label>
              <input className="border px-3 py-2 rounded w-full" value={formDyn.adjustPercent}
                onChange={(e)=>setFormDyn((f:any)=>({...f, adjustPercent:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm">Max Adjust (opcional)</label>
              <input className="border px-3 py-2 rounded w-full" value={formDyn.maxAdjust}
                onChange={(e)=>setFormDyn((f:any)=>({...f, maxAdjust:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm">Prioridade</label>
              <input className="border px-3 py-2 rounded w-full" value={formDyn.priority}
                onChange={(e)=>setFormDyn((f:any)=>({...f, priority:e.target.value}))}/>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={!!formDyn.stackable} onChange={(e)=>setFormDyn((f:any)=>({...f, stackable:e.target.checked}))}/>
              <span className="text-sm">Acumulável</span>
            </div>
            <div>
              <label className="block text-sm">Início</label>
              <input type="datetime-local" className="border px-3 py-2 rounded w-full" value={formDyn.startsAt}
                onChange={(e)=>setFormDyn((f:any)=>({...f, startsAt:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm">Fim</label>
              <input type="datetime-local" className="border px-3 py-2 rounded w-full" value={formDyn.endsAt}
                onChange={(e)=>setFormDyn((f:any)=>({...f, endsAt:e.target.value}))}/>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={!!formDyn.active} onChange={(e)=>setFormDyn((f:any)=>({...f, active:e.target.checked}))}/>
              <span className="text-sm">Ativa</span>
            </div>
          </div>
          <div className="flex justify-end">
            <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={createDyn}>Criar</button>
          </div>
        </div>
      )}
    </main>
  );
}
