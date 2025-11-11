"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'basic' | 'materials' | 'finishes' | 'dimensions'>('basic');
  const [formData, setFormData] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // dimensões do produto
  const [dimensions, setDimensions] = useState<any[]>([]);
  
  // form para dimensões
  const [dimensionForm, setDimensionForm] = useState<any>({
    name: "",
    widthMm: "",
    heightMm: "",
    description: "",
    order: 0
  });

  // toast para feedback
  const [localToast, setLocalToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [removingDimension, setRemovingDimension] = useState<number | null>(null);
  const [removingQuantity, setRemovingQuantity] = useState<number | null>(null);
  const [addingQuantity, setAddingQuantity] = useState(false);
  const [addingDimension, setAddingDimension] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  function showSuccessToast(message: string) {
    setLocalToast({ type: 'success', message });
    setTimeout(() => setLocalToast(null), 3000);
  }

  function showErrorToast(message: string) {
    setLocalToast({ type: 'error', message });
    setTimeout(() => setLocalToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const [prodRes, cRes, prRes, mRes, fRes, quantitiesRes, dimensionsRes] = await Promise.all([
      fetch(`/api/admin/products/${id}`),
      fetch(`/api/admin/categories`),
      fetch(`/api/admin/printing`),
      fetch(`/api/admin/materials?withVariants=1`), // ⚠️ carrega materiais com variantes
      fetch(`/api/admin/finishes`),
      fetch(`/api/admin/products/${id}/suggested-quantities`),
      fetch(`/api/admin/products/${id}/dimensions`),
    ]);

    const [prod, categories, printings, mats, fins, quantities, dimensions] = await Promise.all([
      prodRes.json(),
      cRes.json(),
      prRes.json(),
      mRes.json(),
      fRes.json(),
      quantitiesRes.json(),
      dimensionsRes.json(),
    ]);

    setRow(prod);
    setFormData(prod);
    setCats(Array.isArray(categories) ? categories : []);
    setPrints(Array.isArray(printings) ? printings : []);
    setMaterials(Array.isArray(mats) ? mats : []);     // blindagem
    setFinishes(Array.isArray(fins) ? fins : []);      // blindagem
    setSuggestedQuantities(Array.isArray(quantities) ? quantities : []);
    setDimensions(Array.isArray(dimensions) ? dimensions : []);
    
    // Debug: verificar se as dimensões estão sendo carregadas
    console.log('Dimensions loaded:', dimensions);
    console.log('Dimensions response status:', dimensionsRes.status);
    setLoading(false);
  }

  useEffect(() => {
    if (Number.isFinite(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleChange(field: string, value: any) {
    setFormData({ ...formData, [field]: value });
    setHasChanges(true);
  }

  async function saveChanges() {
    setSaving(true);
    try {
      await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formData),
      });
      setHasChanges(false);
      load();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showErrorToast("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }

  // Mantém função update para compatibilidade
  async function update(patch: any) {
    setFormData({ ...formData, ...patch });
    setHasChanges(true);
  }

  async function deleteProduct() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Produto eliminado com sucesso");
        router.push("/products");
      } else {
        const j = await res.json();
        toast.error(j.error || "Falha ao eliminar produto");
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  // criar/atualizar composição
  async function addMaterial() {
    if (!pmForm.materialId || !pmForm.qtyPerUnit) {
      showErrorToast("Escolha um material e informe Qty/Un.");
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
      showErrorToast("Erro: " + (j.error?.message || "Falha ao salvar material"));
    }
  }

  async function removePM(idPM: number) {
    await fetch(`/api/admin/product-materials/${idPM}`, { method: "DELETE" });
    load();
  }

  async function addFinish() {
    if (!pfForm.finishId) {
      showErrorToast("Escolha um acabamento.");
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
      showErrorToast("Erro: " + (j.error?.message || "Falha ao salvar acabamento"));
    }
  }

  async function removePF(idPF: number) {
    await fetch(`/api/admin/product-finishes/${idPF}`, { method: "DELETE" });
    load();
  }

  // gerenciar dimensões
  async function addDimension() {
    if (!dimensionForm.name || !dimensionForm.widthMm || !dimensionForm.heightMm) {
      showErrorToast("Preencha nome, largura e altura da dimensão.");
      return;
    }

    // Validações adicionais
    if (Number(dimensionForm.widthMm) <= 0 || Number(dimensionForm.heightMm) <= 0) {
      showErrorToast("Largura e altura devem ser maiores que zero.");
      return;
    }

    if (dimensionForm.name.length < 2) {
      showErrorToast("Nome da dimensão deve ter pelo menos 2 caracteres.");
      return;
    }

    setAddingDimension(true);
    
    try {
      const body = {
        productId: id,
        name: dimensionForm.name.trim(),
        widthMm: Number(dimensionForm.widthMm),
        heightMm: Number(dimensionForm.heightMm),
        description: dimensionForm.description?.trim() || null,
        order: Number(dimensionForm.order) || 0,
      };
      
      const res = await fetch(`/api/admin/product-dimensions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        showSuccessToast(`Dimensão "${dimensionForm.name}" adicionada com sucesso!`);
        setDimensionForm({ name: "", widthMm: "", heightMm: "", description: "", order: 0 });
        load();
      } else {
        const j = await res.json();
        showErrorToast("Erro: " + (j.error?.message || "Falha ao salvar dimensão"));
      }
    } catch (error) {
      console.error("Erro ao adicionar dimensão:", error);
      showErrorToast("Erro de conexão. Tente novamente.");
    } finally {
      setAddingDimension(false);
    }
  }

  const [confirmDeleteDimension, setConfirmDeleteDimension] = useState<{ id: number; name: string } | null>(null);

  async function addQuantity() {
    if (!quantityForm.quantity || Number(quantityForm.quantity) <= 0) {
      showErrorToast("Informe uma quantidade válida.");
      return;
    }

    setAddingQuantity(true);
    
    try {
      const body = {
        quantity: Number(quantityForm.quantity),
        label: quantityForm.label?.trim() || null,
        order: Number(quantityForm.order) || 0,
        active: true,
      };
      
      const res = await fetch(`/api/admin/products/${id}/suggested-quantities`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        showSuccessToast(`Tiragem de ${quantityForm.quantity} unidades adicionada com sucesso!`);
        setQuantityForm({ quantity: "", label: "", order: 0 });
        load();
      } else {
        const j = await res.json();
        showErrorToast("Erro: " + (j.error?.message || "Falha ao adicionar tiragem"));
      }
    } catch (error) {
      console.error("Erro ao adicionar tiragem:", error);
      showErrorToast("Erro de conexão. Tente novamente.");
    } finally {
      setAddingQuantity(false);
    }
  }

  async function removeQuantity(quantityId: number) {
    setRemovingQuantity(quantityId);
    try {
      const res = await fetch(`/api/admin/products/${id}/suggested-quantities`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantityId }),
      });
      if (res.ok) {
        showSuccessToast("Tiragem removida com sucesso!");
        load();
      } else {
        const j = await res.json();
        showErrorToast(j.error || "Erro ao remover tiragem");
      }
    } catch (error) {
      console.error("Erro ao remover tiragem:", error);
      showErrorToast("Erro de conexão. Tente novamente.");
    } finally {
      setRemovingQuantity(null);
    }
  }

  async function removeDimension(dimensionId: number) {
    const dimension = dimensions.find(d => d.id === dimensionId);
    const dimensionName = dimension?.name || "esta dimensão";
    setConfirmDeleteDimension({ id: dimensionId, name: dimensionName });
  }

  async function confirmRemoveDimension() {
    if (!confirmDeleteDimension) return;
    const dimensionId = confirmDeleteDimension.id;
    const dimensionName = confirmDeleteDimension.name;

    setRemovingDimension(dimensionId);
    
    try {
      const res = await fetch(`/api/admin/product-dimensions/${dimensionId}`, { 
        method: "DELETE" 
      });
      
      if (res.ok) {
        showSuccessToast(`Dimensão "${dimensionName}" removida com sucesso!`);
        load();
      } else {
        showErrorToast("Erro ao remover dimensão. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao remover dimensão:", error);
      showErrorToast("Erro de conexão. Tente novamente.");
    } finally {
      setRemovingDimension(null);
    }
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
    <main className="min-h-screen bg-[#F6EEE8]">
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar Produto"
        description={`Tem a certeza que deseja eliminar o produto "${row?.name}"? Esta ação irá desativar o produto.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={deleteProduct}
        loading={deleting}
      />
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
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </button>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                row.active ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-600'
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
                  ? 'border-[#F66807] text-[#F66807] bg-[#F6EEE8]'
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
                  ? 'border-[#F66807] text-[#F66807] bg-[#F6EEE8]'
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
                  ? 'border-[#F66807] text-[#F66807] bg-[#F6EEE8]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
              Acabamentos
            </button>
            <button
              onClick={() => setActiveTab('dimensions')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'dimensions'
                  ? 'border-[#F66807] text-[#F66807] bg-[#F6EEE8]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Dimensões
            </button>
          </nav>
        </div>

        {/* Conteúdo das tabs */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Informações Básicas</h2>
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
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
            
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
                      {p.formatLabel || `${p.technology} ${p.colors ?? ""}`}
                      {p.formatLabel && ` (${p.technology}${p.colors ? ` ${p.colors}` : ""})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sourcing Mode</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={row.sourcingMode ?? "INTERNAL"}
                  onChange={(e) => update({ sourcingMode: e.target.value })}
                >
                  <option value="INTERNAL">INTERNAL</option>
                  <option value="SUPPLIER">SUPPLIER</option>
                  <option value="HYBRID">HYBRID</option>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estratégia de Arredondamento</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={row.roundingStrategy ?? "END_ONLY"}
                  onChange={(e) => update({ roundingStrategy: e.target.value })}
                >
                  <option value="END_ONLY">END_ONLY (só no final)</option>
                  <option value="PER_STEP">PER_STEP (por linha/etapa)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estratégia de Preço</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={row.pricingStrategy ?? "COST_MARKUP_MARGIN"}
                  onChange={(e) => update({ pricingStrategy: e.target.value })}
                >
                  <option value="COST_MARKUP_MARGIN">COST_MARKUP_MARGIN</option>
                  <option value="COST_MARGIN_ONLY">COST_MARGIN_ONLY</option>
                  <option value="MARGIN_TARGET">MARGIN_TARGET</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço Mínimo por Peça (€)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 0.10"
                  defaultValue={row.minPricePerPiece ?? ""}
                  onBlur={(e) => update({ minPricePerPiece: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>

            {/* Dimensões padrão para imposição automática */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dimensões Padrão</h3>
              <p className="text-sm text-gray-600 mb-4">Dimensões padrão do produto (usadas quando não há dimensões específicas configuradas)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Largura Padrão (mm)</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Altura Padrão (mm)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue={row.heightMm ?? ""}
                    onBlur={(e) => update({ heightMm: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Ex: 50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Para cálculo de imposição automática</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição da Orientação</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue={row.dimensionDescription ?? ""}
                    onBlur={(e) => update({ dimensionDescription: e.target.value || null })}
                    placeholder="Ex: Vertical, Horizontal, Retrato"
                  />
                  <p className="text-xs text-gray-500 mt-1">Descrição da orientação do produto</p>
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

            {/* Resumo de Custos */}
            {(() => {
              // Calcular custos dos materiais
              let totalMaterialCost = 0;
              const materialCosts: Array<{ name: string; cost: number }> = [];
              if (Array.isArray(row.materials)) {
                row.materials.forEach((pm: any) => {
                  const materialCost = pm.material?.unitCost ? Number(pm.material.unitCost) : 0;
                  const qtyPerUnit = pm.qtyPerUnit ? Number(pm.qtyPerUnit) : 0;
                  const wasteFactor = pm.wasteFactor ? Number(pm.wasteFactor) : 0;
                  const cost = materialCost * qtyPerUnit * (1 + wasteFactor);
                  totalMaterialCost += cost;
                  if (cost > 0) {
                    materialCosts.push({
                      name: pm.material?.name || "Material desconhecido",
                      cost
                    });
                  }
                });
              }

              // Calcular custos dos acabamentos
              let totalFinishCost = 0;
              const finishCosts: Array<{ name: string; cost: number }> = [];
              if (Array.isArray(row.finishes)) {
                row.finishes.forEach((pf: any) => {
                  const finishCost = pf.costOverride 
                    ? Number(pf.costOverride) 
                    : (pf.finish?.baseCost ? Number(pf.finish.baseCost) : 0);
                  const qtyPerUnit = pf.qtyPerUnit ? Number(pf.qtyPerUnit) : 1;
                  const cost = finishCost * qtyPerUnit;
                  totalFinishCost += cost;
                  if (cost > 0) {
                    finishCosts.push({
                      name: pf.finish?.name || "Acabamento desconhecido",
                      cost
                    });
                  }
                });
              }

              // Custo da impressão
              const printingCost = row.printing?.unitPrice ? Number(row.printing.unitPrice) : 0;

              const totalCost = totalMaterialCost + totalFinishCost + printingCost;

              if (totalCost === 0 && materialCosts.length === 0 && finishCosts.length === 0) {
                return null;
              }

              return (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Resumo de Custos</h3>
                  <div className="bg-[#F6EEE8] rounded-lg p-6 space-y-4">
                    {materialCosts.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Materiais ({materialCosts.length}):</p>
                        <div className="space-y-1 mb-3">
                          {materialCosts.map((mc, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{mc.name}:</span>
                              <span className="font-semibold text-gray-900">€{mc.cost.toFixed(4)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                          <span className="text-gray-700 font-medium">Subtotal Materiais:</span>
                          <span className="font-semibold text-gray-900">€{totalMaterialCost.toFixed(4)}</span>
                        </div>
                      </div>
                    )}

                    {finishCosts.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Acabamentos ({finishCosts.length}):</p>
                        <div className="space-y-1 mb-3">
                          {finishCosts.map((fc, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{fc.name}:</span>
                              <span className="font-semibold text-gray-900">€{fc.cost.toFixed(4)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                          <span className="text-gray-700 font-medium">Subtotal Acabamentos:</span>
                          <span className="font-semibold text-gray-900">€{totalFinishCost.toFixed(4)}</span>
                        </div>
                      </div>
                    )}

                    {printingCost > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Impressão:</span>
                        <span className="font-semibold text-gray-900">€{printingCost.toFixed(4)}</span>
                      </div>
                    )}

                    {(totalMaterialCost > 0 || totalFinishCost > 0 || printingCost > 0) && (
                      <div className="flex items-center justify-between text-sm pt-4 border-t-2 border-gray-300">
                        <span className="text-gray-900 font-bold text-base">Custo Total por Unidade:</span>
                        <span className="font-bold text-gray-900 text-lg">€{totalCost.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Status */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="active"
                  defaultChecked={row.active} 
                  onChange={(e) => update({ active: e.target.checked })} 
                  className="h-4 w-4 text-[#F66807] focus:ring-[#F66807] border-gray-300 rounded"
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
                  <div key={qty.id} className="flex items-center justify-between p-3 border rounded-lg bg-[#F6EEE8]">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{qty.quantity} unidades</span>
                      {qty.label && <span className="text-sm text-gray-500">({qty.label})</span>}
                    </div>
                    <button 
                      className={`text-sm transition-colors ${
                        removingQuantity === qty.id 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-red-600 hover:text-red-800'
                      }`}
                      onClick={() => removeQuantity(qty.id)}
                      disabled={removingQuantity === qty.id}
                    >
                      {removingQuantity === qty.id ? 'Removendo...' : 'Excluir'}
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      value={quantityForm.quantity}
                      onChange={(e) => setQuantityForm({...quantityForm, quantity: e.target.value})}
                      placeholder="Ex: 100, 250, 500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rótulo (opcional)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                      value={quantityForm.label}
                      onChange={(e) => setQuantityForm({...quantityForm, label: e.target.value})}
                      placeholder="Ex: Pequena tiragem"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      className="px-6 py-3 bg-[#F66807] text-white rounded-lg hover:bg-[#F66807]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={addQuantity}
                      disabled={addingQuantity}
                    >
                      {addingQuantity ? 'Adicionando...' : 'Adicionar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {activeTab === 'materials' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Materiais do Produto</h3>
            <p className="text-sm text-gray-600">Configure os materiais disponíveis para este produto. O comercial poderá escolher entre eles durante o orçamento.</p>
          </div>

          {/* Lista de materiais existentes */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Materiais Configurados</h4>
              {Array.isArray(row.materials) && row.materials.length > 0 ? (
              <div className="space-y-3">
                {row.materials.map((pm: any) => (
                  <div key={pm.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{pm.material?.name}</h5>
                        {pm.variant?.label && (
                          <p className="text-sm text-gray-600">Variante: {pm.variant.label}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removePM(pm.id)}
                        className="p-1 rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors"
                        title="Remover material"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Qty por unidade:</span> {Number(pm.qtyPerUnit).toFixed(4)}
                      </div>
                      <div>
                        <span className="font-medium">Fator de perda:</span> {pm.wasteFactor ? Number(pm.wasteFactor).toFixed(4) : "Nenhum"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="mt-2">Nenhum material configurado</p>
                <p className="text-sm">Adicione materiais para que o comercial possa escolher entre eles</p>
              </div>
            )}
        </div>

          {/* Formulário para adicionar novo material */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Adicionar Novo Material</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Material *</label>
              <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={pmForm.materialId}
                onChange={(e) => setPmForm((f: any) => ({ ...f, materialId: e.target.value, variantId: "" }))}
              >
                  <option value="">Selecione um material</option>
                {materialOptions.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Variante</label>
              <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={pmForm.variantId}
                onChange={(e) => setPmForm((f: any) => ({ ...f, variantId: e.target.value }))}
                  disabled={!pmForm.materialId}
              >
                  <option value="">Selecione uma variante</option>
                {materialOptions
                  .find((m: any) => String(m.id) === String(pmForm.materialId))
                  ?.variants?.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
              </select>
                <p className="text-xs text-gray-500 mt-1">Opcional - deixe vazio para usar o material padrão</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qty por Unidade *</label>
              <input
                  type="number"
                  step="0.0001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 0.5000"
                value={pmForm.qtyPerUnit}
                onChange={(e) => setPmForm((f: any) => ({ ...f, qtyPerUnit: e.target.value }))}
              />
                <p className="text-xs text-gray-500 mt-1">Quantidade consumida por unidade do produto</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fator de Perda</label>
              <input
                  type="number"
                  step="0.0001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 0.1000"
                value={pmForm.wasteFactor}
                onChange={(e) => setPmForm((f: any) => ({ ...f, wasteFactor: e.target.value }))}
              />
                <p className="text-xs text-gray-500 mt-1">Percentual adicional para perdas (opcional)</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={addMaterial}
                className="px-6 py-3 bg-[#F66807] text-white rounded-lg hover:bg-[#F66807]/90 focus:ring-2 focus:ring-[#F66807] focus:ring-offset-2 font-medium"
              >
                Adicionar Material
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'finishes' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Acabamentos do Produto</h3>
            <p className="text-sm text-gray-600">Configure os acabamentos disponíveis para este produto. O comercial poderá escolher entre eles durante o orçamento.</p>
          </div>

          {/* Lista de acabamentos existentes */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Acabamentos Configurados</h4>
              {Array.isArray(row.finishes) && row.finishes.length > 0 ? (
              <div className="space-y-3">
                {row.finishes.map((pf: any) => (
                  <div key={pf.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{pf.finish?.name}</h5>
                        <p className="text-sm text-gray-600">
                          Tipo de cálculo: {pf.calcTypeOverride ?? pf.finish?.calcType}
                        </p>
                      </div>
                      <button
                        onClick={() => removePF(pf.id)}
                        className="p-1 rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors"
                        title="Remover acabamento"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Qty por unidade:</span> {pf.qtyPerUnit ? Number(pf.qtyPerUnit).toFixed(4) : "Padrão"}
                      </div>
                      <div>
                        <span className="font-medium">Custo override:</span> {pf.costOverride ? `€${Number(pf.costOverride).toFixed(4)}` : "Padrão"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
                <p className="mt-2">Nenhum acabamento configurado</p>
                <p className="text-sm">Adicione acabamentos para que o comercial possa escolher entre eles</p>
              </div>
            )}
        </div>

          {/* Formulário para adicionar novo acabamento */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Adicionar Novo Acabamento</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Acabamento *</label>
              <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={pfForm.finishId}
                onChange={(e) => setPfForm((f: any) => ({ ...f, finishId: e.target.value }))}
              >
                  <option value="">Selecione um acabamento</option>
                {finishes.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Cálculo</label>
              <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={pfForm.calcTypeOverride}
                onChange={(e) => setPfForm((f: any) => ({ ...f, calcTypeOverride: e.target.value }))}
              >
                  <option value="">Usar padrão do acabamento</option>
                  <option value="PER_UNIT">Por Unidade</option>
                  <option value="PER_M2">Por Metro Quadrado</option>
                  <option value="PER_LOT">Por Lote</option>
                  <option value="PER_HOUR">Por Hora</option>
              </select>
                <p className="text-xs text-gray-500 mt-1">Override do tipo de cálculo padrão</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qty por Unidade</label>
              <input
                  type="number"
                  step="0.0001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 0.5000"
                value={pfForm.qtyPerUnit}
                onChange={(e) => setPfForm((f: any) => ({ ...f, qtyPerUnit: e.target.value }))}
              />
                <p className="text-xs text-gray-500 mt-1">Quantidade por unidade (opcional)</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custo Override (€)</label>
              <input
                  type="number"
                  step="0.0001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 0.1500"
                value={pfForm.costOverride}
                onChange={(e) => setPfForm((f: any) => ({ ...f, costOverride: e.target.value }))}
              />
                <p className="text-xs text-gray-500 mt-1">Custo personalizado (opcional)</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={addFinish}
                className="px-6 py-3 bg-[#F66807] text-white rounded-lg hover:bg-[#F66807]/90 focus:ring-2 focus:ring-[#F66807] focus:ring-offset-2 font-medium"
              >
                Adicionar Acabamento
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dimensions' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Dimensões do Produto</h3>
            <p className="text-sm text-gray-600">Configure as dimensões disponíveis para este produto. O comercial poderá escolher entre elas durante o orçamento.</p>
          </div>

          {/* Lista de dimensões existentes */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Dimensões Configuradas</h4>
            {/* Debug: mostrar informações sobre as dimensões */}
            <div className="mb-2 text-xs text-gray-500">
              Debug: {dimensions.length} dimensões encontradas
            </div>
            {dimensions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <p className="mt-2">Nenhuma dimensão configurada</p>
                <p className="text-sm">Adicione dimensões para que o comercial possa escolher entre elas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dimensions.map((dim: any) => (
                  <div key={dim.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900">{dim.name}</h5>
                      <button
                        onClick={() => removeDimension(dim.id)}
                        disabled={removingDimension === dim.id}
                        className={`p-1 rounded-md transition-colors ${
                          removingDimension === dim.id 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                        }`}
                        title="Remover dimensão"
                      >
                        {removingDimension === dim.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><strong>Largura:</strong> {dim.widthMm}mm</p>
                      <p><strong>Altura:</strong> {dim.heightMm}mm</p>
                      {dim.description && <p><strong>Descrição:</strong> {dim.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulário para adicionar nova dimensão */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Adicionar Nova Dimensão</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Dimensão *</label>
                <input
                  type="text"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    dimensionForm.name && dimensionForm.name.length < 2 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Ex: A4, A5, Cartão de Visita"
                  value={dimensionForm.name}
                  onChange={(e) => setDimensionForm((f: any) => ({ ...f, name: e.target.value }))}
                />
                {dimensionForm.name && dimensionForm.name.length < 2 && (
                  <p className="text-xs text-red-600 mt-1">Nome deve ter pelo menos 2 caracteres</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ordem de Exibição</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  value={dimensionForm.order}
                  onChange={(e) => setDimensionForm((f: any) => ({ ...f, order: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Largura (mm) *</label>
                <input
                  type="number"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    dimensionForm.widthMm && Number(dimensionForm.widthMm) <= 0 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Ex: 210"
                  value={dimensionForm.widthMm}
                  onChange={(e) => setDimensionForm((f: any) => ({ ...f, widthMm: e.target.value }))}
                />
                {dimensionForm.widthMm && Number(dimensionForm.widthMm) <= 0 && (
                  <p className="text-xs text-red-600 mt-1">Largura deve ser maior que zero</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Altura (mm) *</label>
                <input
                  type="number"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    dimensionForm.heightMm && Number(dimensionForm.heightMm) <= 0 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Ex: 297"
                  value={dimensionForm.heightMm}
                  onChange={(e) => setDimensionForm((f: any) => ({ ...f, heightMm: e.target.value }))}
                />
                {dimensionForm.heightMm && Number(dimensionForm.heightMm) <= 0 && (
                  <p className="text-xs text-red-600 mt-1">Altura deve ser maior que zero</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição (opcional)</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Vertical, Horizontal, Retrato"
                  rows={2}
                  value={dimensionForm.description}
                  onChange={(e) => setDimensionForm((f: any) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={addDimension}
                disabled={addingDimension}
                className={`px-6 py-3 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:ring-offset-2 flex items-center gap-2 ${
                  addingDimension
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-[#F66807] text-white hover:bg-[#F66807]/90'
                }`}
              >
                {addingDimension ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Adicionando...
                  </>
                ) : (
                  'Adicionar Dimensão'
                )}
            </button>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Toast */}
      {localToast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
            localToast.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="flex-shrink-0">
              {localToast.type === 'success' ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <span className="font-medium">{localToast.message}</span>
          </div>
        </div>
      )}
    </main>
  );
}
