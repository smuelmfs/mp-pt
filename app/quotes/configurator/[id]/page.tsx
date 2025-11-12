"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authenticatedFetch } from "@/lib/api-client";

interface ProductConfig {
  product: {
    id: number;
    name: string;
    category: string;
    widthMm: number | null;
    heightMm: number | null;
    minOrderQty: number | null;
    minOrderValue: number | null;
  };
  optionGroups: Array<{
    id: string;
    name: string;
    kind: string;
    required: boolean;
    multiSelect: boolean;
    hasMultipleOptions: boolean;
    choices: Array<{
      id: string;
      name: string;
      description: string;
      materialVariant?: {
        id: number;
        label: string;
        material: {
          id: number;
          name: string;
          type: string;
        };
      };
      finish?: {
        id: number;
        name: string;
        qtyPerUnit: number;
        calcType: string;
        costOverride?: number;
      };
      dimension?: {
        id: number;
        widthMm: number;
        heightMm: number;
        description?: string | null;
      };
      qtyPerUnit?: number;
      wasteFactor?: number;
    }>;
  }>;
  quantityPresets: Array<{
    id: number;
    quantity: number;
    label: string | null;
  }>;
}

interface PreviewResult {
  priceNet: number;
  vatAmount: number;
  priceGross: number;
  subtotal: number;
  finalPrice: number;
  breakdown: Array<{
    type: string;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  appliedChoices: Array<{
    id: number;
    name: string;
    overrides: any;
  }>;
  meta?: {
    sheets?: number;
    tiros?: number;
    area?: number;
  };
}

interface MatrixRow {
  qty: number;
  priceNet: number;
  priceGross: number;
  unitGross: number;
}

export default function ConfiguratorPage() {
  const params = useParams();
  const productId = params.id as string;
  
  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string | string[]>>({});
  const [quantity, setQuantity] = useState<number>(100);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customerId, setCustomerId] = useState<string>("");
  const [customers, setCustomers] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [sourcingMode, setSourcingMode] = useState<"INTERNAL" | "SUPPLIER" | "HYBRID">("INTERNAL");

  function showSuccessToast(message: string) {
    setToast({ type: 'success', message });
    setTimeout(() => setToast(null), 3000);
  }

