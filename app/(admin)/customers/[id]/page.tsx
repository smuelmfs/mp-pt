"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const sp = useSearchParams();
  const router = useRouter();

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"basic"|"prices"|"overrides">("basic");
  const [saving, setSaving] = useState(false);

  // prices
  const [matPrices, setMatPrices] = useState<any[]>([]);
  const [matEditId, setMatEditId] = useState<number | null>(null);
  const [matEditForm, setMatEditForm] = useState<any>({ unitCost: "", priority: "", isCurrent: true, materialId: "" });
  const [prnPrices, setPrnPrices] = useState<any[]>([]);
  const [prnEditId, setPrnEditId] = useState<number | null>(null);
  const [prnEditForm, setPrnEditForm] = useState<any>({ unitPrice: "", priority: "", isCurrent: true, printingId: "", sides: "" });
  const [finPrices, setFinPrices] = useState<any[]>([]);
  const [finEditId, setFinEditId] = useState<number | null>(null);
  const [finEditForm, setFinEditForm] = useState<any>({ baseCost: "", minFee: "", areaStepM2: "", priority: "", isCurrent: true, finishId: "" });
  const [matForm, setMatForm] = useState<any>({ materialId: "", unitCost: "", priority: 100, isCurrent: true });
  const [prnForm, setPrnForm] = useState<any>({ printingId: "", sides: "", unitPrice: "", priority: 100, isCurrent: true });
  const [finForm, setFinForm] = useState<any>({ finishId: "", baseCost: "", minFee: "", areaStepM2: "", priority: 100, isCurrent: true });

  // product overrides
  const [prodOverrides, setProdOverrides] = useState<any[]>([]);
  const [prodForm, setProdForm] = useState<any>({ productId: "", marginDefault: "", markupDefault: "", roundingStep: "", roundingStrategy: "", minPricePerPiece: "", minOrderQty: "", minOrderValue: "", priority: 100, isCurrent: true });
  const [products, setProducts] = useState<any[]>([]);
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [printingList, setPrintingList] = useState<any[]>([]);
  const [finishesList, setFinishesList] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [previewQty, setPreviewQty] = useState<string>("100");
  const [priceCompare, setPriceCompare] = useState<{ normal?: number; customer?: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'mat' | 'prn' | 'fin'; id: number; label: string } | null>(null);
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  async function load() {
    setLoading(true);
    const [c, mats, prns, fins, prods, plist, matsAll, prnAll, finAll] = await Promise.all([
      fetch(`/api/admin/customers/${id}`).then(r=>r.json()),
      fetch(`/api/admin/customer-prices/materials?customerId=${id}`).then(r=>r.json()),
      fetch(`/api/admin/customer-prices/printing?customerId=${id}`).then(r=>r.json()),
      fetch(`/api/admin/customer-prices/finishes?customerId=${id}`).then(r=>r.json()),
      fetch(`/api/admin/product-customer-overrides?customerId=${id}`).then(r=>r.json()),
      fetch(`/api/admin/products`).then(r=>r.json()),
      fetch(`/api/admin/materials`).then(r=>r.json()),
      fetch(`/api/admin/printing`).then(r=>r.json()),
      fetch(`/api/admin/finishes`).then(r=>r.json()),
    ]);
    setCustomer(c);
    setMatPrices(Array.isArray(mats)?mats:[]);
    setPrnPrices(Array.isArray(prns)?prns:[]);
    setFinPrices(Array.isArray(fins)?fins:[]);
    setProdOverrides(Array.isArray(prods)?prods:[]);
    setProducts(Array.isArray(plist)?plist:[]);
    setMaterialsList(Array.isArray(matsAll)?matsAll:[]);
    setPrintingList(Array.isArray(prnAll)?prnAll:[]);
    setFinishesList(Array.isArray(finAll)?finAll:[]);
    setLoading(false);
  }

  // Sync tab with URL (?tab=prices) for better UX and shareable links
  useEffect(() => {
    const t = (sp.get("tab") || "basic").toLowerCase();
    if (t === "basic" || t === "prices" || t === "overrides") setActiveTab(t as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const setTab = useCallback((tab: "basic"|"prices"|"overrides") => {
    setActiveTab(tab);
    const current = new URL(window.location.href);
    current.searchParams.set("tab", tab);
    router.replace(current.pathname + "?" + current.searchParams.toString());
  }, [router]);

  // Keyboard navigation between tabs (ArrowLeft/ArrowRight)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!["ArrowLeft","ArrowRight"].includes(e.key)) return;
      const order: Array<typeof activeTab> = ["basic","prices","overrides"];
      const idx = order.indexOf(activeTab);
      if (idx === -1) return;
      if (e.key === "ArrowLeft" && idx > 0) setTab(order[idx - 1]);
      if (e.key === "ArrowRight" && idx < order.length - 1) setTab(order[idx + 1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTab, setTab]);

  // Counts for badges in tabs
  const counts = useMemo(() => ({
    prices: (matPrices?.length || 0) + (prnPrices?.length || 0) + (finPrices?.length || 0),
    overrides: prodOverrides?.length || 0,
  }), [matPrices, prnPrices, finPrices, prodOverrides]);

  async function saveBasic(patch: any) {
    setSaving(true);
    const res = await fetch(`/api/admin/customers/${id}`, { method: "PATCH", headers: { "content-type":"application/json" }, body: JSON.stringify(patch) });
    setSaving(false);
    if (res.ok) { toast.success("Salvo"); load(); } else toast.error("Erro ao salvar");
  }

  async function addMatPrice() {
    if (!matForm.materialId || !matForm.unitCost) { toast.error("materialId e unitCost são obrigatórios"); return; }
    const res = await fetch(`/api/admin/customer-prices/materials`, { method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify({ customerId: id, materialId: Number(matForm.materialId), unitCost: Number(matForm.unitCost), priority: Number(matForm.priority)||100, isCurrent: !!matForm.isCurrent }) });
    if (res.ok) { toast.success("Preço adicionado"); setMatForm({ materialId: "", unitCost: "", priority: 100, isCurrent: true }); load(); } else toast.error("Erro ao adicionar preço de material");
  }

  async function addPrnPrice() {
    if (!prnForm.printingId || !prnForm.unitPrice) { toast.error("printingId e unitPrice são obrigatórios"); return; }
    const res = await fetch(`/api/admin/customer-prices/printing`, { method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify({ customerId: id, printingId: Number(prnForm.printingId), sides: prnForm.sides?Number(prnForm.sides):null, unitPrice: Number(prnForm.unitPrice), priority: Number(prnForm.priority)||100, isCurrent: !!prnForm.isCurrent }) });
    if (res.ok) { toast.success("Preço adicionado"); setPrnForm({ printingId: "", sides: "", unitPrice: "", priority: 100, isCurrent: true }); load(); } else toast.error("Erro ao adicionar preço de impressão");
  }

  async function addFinPrice() {
    if (!finForm.finishId || !finForm.baseCost) { toast.error("finishId e baseCost são obrigatórios"); return; }
    const res = await fetch(`/api/admin/customer-prices/finishes`, { method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify({ customerId: id, finishId: Number(finForm.finishId), baseCost: Number(finForm.baseCost), minFee: finForm.minFee?Number(finForm.minFee):null, areaStepM2: finForm.areaStepM2?Number(finForm.areaStepM2):null, priority: Number(finForm.priority)||100, isCurrent: !!finForm.isCurrent }) });
    if (res.ok) { toast.success("Preço adicionado"); setFinForm({ finishId: "", baseCost: "", minFee: "", areaStepM2: "", priority: 100, isCurrent: true }); load(); } else toast.error("Erro ao adicionar preço de acabamento");
  }

  async function addProdOverride() {
    if (!prodForm.productId) { toast.error("Produto é obrigatório"); return; }
    const payload: any = {
      productId: Number(prodForm.productId),
      customerId: id,
      priority: Number(prodForm.priority)||100,
      isCurrent: !!prodForm.isCurrent,
    };
    ["marginDefault","markupDefault","roundingStep","minPricePerPiece","minOrderQty","minOrderValue"].forEach(k=>{
      if (prodForm[k]!=="" && prodForm[k]!==null && prodForm[k]!==undefined) payload[k] = Number(prodForm[k]);
    });
    if (prodForm.roundingStrategy) payload.roundingStrategy = prodForm.roundingStrategy;
    const res = await fetch(`/api/admin/product-customer-overrides`, { method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { toast.success("Override adicionado"); setProdForm({ productId: "", marginDefault: "", markupDefault: "", roundingStep: "", roundingStrategy: "", minPricePerPiece: "", minOrderQty: "", minOrderValue: "", priority: 100, isCurrent: true }); load(); } else toast.error("Erro ao adicionar override de produto");
  }

  async function comparePrice() {
    setPriceCompare(null);
    const pid = Number(selectedProductId);
    const qty = Number(previewQty || 0);
    if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) { toast.error("Selecione produto e quantidade válida"); return; }
    try {
      const [normalRes, customerRes] = await Promise.all([
        fetch(`/api/quotes/preview`, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ productId: pid, quantity: qty, choiceIds: [], params: {} }) }),
        fetch(`/api/quotes/preview`, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ productId: pid, quantity: qty, choiceIds: [], params: {}, overrides: { customerId: id } }) }),
      ]);
      const [normal, customer] = await Promise.all([normalRes.json(), customerRes.json()]);
      if (normal?.finalPrice != null || normal?.priceNet != null || customer?.finalPrice != null || customer?.priceNet != null) {
        setPriceCompare({ normal: Number(normal.finalPrice ?? normal.priceNet), customer: Number(customer.finalPrice ?? customer.priceNet) });
      } else {
        toast.error('Não foi possível obter os preços de comparação');
      }
    } catch (e) {
      toast.error('Erro ao comparar preços');
    }
  }

  async function deleteCustomer() {
    setDeletingCustomer(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Cliente eliminado com sucesso");
        router.push("/customers");
      } else {
        const errorData = await res.json().catch(() => ({}));
        // Extrai mensagem de erro do objeto Zod ou erro genérico
        let errorMessage = "Falha ao eliminar cliente";
        
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error.formErrors && errorData.error.formErrors.length > 0) {
            errorMessage = errorData.error.formErrors[0];
          } else if (errorData.error.fieldErrors) {
            const firstField = Object.keys(errorData.error.fieldErrors)[0];
            const firstError = errorData.error.fieldErrors[firstField];
            if (Array.isArray(firstError) && firstError.length > 0) {
              errorMessage = `${firstField}: ${firstError[0]}`;
            }
          }
        }
        
        toast.error(errorMessage);
      }
    } finally {
      setDeletingCustomer(false);
      setConfirmDeleteCustomer(false);
    }
  }

  useEffect(()=>{ if (Number.isFinite(id)) load(); }, [id]);
  if (!Number.isFinite(id)) return <main className="p-6">ID inválido</main>;
  if (loading) return <main className="p-6">Carregando…</main>;
  if (customer?.error) return <main className="p-6 text-red-600">{customer.error}</main>;

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      <ConfirmDialog
        open={confirmDeleteCustomer}
        onOpenChange={setConfirmDeleteCustomer}
        title="Eliminar Cliente"
        description={`Tem a certeza que deseja eliminar o cliente "${customer?.name}"? Esta ação irá desativar o cliente.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={deleteCustomer}
        loading={deletingCustomer}
      />
      <AlertDialog open={!!confirmDelete} onOpenChange={(open)=>{ if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar este preço?
            </AlertDialogDescription>
            {confirmDelete?.label && (
              <div className="mt-1 text-sm text-muted-foreground px-6">{confirmDelete.label}</div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async()=>{
              if (!confirmDelete) return;
              if (confirmDelete.type==='mat') await fetch(`/api/admin/customer-prices/materials/${confirmDelete.id}`, { method:'DELETE' });
              if (confirmDelete.type==='prn') await fetch(`/api/admin/customer-prices/printing/${confirmDelete.id}`, { method:'DELETE' });
              if (confirmDelete.type==='fin') await fetch(`/api/admin/customer-prices/finishes/${confirmDelete.id}`, { method:'DELETE' });
              toast.success('Eliminado');
              setConfirmDelete(null); load();
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
            <Link href="/customers" className="hover:text-gray-900">Clientes</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-900 uppercase">{customer?.name ?? "Detalhe"}</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 uppercase">{customer?.name || "Cliente"}</h1>
              <p className="text-gray-600 mt-2">Gerir preços específicos e overrides por produto</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDeleteCustomer(true)}
                className="inline-flex items-center px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </button>
              <Link href="/customers" className="text-sm text-gray-600">Voltar</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <nav className="flex space-x-0" aria-label="Tabs" role="tablist">
            {(["basic","prices","overrides"] as const).map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab===tab}
                aria-controls={`panel-${tab}`}
                onClick={()=>setTab(tab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab===tab?"border-[#F66807] text-[#F66807] bg-[#F6EEE8]":"border-transparent text-[#341601] hover:text-[#F66807] hover:border-[#F66807]"}`}
              >
                {tab.toUpperCase()}
                {tab!=='basic' && (
                  <span className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {tab==='prices' ? counts.prices : counts.overrides}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-6">
          {activeTab==="basic" && (
            <div id="panel-basic" role="tabpanel" className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input 
                defaultValue={customer.name} 
                onBlur={e=>{
                  const value = (e.target as HTMLInputElement).value.trim().toUpperCase();
                  saveBasic({ name: value });
                }}
                onChange={e=>{
                  const input = e.target as HTMLInputElement;
                  input.value = input.value.toUpperCase();
                }}
                style={{ textTransform: "uppercase" }}
              />
              <Input defaultValue={customer.email||""} placeholder="Email" onBlur={e=>saveBasic({ email: (e.target as HTMLInputElement).value||null })} />
              <Input defaultValue={customer.taxId||""} placeholder="Tax ID" onBlur={e=>saveBasic({ taxId: (e.target as HTMLInputElement).value||null })} />
              <label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked={customer.isActive} onCheckedChange={(v)=>saveBasic({ isActive: !!v })} /> Ativo</label>
            </div>
          )}

          {activeTab==="prices" && (
            <div id="panel-prices" role="tabpanel" className="space-y-8">
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Materiais</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <Select value={matForm.materialId} onValueChange={(v)=>setMatForm({...matForm,materialId:v})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialsList.filter((m:any)=> !matPrices.some((r:any)=> r.materialId===m.id)).map((m:any)=>(
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Custo unitário (€)" value={matForm.unitCost} onChange={e=>setMatForm({...matForm,unitCost:e.target.value})} />
                  <div className="hidden" />
                  <label className="text-sm flex items-center gap-2"><Checkbox checked={matForm.isCurrent} onCheckedChange={(v)=>setMatForm({...matForm,isCurrent:!!v})}/> Ativo</label>
                  <Button onClick={addMatPrice} className="h-9 justify-self-end">Adicionar</Button>
                </div>
                <div className="mt-3 border rounded">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-[#F6EEE8] border-b text-gray-700"><th className="p-2 text-left font-medium">Material</th><th className="p-2 text-left font-medium">Custo unitário</th><th className="p-2 text-left font-medium">Prioridade</th><th className="p-2 text-left font-medium">Estado</th><th className="p-2 text-left font-medium">Ações</th></tr></thead>
                    <tbody>
                      {matPrices.map((r:any)=>{
                        const name = materialsList.find((m:any)=>m.id===r.materialId)?.name || r.materialId;
                        const isEditing = matEditId === r.id;
                        return (
                          <tr key={r.id} className="border-b hover:bg-white">
                            <td className="p-2">{isEditing ? (
                              <select className="w-full px-2 py-1 border rounded" value={matEditForm.materialId} onChange={e=>setMatEditForm({...matEditForm, materialId: e.target.value})}>
                                <option value="">(manter)</option>
                                {materialsList.map((m:any)=>(<option key={m.id} value={m.id}>{m.name}</option>))}
                              </select>
                            ) : name}</td>
                            <td className="p-2">{isEditing ? (<input className="w-full px-2 py-1 border rounded" value={matEditForm.unitCost} onChange={e=>setMatEditForm({...matEditForm,unitCost:e.target.value})} placeholder={String(r.unitCost)} />) : r.unitCost}</td>
                            <td className="p-2">{isEditing ? (<input className="w-full px-2 py-1 border rounded" value={matEditForm.priority} onChange={e=>setMatEditForm({...matEditForm,priority:e.target.value})} placeholder={String(r.priority)} />) : r.priority}</td>
                            <td className="p-2">{isEditing ? (<label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={matEditForm.isCurrent ?? r.isCurrent} onChange={e=>setMatEditForm({...matEditForm,isCurrent:e.target.checked})}/> Ativo</label>) : (r.isCurrent?"Atual":"Inativo")}</td>
                            <td className="p-2">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <Button title="Guardar" size="icon" onClick={async()=>{
                                    await fetch(`/api/admin/customer-prices/materials/${r.id}`, { method: 'PATCH', headers: { 'content-type':'application/json' }, body: JSON.stringify({
                                      materialId: matEditForm.materialId || undefined,
                                      unitCost: matEditForm.unitCost || undefined,
                                      priority: matEditForm.priority || undefined,
                                      isCurrent: matEditForm.isCurrent,
                                    })});
                                    setMatEditId(null); setMatEditForm({ unitCost: "", priority: "", isCurrent: true, materialId: "" }); load();
                                  }}>
                                    <Check className="size-4" />
                                  </Button>
                                  <Button title="Cancelar" variant="outline" size="icon" onClick={()=>{ setMatEditId(null); setMatEditForm({ unitCost: "", priority: "", isCurrent: true, materialId: "" }); }}>
                                    <X className="size-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button title="Editar" variant="outline" size="icon" onClick={()=>{ setMatEditId(r.id); setMatEditForm({ unitCost: '', priority: '', isCurrent: r.isCurrent, materialId: '' }); }}>
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button title="Eliminar" variant="destructive" size="icon" onClick={()=> setConfirmDelete({ type:'mat', id: r.id, label: String(name) })}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Impressão</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <Select value={prnForm.printingId} onValueChange={(v)=>setPrnForm({...prnForm,printingId:v})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a impressão" />
                    </SelectTrigger>
                    <SelectContent>
                      {printingList.map((p:any)=>(
                        <SelectItem key={p.id} value={String(p.id)}>{p.formatLabel || `${p.technology} ${p.colors??""}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Lados (opcional)" value={prnForm.sides} onChange={e=>setPrnForm({...prnForm,sides:e.target.value})} />
                  <Input placeholder="Preço unitário (€)" value={prnForm.unitPrice} onChange={e=>setPrnForm({...prnForm,unitPrice:e.target.value})} />
                  <div className="hidden" />
                  <label className="text-sm flex items-center gap-2"><Checkbox checked={prnForm.isCurrent} onCheckedChange={(v)=>setPrnForm({...prnForm,isCurrent:!!v})}/> Ativo</label>
                  <Button onClick={addPrnPrice} className="h-9 justify-self-end">Adicionar</Button>
                </div>
                <div className="mt-3 border rounded">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-[#F6EEE8] border-b text-gray-700"><th className="p-2 text-left font-medium">Impressão</th><th className="p-2 text-left font-medium">Lados</th><th className="p-2 text-left font-medium">Preço unitário</th><th className="p-2 text-left font-medium">Prioridade</th><th className="p-2 text-left font-medium">Estado</th><th className="p-2 text-left font-medium">Ações</th></tr></thead>
                    <tbody>
                      {prnPrices.map((r:any)=>{
                        const label = printingList.find((p:any)=>p.id===r.printingId);
                        const name = label ? (label.formatLabel || `${label.technology} ${label.colors??""}`) : r.printingId;
                        const isEditing = prnEditId === r.id;
                        return (
                          <tr key={r.id} className="border-b hover:bg-white">
                            <td className="p-2">{isEditing ? (
                              <select className="w-full px-2 py-1 border rounded" value={prnEditForm.printingId} onChange={e=>setPrnEditForm({...prnEditForm, printingId: e.target.value})}>
                                <option value="">(manter)</option>
                                {printingList.map((p:any)=>(<option key={p.id} value={p.id}>{p.formatLabel || `${p.technology} ${p.colors??""}`}</option>))}
                              </select>
                            ) : name}</td>
                            <td className="p-2">{isEditing ? (<input className="w-full px-2 py-1 border rounded" value={prnEditForm.sides} onChange={e=>setPrnEditForm({...prnEditForm,sides:e.target.value})} placeholder={r.sides??''} />) : (r.sides??"-")}</td>
                            <td className="p-2">{isEditing ? (<input className="w-full px-2 py-1 border rounded" value={prnEditForm.unitPrice} onChange={e=>setPrnEditForm({...prnEditForm,unitPrice:e.target.value})} placeholder={String(r.unitPrice)} />) : r.unitPrice}</td>
                            <td className="p-2">{isEditing ? (<input className="w-full px-2 py-1 border rounded" value={prnEditForm.priority} onChange={e=>setPrnEditForm({...prnEditForm,priority:e.target.value})} placeholder={String(r.priority)} />) : r.priority}</td>
                            <td className="p-2">{isEditing ? (<label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={prnEditForm.isCurrent ?? r.isCurrent} onChange={e=>setPrnEditForm({...prnEditForm,isCurrent:e.target.checked})}/> Ativo</label>) : (r.isCurrent?"Atual":"Inativo")}</td>
                            <td className="p-2">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <Button title="Guardar" size="icon" onClick={async()=>{
                                    await fetch(`/api/admin/customer-prices/printing/${r.id}`, { method: 'PATCH', headers: { 'content-type':'application/json' }, body: JSON.stringify({
                                      printingId: prnEditForm.printingId || undefined,
                                      sides: prnEditForm.sides || undefined,
                                      unitPrice: prnEditForm.unitPrice || undefined,
                                      priority: prnEditForm.priority || undefined,
                                      isCurrent: prnEditForm.isCurrent,
                                    })});
                                    setPrnEditId(null); setPrnEditForm({ unitPrice: '', priority: '', isCurrent: true, printingId: '', sides: '' }); load();
                                  }}>
                                    <Check className="size-4" />
                                  </Button>
                                  <Button title="Cancelar" variant="outline" size="icon" onClick={()=>{ setPrnEditId(null); setPrnEditForm({ unitPrice: '', priority: '', isCurrent: true, printingId: '', sides: '' }); }}>
                                    <X className="size-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button title="Editar" variant="outline" size="icon" onClick={()=>{ setPrnEditId(r.id); setPrnEditForm({ unitPrice: '', priority: '', isCurrent: r.isCurrent, printingId: '', sides: '' }); }}>
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button title="Eliminar" variant="destructive" size="icon" onClick={()=> setConfirmDelete({ type:'prn', id: r.id, label: String(name) })}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Acabamentos</h3>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                  <Select value={finForm.finishId} onValueChange={(v)=>setFinForm({...finForm,finishId:v})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o acabamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {finishesList.filter((f:any)=> !finPrices.some((r:any)=> r.finishId===f.id)).map((f:any)=>(
                        <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Custo base (€)" value={finForm.baseCost} onChange={e=>setFinForm({...finForm,baseCost:e.target.value})} />
                  <Input placeholder="Taxa mínima (€)" value={finForm.minFee} onChange={e=>setFinForm({...finForm,minFee:e.target.value})} />
                  <Input placeholder="Passo m²" value={finForm.areaStepM2} onChange={e=>setFinForm({...finForm,areaStepM2:e.target.value})} />
                  <div className="hidden" />
                  <label className="text-sm flex items-center gap-2"><Checkbox checked={finForm.isCurrent} onCheckedChange={(v)=>setFinForm({...finForm,isCurrent:!!v})}/> Ativo</label>
                  <Button onClick={addFinPrice} className="h-9 justify-self-end">Adicionar</Button>
                </div>
                <div className="mt-3 border rounded">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-[#F6EEE8] border-b text-gray-700"><th className="p-2 text-left font-medium">Acabamento</th><th className="p-2 text-left font-medium">Custo base</th><th className="p-2 text-left font-medium">Taxa mínima</th><th className="p-2 text-left font-medium">Passo m²</th><th className="p-2 text-left font-medium">Prioridade</th><th className="p-2 text-left font-medium">Estado</th><th className="p-2 text-left font-medium">Ações</th></tr></thead>
                    <tbody>
                      {finPrices.map((r:any)=>{
                        const name = finishesList.find((f:any)=>f.id===r.finishId)?.name || r.finishId;
                        const isEditing = finEditId === r.id;
                        return (
                          <tr key={r.id} className="border-b hover:bg-white">
                            <td className="p-2">{isEditing ? (
                              <select className="w-full px-2 py-1 border rounded" value={finEditForm.finishId} onChange={e=>setFinEditForm({...finEditForm, finishId: e.target.value})}>
                                <option value="">(manter)</option>
                                {finishesList.map((f:any)=>(<option key={f.id} value={f.id}>{f.name}</option>))}
                              </select>
                            ) : name}</td>
                            <td className="p-2">{isEditing ? (<input className="w-full px-2 py-1 border rounded" value={finEditForm.baseCost} onChange={e=>setFinEditForm({...finEditForm,baseCost:e.target.value})} placeholder={String(r.baseCost)} />) : r.baseCost}</td>
                            <td className="p-2">{isEditing ? (<input className="w-full px-2 py-1 border rounded" value={finEditForm.minFee} onChange={e=>setFinEditForm({...finEditForm,minFee:e.target.value})} placeholder={r.minFee??''} />) : (r.minFee??"-")}</td>
                            <td className="p-2">{isEditing ? (<input className="w-full px-2 py-1 border rounded" value={finEditForm.areaStepM2} onChange={e=>setFinEditForm({...finEditForm,areaStepM2:e.target.value})} placeholder={r.areaStepM2??''} />) : (r.areaStepM2??"-")}</td>
                            <td className="p-2">{isEditing ? (<input className="w-full px-2 py-1 border rounded" value={finEditForm.priority} onChange={e=>setFinEditForm({...finEditForm,priority:e.target.value})} placeholder={String(r.priority)} />) : r.priority}</td>
                            <td className="p-2">{isEditing ? (<label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={finEditForm.isCurrent ?? r.isCurrent} onChange={e=>setFinEditForm({...finEditForm,isCurrent:e.target.checked})}/> Ativo</label>) : (r.isCurrent?"Atual":"Inativo")}</td>
                            <td className="p-2">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <Button title="Guardar" size="icon" onClick={async()=>{
                                    await fetch(`/api/admin/customer-prices/finishes/${r.id}`, { method: 'PATCH', headers: { 'content-type':'application/json' }, body: JSON.stringify({
                                      finishId: finEditForm.finishId || undefined,
                                      baseCost: finEditForm.baseCost || undefined,
                                      minFee: finEditForm.minFee || undefined,
                                      areaStepM2: finEditForm.areaStepM2 || undefined,
                                      priority: finEditForm.priority || undefined,
                                      isCurrent: finEditForm.isCurrent,
                                    })});
                                    setFinEditId(null); setFinEditForm({ baseCost: '', minFee: '', areaStepM2: '', priority: '', isCurrent: true, finishId: '' }); load();
                                  }}>
                                    <Check className="size-4" />
                                  </Button>
                                  <Button title="Cancelar" variant="outline" size="icon" onClick={()=>{ setFinEditId(null); setFinEditForm({ baseCost: '', minFee: '', areaStepM2: '', priority: '', isCurrent: true, finishId: '' }); }}>
                                    <X className="size-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button title="Editar" variant="outline" size="icon" onClick={()=>{ setFinEditId(r.id); setFinEditForm({ baseCost: '', minFee: '', areaStepM2: '', priority: '', isCurrent: r.isCurrent, finishId: '' }); }}>
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button title="Eliminar" variant="destructive" size="icon" onClick={()=> setConfirmDelete({ type:'fin', id: r.id, label: String(name) })}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab==="overrides" && (
            <div id="panel-overrides" role="tabpanel">
              {/* Bloco 1: Comparação rápida */}
              <div className="mb-4 p-4 border rounded-lg bg-[#F6EEE8]">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Comparar preço por Produto</h3>
                <p className="text-sm text-gray-600 mb-3">Escolha um produto e uma quantidade para ver o preço normal vs o preço com regras deste cliente.</p>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <Select value={selectedProductId} onValueChange={(v)=>setSelectedProductId(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p:any)=>(
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Quantidade" value={previewQty} onChange={e=>setPreviewQty(e.target.value)} />
                  <Button onClick={comparePrice} className="h-9 justify-self-end">Comparar</Button>
                  {priceCompare && (
                    <div className="md:col-span-2 text-sm">
                      <div className="mb-1">Preço Normal: <strong>{priceCompare.normal?.toFixed(2)} €</strong></div>
                      <div>Preço deste Cliente: <strong>{priceCompare.customer?.toFixed(2)} €</strong></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloco 2: Criar/editar overrides de preço do produto para este cliente */}
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Regras de preço por produto (Overrides)</h3>
                <p className="text-sm text-gray-600">Preencha apenas os campos que deseja sobrepor. Os campos em branco continuam a usar as regras do produto/categoria/global.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <Select value={prodForm.productId} onValueChange={(v)=>setProdForm({...prodForm,productId:v})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Produto *" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p:any)=>(
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Margem (ex: 0.25)" value={prodForm.marginDefault} onChange={e=>setProdForm({...prodForm,marginDefault:e.target.value})} />
                <Input placeholder="Markup (ex: 0.10)" value={prodForm.markupDefault} onChange={e=>setProdForm({...prodForm,markupDefault:e.target.value})} />
                <Input placeholder="Passo de arredondamento (ex: 0.05)" value={prodForm.roundingStep} onChange={e=>setProdForm({...prodForm,roundingStep:e.target.value})} />
                <Select value={prodForm.roundingStrategy} onValueChange={(v)=>setProdForm({...prodForm,roundingStrategy:v})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Estratégia de arredondamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="END_ONLY">END_ONLY (só no final)</SelectItem>
                    <SelectItem value="PER_STEP">PER_STEP (por linha)</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addProdOverride} className="h-9 justify-self-end">Adicionar</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-3 items-end">
                <Input placeholder="Preço mínimo por peça (€)" value={prodForm.minPricePerPiece} onChange={e=>setProdForm({...prodForm,minPricePerPiece:e.target.value})} />
                <Input placeholder="Quantidade mínima" value={prodForm.minOrderQty} onChange={e=>setProdForm({...prodForm,minOrderQty:e.target.value})} />
                <Input placeholder="Valor mínimo do pedido (€)" value={prodForm.minOrderValue} onChange={e=>setProdForm({...prodForm,minOrderValue:e.target.value})} />
                <Input placeholder="Prioridade (menor vence)" value={prodForm.priority} onChange={e=>setProdForm({...prodForm,priority:e.target.value})} />
                <label className="text-sm flex items-center gap-2"><Checkbox checked={prodForm.isCurrent} onCheckedChange={(v)=>setProdForm({...prodForm,isCurrent:!!v})}/> Ativo</label>
              </div>
              <div className="mt-4 border rounded">
                <table className="w-full text-sm">
                  <thead><tr className="bg-[#F6EEE8] border-b text-gray-700"><th className="p-2 text-left font-medium">Produto</th><th className="p-2 text-left font-medium">Margem</th><th className="p-2 text-left font-medium">Markup</th><th className="p-2 text-left font-medium">Passo</th><th className="p-2 text-left font-medium">Min €/peça</th><th className="p-2 text-left font-medium">Prioridade</th></tr></thead>
                  <tbody>
                    {prodOverrides.map((r:any)=>{
                      const name = products.find((p:any)=>p.id===r.productId)?.name || r.productId;
                      return (
                        <tr key={r.id} className="border-b hover:bg-white"><td className="p-2">{name}</td><td className="p-2">{r.marginDefault??"-"}</td><td className="p-2">{r.markupDefault??"-"}</td><td className="p-2">{r.roundingStep??"-"}</td><td className="p-2">{r.minPricePerPiece??"-"}</td><td className="p-2">{r.priority}</td></tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </main>
  );
}


