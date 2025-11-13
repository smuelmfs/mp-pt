"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MaterialDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [supplierType, setSupplierType] = useState<"existing" | "new" | "none">("none");
  const router = useRouter();

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
    // Define o tipo de fornecedor baseado nos dados carregados
    if (json.supplier?.id) {
      setSupplierType("existing");
    } else {
      setSupplierType("none");
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
      const payload: any = { ...formData };
      // resolver supplierId baseado no tipo selecionado
      if (supplierType === "none") {
        payload.supplierId = null;
        payload.supplierUnitCost = null;
      } else if (supplierType === "existing" && (payload as any).supplierId) {
        payload.supplierId = Number((payload as any).supplierId);
      } else if (supplierType === "existing" && !(payload as any).supplierId) {
        payload.supplierId = null;
      } else if (supplierType === "new" && (payload as any).supplierName) {
        const typedName: string = (payload as any).supplierName.trim();
        const existing = suppliers.find((s:any)=> String(s.name).toLowerCase() === typedName.toLowerCase());
        if (existing) {
          payload.supplierId = existing.id;
        } else {
          const supRes = await fetch('/api/admin/suppliers', {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: typedName })
          });
          if (supRes.ok) {
            const sup = await supRes.json();
            payload.supplierId = sup?.id ?? null;
          }
        }
        delete payload.supplierName;
      }

      // Remove campos auxiliares antes de enviar (se existirem)
      delete payload.supplierRollCost;
      delete payload.supplierRollWidth;
      delete payload.supplierRollLength;
      delete payload.supplierRollQuantity;

      await fetch(`/api/admin/materials/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setHasChanges(false);
      // Recarregar fornecedores caso um novo tenha sido criado
      if (supplierType === "new") {
        fetch("/api/admin/suppliers?activeOnly=1")
          .then(r => r.json())
          .then(setSuppliers)
          .catch(() => {});
      }
      load();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    fetch("/api/admin/suppliers?activeOnly=1")
      .then(r => r.json())
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, []);

  // Calcula o resumo de custos (deve estar antes de qualquer return condicional)
  const costSummary = useMemo(() => {
    if (!row) return null;
    
    const finalSupplierCost = formData.supplierUnitCost ? String(formData.supplierUnitCost) : (row.supplierUnitCost ? String(row.supplierUnitCost) : null);
    const unitCostValue = Number(formData.unitCost || row.unitCost || 0);
    const supplierCostValue = finalSupplierCost ? Number(finalSupplierCost) : 0;
    const totalCost = unitCostValue + supplierCostValue;
    
    if (!unitCostValue && !supplierCostValue) return null;
    
    const unitLabel = row.unit === "M2" ? "m²" : row.unit === "SHEET" ? "folha" : row.unit === "UNIT" ? "unidade" : row.unit.toLowerCase();
    
    return {
      unitCostValue,
      supplierCostValue,
      totalCost,
      unitLabel,
    };
  }, [formData, row]);

  // Mantém função patch para compatibilidade
  async function patch(patch: any) {
    setFormData({ ...formData, ...patch });
    setHasChanges(true);
  }

  async function addVariant() {
    if (!vf.label) {
      toast.error("Informe o rótulo da variante.");
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
      toast.success("Variante criada com sucesso!");
      setVf({ label: "", gramagem: "", widthMm: "", heightMm: "", sheetsPerPack: "", packPrice: "", unitPrice: "" });
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      toast.error("Erro: " + (j.error?.message || "Falha ao criar variante"));
    }
  }

  async function deleteMaterial() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/materials/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Material eliminado com sucesso");
        router.push("/materials");
      } else {
        const j = await res.json();
        toast.error(j.error || "Falha ao eliminar material");
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
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
      <main className="min-h-screen bg-[#F6EEE8] p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-red-600">ID inválido</div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F6EEE8] p-6">
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
      <main className="min-h-screen bg-[#F6EEE8] p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-red-600">{row.error}</div>
        </div>
      </main>
    );
  }

  const variants = Array.isArray(row?.variants) ? row.variants : [];

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar Material"
        description={`Tem a certeza que deseja eliminar o material "${row?.name}"? Esta ação irá desativar o material.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={deleteMaterial}
        loading={deleting}
      />
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/materials" className="text-gray-600 hover:text-[#F66807] transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{row.name}</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Detalhes e configurações do material</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-red-700 transition-colors flex-1 sm:flex-initial"
              >
                <Trash2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
              <button
                onClick={saveChanges}
                disabled={saving || !hasChanges}
                className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-[#F66807] text-white text-sm sm:text-base font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Salvando...</span>
                    <span className="sm:hidden">Salvando</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="hidden sm:inline">Salvar Alterações</span>
                    <span className="sm:hidden">Salvar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Informações Básicas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome
              </label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                defaultValue={row.name}
                onBlur={(e) => patch({ name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                defaultValue={row.type}
                onBlur={(e) => patch({ type: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidade
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Fornecedor (opcional)
              </label>
              <RadioGroup 
                value={supplierType} 
                onValueChange={(value) => {
                  setSupplierType(value as "existing" | "new" | "none");
                  if (value === "none") {
                    patch({ supplierId: null, supplierName: "", supplierUnitCost: null });
                  } else if (value === "existing") {
                    if (row?.supplier?.id) {
                      patch({ supplierId: String(row.supplier.id), supplierName: "" });
                    } else {
                      patch({ supplierId: "", supplierName: "" });
                    }
                  } else {
                    patch({ supplierId: "", supplierName: "" });
                  }
                }} 
                className="space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="none" id="supplier-none-edit" />
                    <Label htmlFor="supplier-none-edit" className="font-semibold text-[#341601] cursor-pointer text-base">
                      Sem Fornecedor
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="existing" id="supplier-existing-edit" />
                    <Label htmlFor="supplier-existing-edit" className="font-semibold text-[#341601] cursor-pointer text-base">
                      Fornecedor Cadastrado
                    </Label>
                  </div>
                  {supplierType === "existing" && (
                    <div className="ml-8 mt-3">
                      <Select
                        value={formData.supplierId ? String(formData.supplierId) : ""}
                        onValueChange={(value) => patch({ supplierId: value, supplierName: "" })}
                      >
                        <SelectTrigger className="w-full h-11 border-2 border-gray-300 bg-white text-gray-900 shadow-sm hover:border-gray-400">
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                        <SelectContent 
                          className="max-h-[200px]" 
                          position="popper"
                          sideOffset={4}
                          align="start"
                        >
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="new" id="supplier-new-edit" />
                    <Label htmlFor="supplier-new-edit" className="font-semibold text-[#341601] cursor-pointer text-base">
                      Novo Fornecedor
                    </Label>
                  </div>
                  {supplierType === "new" && (
                    <div className="ml-8 mt-3">
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] h-11"
                        value={formData.supplierName || ""}
                        onChange={(e) => patch({ supplierName: e.target.value, supplierId: "" })}
                        placeholder="Nome do novo fornecedor"
                      />
                      <p className="text-xs text-gray-500 mt-2 ml-1">
                        O fornecedor será criado automaticamente ao salvar o material
                      </p>
                    </div>
                  )}
                </div>
              </RadioGroup>
            </div>

            {supplierType !== "none" && (
              <div>
                <label className="block text-sm font-medium text-[#341601] mb-2">Custo do Fornecedor (opcional)</label>
                <input
                  type="number"
                  step="0.0001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] h-11"
                  value={formData.supplierUnitCost != null ? String(formData.supplierUnitCost) : ""}
                  onChange={(e) => patch({ supplierUnitCost: e.target.value || null })}
                  placeholder="0.0000"
                />
                <p className="text-xs text-gray-500 mt-1">Custo por unidade do fornecedor</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Custo Unitário (€)</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                defaultValue={row.unitCost}
                onBlur={(e) => patch({ unitCost: e.target.value })}
              />
            </div>
            
            <div className="flex items-center pt-8">
              <input
                type="checkbox"
                defaultChecked={row.active}
                onChange={(e) => patch({ active: e.target.checked })}
                className="h-4 w-4 text-[#F66807] focus:ring-[#F66807] border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm font-medium text-gray-700">
                Material ativo
              </label>
            </div>
          </div>
        </div>

        {/* Variantes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Variantes</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Gerencie as variações deste material</p>
            </div>
          </div>

          {variants.length > 0 ? (
            <div className="overflow-x-auto mb-4 sm:mb-6 -mx-4 sm:mx-0">
              <div className="min-w-full inline-block align-middle">
                <table className="w-full text-xs sm:text-sm">
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
                    <tr key={v.id} className="hover:bg-white">
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
          <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-[#F6EEE8]">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Adicionar Nova Variante</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Label *
                </label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                  value={vf.unitPrice}
                  onChange={(e) => setVf((s: any) => ({ ...s, unitPrice: e.target.value }))}
                  placeholder="0.05"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  className="w-full px-6 py-3 bg-[#F66807] text-white rounded-lg hover:bg-[#F66807]/90 transition-colors font-medium"
                  onClick={addVariant}
                >
                  Adicionar Variante
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo de Custos */}
        {costSummary && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo de Custos</h2>
            <div className="space-y-3">
              {costSummary.unitCostValue > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Custo Unitário:</span>
                  <span className="font-semibold text-gray-900">
                    €{costSummary.unitCostValue.toFixed(4)} / {costSummary.unitLabel}
                  </span>
                </div>
              )}
              {costSummary.supplierCostValue > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Custo do Fornecedor:</span>
                  <span className="font-semibold text-gray-900">
                    €{costSummary.supplierCostValue.toFixed(4)} / {costSummary.unitLabel}
                  </span>
                </div>
              )}
              {(costSummary.unitCostValue > 0 || costSummary.supplierCostValue > 0) && (
                <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Total:</span>
                  <span className="font-bold text-gray-900 text-base">
                    €{costSummary.totalCost.toFixed(4)} / {costSummary.unitLabel}
                  </span>
                </div>
              )}
              {variants.length > 0 && (
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Variantes ({variants.length}):</p>
                  <div className="space-y-2">
                    {variants.map((v: any) => {
                      const variantUnitCost = v.unitPrice ? Number(v.unitPrice) : (v.packPrice && v.sheetsPerPack ? Number(v.packPrice) / Number(v.sheetsPerPack) : 0);
                      const variantTotal = variantUnitCost + costSummary.supplierCostValue;
                      return (
                        <div key={v.id} className="bg-[#F6EEE8] rounded-lg p-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700">{v.label}</span>
                            {v.gramagem && <span className="text-gray-500">{v.gramagem}g</span>}
                          </div>
                          {variantUnitCost > 0 && (
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>Custo Variante:</span>
                              <span>€{variantUnitCost.toFixed(4)} / {costSummary.unitLabel}</span>
                            </div>
                          )}
                          {costSummary.supplierCostValue > 0 && (
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>Custo Fornecedor:</span>
                              <span>€{costSummary.supplierCostValue.toFixed(4)} / {costSummary.unitLabel}</span>
                            </div>
                          )}
                          {(variantUnitCost > 0 || costSummary.supplierCostValue > 0) && (
                            <div className="flex items-center justify-between text-xs pt-2 mt-2 border-t border-gray-200">
                              <span className="font-medium text-gray-700">Total Variante:</span>
                              <span className="font-semibold text-gray-900">€{variantTotal.toFixed(4)} / {costSummary.unitLabel}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