  function showErrorToast(message: string) {
    setToast({ type: 'error', message });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/catalog/products/${productId}/config`);
        if (!response.ok) {
          console.error('Erro ao carregar configuração:', response.statusText);
          return;
        }
        const data = await response.json();
        
        if (!data || typeof data !== 'object') {
          console.error('Resposta inválida do servidor');
          return;
        }
        
        if (!data.product || typeof data.product !== 'object' || !data.product.name) {
          console.error('Dados de produto inválidos');
          return;
        }
        
        if (!Array.isArray(data.optionGroups)) {
          data.optionGroups = [];
        }
        
        data.optionGroups.forEach((group: any) => {
          if (!Array.isArray(group.choices)) {
            group.choices = [];
          }
        });
        
        setConfig(data);
        
        const defaultChoices: Record<string, string> = {};
        if (data.optionGroups && Array.isArray(data.optionGroups)) {
          data.optionGroups.forEach((group: any) => {
            if (group.required && group.choices && group.choices.length > 0) {
              if (!group.hasMultipleOptions) {
                defaultChoices[group.id] = group.choices[0].id;
              }
            }
          });
        }
        setSelectedChoices(defaultChoices);
      } catch (error) {
        console.error('Erro ao carregar configuração:', error);
      } finally {
        setLoading(false);
      }
    }

    async function loadCustomers() {
      setLoadingCustomers(true);
      try {
        const res = await fetch('/api/admin/customers?activeOnly=true');
        if (res.ok) {
          const data = await res.json();
          setCustomers(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      } finally {
        setLoadingCustomers(false);
      }
    }

    if (productId) {
      loadConfig();
      loadCustomers();
    }
    try {
      const sp = new URLSearchParams(window.location.search);
      const cid = sp.get('customerId');
      if (cid) setCustomerId(cid);
    } catch (_) {}
  }, [productId]);

  useEffect(() => {
    if (config && config.optionGroups) {
      const allRequiredSelected = config.optionGroups.every(group => {
        if (!group.required) return true;
        
        const selection = selectedChoices[group.id];
        if (group.id === 'finishes') {
          return Array.isArray(selection) && selection.length > 0;
        } else {
          return selection && selection !== '';
        }
      });
      
      if (allRequiredSelected && Object.keys(selectedChoices).length > 0) {
        calculatePreview();
      } else {
        setPreview(null);
      }
    }
  }, [config, selectedChoices, quantity]);

  useEffect(() => {
    if (!config || !config.optionGroups) return;
    const hasSelections = Object.keys(selectedChoices).length > 0;
    if (hasSelections) {
      calculatePreview();
    }
  }, [customerId, sourcingMode]);

  async function calculatePreview() {
    if (!config || !config.optionGroups) return;
    
    setCalculating(true);
    try {
      const choiceIds: number[] = [];
      const materialOverrides: any = {};
      const finishOverrides: any = {};
      const dimensionOverrides: any = {};
      
      Object.entries(selectedChoices).forEach(([groupId, choiceIdOrArray]) => {
        const group = config.optionGroups.find(g => g.id === groupId);
        
        if (!group?.choices) return;
        
        if (groupId === 'materials' && typeof choiceIdOrArray === 'string') {
          // Para materiais (seleção única)
          const choice = group.choices.find(c => c.id === choiceIdOrArray);
          if (choice?.materialVariant) {
            choiceIds.push(parseInt(choiceIdOrArray.replace('material_', '')));
            materialOverrides[choice.materialVariant.id] = {
              qtyPerUnit: choice.qtyPerUnit,
              wasteFactor: choice.wasteFactor
            };
          }
        } else if (groupId === 'dimensions' && typeof choiceIdOrArray === 'string') {
          // Para dimensões (seleção única) - incluindo dimensão padrão
          const choice = group.choices.find(c => c.id === choiceIdOrArray);
          if (choice?.dimension) {
            if (choiceIdOrArray === 'dimension_default') {
              // Dimensão padrão - não adiciona ao choiceIds, mas salva as dimensões
              dimensionOverrides['default'] = {
                widthMm: choice.dimension.widthMm,
                heightMm: choice.dimension.heightMm
              };
            } else {
              // Dimensão extra - adiciona ao choiceIds
              choiceIds.push(parseInt(choiceIdOrArray.replace('dimension_', '')));
              dimensionOverrides[choice.dimension.id] = {
                widthMm: choice.dimension.widthMm,
                heightMm: choice.dimension.heightMm
              };
            }
          }
        } else if (groupId === 'finishes' && Array.isArray(choiceIdOrArray)) {
          // Para acabamentos (seleção múltipla)
          choiceIdOrArray.forEach(choiceId => {
            const choice = group.choices.find(c => c.id === choiceId);
            if (choice?.finish) {
              choiceIds.push(parseInt(choiceId.replace('finish_', '')));
              finishOverrides[choice.finish.id] = {
                qtyPerUnit: choice.finish.qtyPerUnit,
                calcType: choice.finish.calcType,
                costOverride: choice.finish.costOverride
              };
            }
          });
        }
      });

      const response = await fetch('/api/quotes/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: parseInt(productId),
          quantity,
          choiceIds,
          params: {
            materialOverrides,
            finishOverrides,
            dimensionOverrides
          },
          overrides: {
            customerId: customerId ? Number(customerId) : undefined,
            sourcingMode
          }
        })
      });
      
      const data = await response.json();
      setPreview(data);
    } catch (error) {
      console.error('Erro ao calcular preview:', error);
    } finally {
      setCalculating(false);
    }
  }

  async function generateMatrix() {
    if (!config || !config.optionGroups) return;
    
    setCalculating(true);
    try {
      const choiceIds: number[] = [];
      const materialOverrides: any = {};
      const finishOverrides: any = {};
      const dimensionOverrides: any = {};
      
      Object.entries(selectedChoices).forEach(([groupId, choiceIdOrArray]) => {
        const group = config.optionGroups.find(g => g.id === groupId);
        
        if (!group?.choices) return;
        
        if (groupId === 'materials' && typeof choiceIdOrArray === 'string') {
          // Para materiais (seleção única)
          const choice = group.choices.find(c => c.id === choiceIdOrArray);
          if (choice?.materialVariant) {
            choiceIds.push(parseInt(choiceIdOrArray.replace('material_', '')));
            materialOverrides[choice.materialVariant.id] = {
              qtyPerUnit: choice.qtyPerUnit,
              wasteFactor: choice.wasteFactor
            };
          }
        } else if (groupId === 'dimensions' && typeof choiceIdOrArray === 'string') {
          // Para dimensões (seleção única) - incluindo dimensão padrão
          const choice = group.choices.find(c => c.id === choiceIdOrArray);
          if (choice?.dimension) {
            if (choiceIdOrArray === 'dimension_default') {
              // Dimensão padrão - não adiciona ao choiceIds, mas salva as dimensões
              dimensionOverrides['default'] = {
                widthMm: choice.dimension.widthMm,
                heightMm: choice.dimension.heightMm
              };
            } else {
              // Dimensão extra - adiciona ao choiceIds
              choiceIds.push(parseInt(choiceIdOrArray.replace('dimension_', '')));
              dimensionOverrides[choice.dimension.id] = {
                widthMm: choice.dimension.widthMm,
                heightMm: choice.dimension.heightMm
              };
            }
          }
        } else if (groupId === 'finishes' && Array.isArray(choiceIdOrArray)) {
          // Para acabamentos (seleção múltipla)
          choiceIdOrArray.forEach(choiceId => {
            const choice = group.choices.find(c => c.id === choiceId);
            if (choice?.finish) {
              choiceIds.push(parseInt(choiceId.replace('finish_', '')));
              finishOverrides[choice.finish.id] = {
                qtyPerUnit: choice.finish.qtyPerUnit,
                calcType: choice.finish.calcType,
                costOverride: choice.finish.costOverride
              };
            }
          });
        }
      });
      
      const quantities = config.quantityPresets ? config.quantityPresets.map(p => p.quantity) : [100, 250, 500, 1000];
      
      const response = await fetch('/api/quotes/preview-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: parseInt(productId),
          quantities,
          choiceIds,
          params: {
            materialOverrides,
            finishOverrides,
            dimensionOverrides
          },
          overrides: {
            customerId: customerId ? Number(customerId) : undefined,
            sourcingMode
          }
        })
      });
      
      const data = await response.json();
      setMatrix(data.rows);
    } catch (error) {
      console.error('Erro ao gerar matrix:', error);
    } finally {
      setCalculating(false);
    }
  }

  async function saveQuote() {
    if (!config || !preview || !config.optionGroups) return;
    
    setSaving(true);
    try {
      // Converter escolhas para formato esperado pela API
      const choiceIds: number[] = [];
      const materialOverrides: any = {};
      const finishOverrides: any = {};
      const dimensionOverrides: any = {};
      
      Object.entries(selectedChoices).forEach(([groupId, choiceIdOrArray]) => {
        const group = config.optionGroups.find(g => g.id === groupId);
        
        if (!group?.choices) return;
        
        if (groupId === 'materials' && typeof choiceIdOrArray === 'string') {
          // Para materiais (seleção única)
          const choice = group.choices.find(c => c.id === choiceIdOrArray);
          if (choice?.materialVariant) {
            choiceIds.push(parseInt(choiceIdOrArray.replace('material_', '')));
            materialOverrides[choice.materialVariant.id] = {
              qtyPerUnit: choice.qtyPerUnit,
              wasteFactor: choice.wasteFactor
            };
          }
        } else if (groupId === 'dimensions' && typeof choiceIdOrArray === 'string') {
          // Para dimensões (seleção única) - incluindo dimensão padrão
          const choice = group.choices.find(c => c.id === choiceIdOrArray);
          if (choice?.dimension) {
            if (choiceIdOrArray === 'dimension_default') {
              // Dimensão padrão - não adiciona ao choiceIds, mas salva as dimensões
              dimensionOverrides['default'] = {
                widthMm: choice.dimension.widthMm,
                heightMm: choice.dimension.heightMm
              };
            } else {
              // Dimensão extra - adiciona ao choiceIds
              choiceIds.push(parseInt(choiceIdOrArray.replace('dimension_', '')));
              dimensionOverrides[choice.dimension.id] = {
                widthMm: choice.dimension.widthMm,
                heightMm: choice.dimension.heightMm
              };
            }
          }
        } else if (groupId === 'finishes' && Array.isArray(choiceIdOrArray)) {
          // Para acabamentos (seleção múltipla)
          choiceIdOrArray.forEach(choiceId => {
            const choice = group.choices.find(c => c.id === choiceId);
            if (choice?.finish) {
              choiceIds.push(parseInt(choiceId.replace('finish_', '')));
              finishOverrides[choice.finish.id] = {
                qtyPerUnit: choice.finish.qtyPerUnit,
                calcType: choice.finish.calcType,
                costOverride: choice.finish.costOverride
              };
            }
          });
        }
      });

      const response = await authenticatedFetch('/api/quote/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: parseInt(productId),
          quantity,
          choiceIds,
          customerId: customerId ? Number(customerId) : undefined,
          sourcingMode,
          params: {
            materialOverrides,
            finishOverrides,
            dimensionOverrides
          }
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        showSuccessToast(`Orçamento ${data.quoteNumber} criado com sucesso!`);
        setTimeout(() => {
          window.location.href = `/quotes/${data.id}`;
        }, 1500);
      } else {
        showErrorToast('Erro ao salvar orçamento');
      }
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      showErrorToast('Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  }

  function handleChoiceChange(groupId: string, choiceId: string) {
    setSelectedChoices(prev => {
      const currentSelection = prev[groupId];
      
      if (groupId === 'finishes') {
        const currentArray = Array.isArray(currentSelection) ? currentSelection : [];
        const isSelected = currentArray.includes(choiceId);
        
        if (isSelected) {
          return {
            ...prev,
            [groupId]: currentArray.filter(id => id !== choiceId)
          };
        } else {
          return {
            ...prev,
            [groupId]: [...currentArray, choiceId]
          };
        }
      } else {
        return {
          ...prev,
          [groupId]: choiceId
        };
      }
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6EEE8]">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-[#F6EEE8]">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <h1 className="text-2xl font-bold text-[#341601]">Configurador</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h1 className="text-2xl font-bold text-[#341601] mb-4">Produto não encontrado</h1>
            <p className="text-gray-600">O produto solicitado não está disponível.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6EEE8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-[#341601]">{config?.product?.name || 'Configurador'}</h1>
          <p className="text-gray-600 mt-2">Configure seu produto e veja o preço em tempo real</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configurações */}
          <div className="space-y-6">
            {/* Seleção de Cliente */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-[#341601] mb-3">Cliente (Opcional)</h3>
              <p className="text-sm text-gray-600 mb-3">
                Selecione um cliente para aplicar preços específicos automaticamente
              </p>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                disabled={loadingCustomers}
              >
                <option value="">Sem cliente (preços padrão)</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {customerId && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ Preços específicos do cliente serão aplicados
                </p>
              )}
            </div>

            {config && config.optionGroups && config.optionGroups.length > 0 ? config.optionGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-[#341601] mb-3">
                  {group.name}
                  {group.required && <span className="text-red-500 ml-1">*</span>}
                  {group.id === 'finishes' && Array.isArray(selectedChoices[group.id]) && selectedChoices[group.id].length > 0 && (
                    <span className="ml-2 text-sm text-gray-600">
                      ({selectedChoices[group.id].length} selecionado{selectedChoices[group.id].length !== 1 ? 's' : ''})
                    </span>
                  )}
                </h3>
                
                {group.hasMultipleOptions && !selectedChoices[group.id] && group.id !== 'finishes' && (
                  <div className="mb-4 p-3 bg-[#F6EEE8] border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-[#341601]">
                        Escolha uma opção para continuar
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  {group.choices && group.choices.length > 0 ? group.choices.map((choice) => (
                    <label key={choice.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-[#F6EEE8] cursor-pointer transition-colors">
                      <input
                        type={group.id === 'finishes' ? 'checkbox' : 'radio'}
                        name={group.id === 'finishes' ? `group-${group.id}-${choice.id}` : `group-${group.id}`}
                        checked={
                          group.id === 'finishes' 
                            ? Array.isArray(selectedChoices[group.id]) && selectedChoices[group.id].includes(choice.id)
                            : selectedChoices[group.id] === choice.id
                        }
                        onChange={() => handleChoiceChange(group.id, choice.id)}
                        className="h-4 w-4 text-[#F66807] focus:ring-[#F66807] border-gray-300 mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-[#341601]">{choice.name}</div>
                        {choice.description && (
                          <div className="text-sm text-gray-600 mt-1">{choice.description}</div>
                        )}
                        {choice.materialVariant && (
                          <div className="text-xs text-gray-600 mt-1">
                            Material: {choice.materialVariant.material.name} ({choice.materialVariant.material.type})
                            {choice.qtyPerUnit && ` • Qty/Un: ${choice.qtyPerUnit}`}
                          </div>
                        )}
                        {choice.finish && (
                          <div className="text-xs text-gray-600 mt-1">
                            Acabamento: {choice.finish.name}
                            {choice.finish.qtyPerUnit && ` • Qty/Un: ${choice.finish.qtyPerUnit}`}
                          </div>
                        )}
                        {choice.dimension && (
                          <div className="text-xs text-gray-600 mt-1">
                            Dimensões: {choice.dimension.widthMm}mm x {choice.dimension.heightMm}mm
                            {choice.dimension.description && ` • ${choice.dimension.description}`}
                          </div>
                        )}
                      </div>
                    </label>
                  )) : (
                    <p className="text-gray-500 text-center py-4">
                      Nenhuma opção disponível
                    </p>
                  )}
                </div>
              </div>
            )) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-gray-500 text-center py-8">
                  Não há opções de configuração disponíveis para este produto.
                </p>
              </div>
            )}

            {/* Quantidade */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[#341601]">Quantidade</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 100)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807]"
                />
                {config?.quantityPresets && config.quantityPresets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {config.quantityPresets.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setQuantity(p.quantity)}
                        className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${quantity === p.quantity ? 'bg-[#F66807] text-white border-[#F66807]' : 'bg-white text-[#341601] border-gray-300 hover:bg-[#F6EEE8]'}`}
                        title={p.label || String(p.quantity)}
                      >
                        {p.label || p.quantity}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview e Preços */}
          <div className="space-y-6 lg:sticky lg:top-6 self-start">
            {/* Preview Unitário */}
            {preview ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-[#341601] mb-4">Preço Unitário</h3>
                {calculating ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl font-bold text-[#341601]">
                      €{preview.priceGross.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      €{preview.priceNet.toFixed(2)} + IVA (€{preview.vatAmount.toFixed(2)})
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      €{(preview.priceGross / quantity).toFixed(2)} por unidade
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-[#341601] mb-4">Preço Unitário</h3>
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500">Selecione as opções para ver o preço</p>
                </div>
              </div>
            )}

            {/* Detalhamento dos Itens */}
            {preview && preview.breakdown && preview.breakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#341601]">Detalhamento dos Custos</h3>
                  {preview.meta && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      {typeof preview.meta.sheets === 'number' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded border border-gray-200">Folhas: {preview.meta.sheets}</span>
                      )}
                      {typeof preview.meta.tiros === 'number' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded border border-gray-200">Tiros: {preview.meta.tiros}</span>
                      )}
                      {typeof preview.meta.area === 'number' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded border border-gray-200">Área: {preview.meta.area}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Tipo</th>
                        <th className="text-left py-2">Item</th>
                        <th className="text-right py-2">Qtd</th>
                        <th className="text-left py-2">Unidade</th>
                        <th className="text-right py-2">Custo Unit</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.breakdown.map((it, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 text-gray-600">{it.type}</td>
                          <td className="py-2 font-medium">{it.name}</td>
                          <td className="py-2 text-right">{typeof it.quantity === 'number' ? it.quantity : '-'}</td>
                          <td className="py-2">{/* unidade opcional não vem no preview.breakdown atual */}-</td>
                          <td className="py-2 text-right">{typeof it.unitCost === 'number' ? `€${it.unitCost.toFixed(2)}` : '-'}</td>
                          <td className="py-2 text-right font-medium">€{it.totalCost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Grade de Preços */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#341601]">Grade de Preços</h3>
                <button
                  onClick={generateMatrix}
                  disabled={calculating}
                  className="px-4 py-2 bg-[#F66807] text-white rounded-md hover:bg-[#F66807]/90 disabled:opacity-50 font-medium"
                >
                  {calculating ? 'Calculando...' : 'Gerar Grade'}
                </button>
              </div>
              
              {matrix && matrix.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Qtd</th>
                        <th className="text-right py-2">Preço Total</th>
                        <th className="text-right py-2">€/Unidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map((row) => (
                        <tr key={row.qty} className="border-b">
                          <td className="py-2">{row.qty}</td>
                          <td className="text-right py-2">€{row.priceGross.toFixed(2)}</td>
                          <td className="text-right py-2">€{row.unitGross.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Clique em "Gerar Grade" para ver os preços por quantidade
                </p>
              )}
            </div>

            {/* Botão Salvar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <button
                onClick={saveQuote}
                disabled={!preview || saving}
                className="w-full px-6 py-3 bg-[#F66807] text-white rounded-md hover:bg-[#F66807]/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? 'Salvando...' : 'Salvar Orçamento'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
            toast.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}