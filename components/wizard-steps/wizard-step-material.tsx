"use client";

import { useState, useEffect, useMemo } from "react";
import { useProductWizard } from "@/contexts/product-wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Package, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseZodErrors } from "@/lib/parse-zod-errors";

export function WizardStepMaterial() {
  const { data, updateData, nextStep, prevStep } = useProductWizard();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [supplierType, setSupplierType] = useState<"none" | "existing" | "new">("none");
  const [form, setForm] = useState({
    name: "",
    type: "",
    unit: "UNIT",
    unitCost: "",
    supplierId: "",
    supplierName: "",
    supplierUnitCost: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function setFieldError(field: string, message: string) {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  async function loadMaterials() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/materials");
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        setMaterials(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar materiais:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createMaterial() {
    const validationErrors: Record<string, string> = {};
    if (!form.name.trim()) {
      validationErrors.name = "Informe o nome do material";
    }
    if (!form.unitCost) {
      validationErrors.unitCost = "Informe o custo unitário";
    } else if (!/^\d+(\.\d{1,4})?$/.test(form.unitCost)) {
      validationErrors.unitCost = "Use um número válido (ex: 0.0000)";
    }
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...validationErrors }));
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    setCreating(true);
    setFieldErrors({});
    try {
      let supplierIdToUse: number | null = null;
      if (supplierType === "existing" && form.supplierId) {
        supplierIdToUse = Number(form.supplierId);
      } else if (supplierType === "new" && form.supplierName?.trim()) {
        const supRes = await fetch("/api/admin/suppliers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: form.supplierName.trim() }),
        });
        if (supRes.ok) {
          const sup = await supRes.json();
          supplierIdToUse = sup?.id || null;
        }
      }

      const finalSupplierUnitCost =
        supplierType !== "none" && form.supplierUnitCost ? form.supplierUnitCost : null;

      const res = await fetch("/api/admin/materials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type.trim() || "outro",
          unit: form.unit,
          unitCost: form.unitCost,
          supplierUnitCost: finalSupplierUnitCost,
          supplierId: supplierIdToUse,
          active: true,
        }),
      });
      if (res.ok) {
        const newMaterial = await res.json();
        toast.success("Material criado com sucesso");
        
        // Recarrega a lista para incluir o novo material
        await loadMaterials();
        
        // Adiciona o ID ao contexto do wizard se ainda não estiver
        if (newMaterial.id && !data.materialIds.includes(newMaterial.id)) {
          const updatedIds = [...data.materialIds, newMaterial.id];
          updateData({ materialIds: updatedIds });
          console.log('Material adicionado ao wizard:', newMaterial.id, 'Total IDs:', updatedIds);
        }
        
        setShowCreate(false);
        setForm({
          name: "",
          type: "",
          unit: "UNIT",
          unitCost: "",
          supplierId: "",
          supplierName: "",
          supplierUnitCost: "",
        });
        setSupplierType("none");
        setFieldErrors({});
      } else {
        const errorData = await res.json().catch(() => ({}));
        const parsed = parseZodErrors(errorData);
        setFieldErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
        toast.error(parsed.generalMessage || "Erro ao criar material");
      }
    } catch (error) {
      toast.error("Erro ao criar material");
    } finally {
      setCreating(false);
    }
  }

  const filteredMaterials = useMemo(() => {
    if (!search.trim()) return materials;
    const term = search.toLowerCase();
    return materials.filter((m) => m.name?.toLowerCase().includes(term));
  }, [materials, search]);

  function handleSelect(materialId: number) {
    if (!data.materialIds.includes(materialId)) {
      updateData({ materialIds: [...data.materialIds, materialId] });
    } else {
      updateData({
        materialIds: data.materialIds.filter((id) => id !== materialId),
      });
    }
  }

  function handleContinue() {
    if (data.materialIds.length === 0) {
      toast.error("Selecione ou crie pelo menos um material");
      return;
    }
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Package className="w-12 h-12 mx-auto text-[#F66807] mb-4" />
        <h3 className="text-xl font-semibold text-[#341601] mb-2">
          Selecione ou crie materiais
        </h3>
        <p className="text-sm text-gray-600">
          Você pode selecionar múltiplos materiais. Pelo menos um é obrigatório.
        </p>
      </div>

      {/* Busca */}
      <div>
        <Input
          placeholder="Buscar material..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Lista de materiais */}
      {!showCreate && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : filteredMaterials.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {search ? "Nenhum material encontrado" : "Nenhum material cadastrado"}
            </p>
          ) : (
            filteredMaterials.map((material) => {
              const isSelected = data.materialIds.includes(material.id);
              return (
                <button
                  key={material.id}
                  onClick={() => handleSelect(material.id)}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 text-left transition-all",
                    isSelected
                      ? "border-[#F66807] bg-[#F6EEE8]"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#341601]">{material.name}</p>
                      <p className="text-sm text-gray-600">
                        {material.type} • {material.unit}
                      </p>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-[#F66807]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Formulário de criação */}
      {showCreate && (
        <div className="border-2 border-[#F66807] rounded-lg p-4 space-y-4 bg-[#F6EEE8]">
          <h4 className="font-semibold text-[#341601]">Criar novo material</h4>
          <div>
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                clearFieldError("name");
              }}
              placeholder="Nome do material"
              className={fieldErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Input
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder="Tipo do material"
              />
            </div>
            <div>
              <Label>Unidade *</Label>
              <Select
                value={form.unit}
                onValueChange={(value) => setForm({ ...form, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNIT">Unidade</SelectItem>
                  <SelectItem value="M2">Metro Quadrado</SelectItem>
                  <SelectItem value="KG">Quilograma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Custo Unitário *</Label>
            <Input
              type="text"
              value={form.unitCost}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d+(\.\d{0,4})?$/.test(value)) {
                  setForm({ ...form, unitCost: value });
                  clearFieldError("unitCost");
                }
              }}
              placeholder="0.0000"
              className={fieldErrors.unitCost ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {fieldErrors.unitCost && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.unitCost}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={createMaterial}
              disabled={creating || !form.name.trim() || !form.unitCost}
              className="flex-1 bg-[#F66807] hover:bg-[#F66807]/90"
            >
              {creating ? "Criando..." : "Criar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setForm({
                  name: "",
                  type: "",
                  unit: "UNIT",
                  unitCost: "",
                  supplierId: "",
                  supplierName: "",
                  supplierUnitCost: "",
                });
                setSupplierType("none");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-2">
        {!showCreate && (
          <Button
            variant="outline"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar novo material
          </Button>
        )}
        <div className="flex-1 flex gap-2 justify-end">
          <Button variant="outline" onClick={prevStep}>
            Anterior
          </Button>
          <Button
            onClick={handleContinue}
            disabled={data.materialIds.length === 0}
            className="bg-[#F66807] hover:bg-[#F66807]/90"
          >
            Continuar ({data.materialIds.length} selecionado{data.materialIds.length !== 1 ? "s" : ""})
          </Button>
        </div>
      </div>

      {data.materialIds.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>{data.materialIds.length} material(is) selecionado(s)</strong>
          </p>
        </div>
      )}
    </div>
  );
}

