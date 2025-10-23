"use client";

import { useEffect, useState } from "react";

export default function ProductsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [prints, setPrints] = useState<any[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<any>({
    name: "", categoryId: "", printingId: "", marginDefault: "", markupDefault: "", roundingStep: ""
  });

  async function load() {
    const [pRes, cRes, prRes] = await Promise.all([
      fetch(`/api/admin/products?q=${encodeURIComponent(q)}`),
      fetch(`/api/admin/categories`),
      fetch(`/api/admin/printing`), // lista já existe (GET sem [id]) no teu projeto
    ]);
    setRows(await pRes.json());
    setCats(await cRes.json());
    setPrints(await prRes.json());
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function createProduct() {
    const body: any = {
      name: form.name,
      categoryId: Number(form.categoryId),
      printingId: form.printingId ? Number(form.printingId) : null,
      marginDefault: form.marginDefault || null,
      markupDefault: form.markupDefault || null,
      roundingStep: form.roundingStep || null,
    };
    const res = await fetch("/api/admin/products", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    if (res.ok) {
      setOpenCreate(false);
      setForm({ name: "", categoryId: "", printingId: "", marginDefault: "", markupDefault: "", roundingStep: "" });
      load();
    } else {
      const j = await res.json(); alert("Erro: " + (j.error?.message || "Falha ao criar"));
    }
  }

  return (
     <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium">Buscar</label>
          <input className="border px-3 py-2 rounded w-full"
            placeholder="nome ou categoria…"
            value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>
        <button onClick={load} className="px-4 py-2 rounded border">Filtrar</button>
        <button onClick={()=>setOpenCreate(true)} className="px-4 py-2 rounded bg-emerald-600 text-white">Novo produto</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">#</th>
              <th className="py-2">Nome</th>
              <th className="py-2">Categoria</th>
              <th className="py-2">Impressão</th>
              <th className="py-2">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.id}</td>
                <td className="py-2"><a className="text-blue-600 underline" href={`/products/${p.id}`}>{p.name}</a></td>
                <td className="py-2">{p.category?.name}</td>
                <td className="py-2">{p.printing ? `${p.printing.technology} ${p.printing.colors ?? ""}` : "-"}</td>
                <td className="py-2">{p.active ? "Ativo" : "Inativo"}</td>
              </tr>
            ))}
            {!rows.length && (<tr><td className="py-8 text-center text-gray-500" colSpan={5}>Nada encontrado</td></tr>)}
          </tbody>
        </table>
      </div>

      {openCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl space-y-4">
            <h2 className="text-lg font-semibold">Novo produto</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm">Nome</label>
                <input className="border px-3 py-2 rounded w-full"
                  value={form.name} onChange={(e)=>setForm((f:any)=>({...f,name:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm">Categoria</label>
                <select className="border px-3 py-2 rounded w-full"
                  value={form.categoryId} onChange={(e)=>setForm((f:any)=>({...f,categoryId:e.target.value}))}>
                  <option value="">-- selecione --</option>
                  {cats.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm">Impressão (opcional)</label>
                <select className="border px-3 py-2 rounded w-full"
                  value={form.printingId} onChange={(e)=>setForm((f:any)=>({...f,printingId:e.target.value}))}>
                  <option value="">-- sem impressão --</option>
                  {prints.map((p:any)=> <option key={p.id} value={p.id}>{p.technology} {p.colors ?? ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm">Margin default (ex 0.30)</label>
                <input className="border px-3 py-2 rounded w-full"
                  value={form.marginDefault} onChange={(e)=>setForm((f:any)=>({...f,marginDefault:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm">Markup default (ex 0.20)</label>
                <input className="border px-3 py-2 rounded w-full"
                  value={form.markupDefault} onChange={(e)=>setForm((f:any)=>({...f,markupDefault:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm">Rounding step (ex 0.05)</label>
                <input className="border px-3 py-2 rounded w-full"
                  value={form.roundingStep} onChange={(e)=>setForm((f:any)=>({...f,roundingStep:e.target.value}))}/>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded border" onClick={()=>setOpenCreate(false)}>Cancelar</button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={createProduct}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
