"use client";

import { useState, useEffect, useMemo } from "react";
import { useProductWizard } from "@/contexts/product-wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Scissors, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseZodErrors } from "@/lib/parse-zod-errors";

type FinishCategory = "LAMINACAO" | "VERNIZ" | "CORTE" | "DOBRA" | "OUTROS";

export function WizardStepFinish() {
  const { data, updateData, nextStep, prevStep } = useProductWizard();
  const [finishes, setFinishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "OUTROS" as FinishCategory,
    unit: "UNIT" as "UNIT" | "M2" | "LOT" | "HOUR" | "SHEET",
    baseCost: "",
    calcType: "PER_UNIT" as "PER_UNIT" | "PER_M2" | "PER_LOT" | "PER_HOUR",
    minFee: "",
    marginDefault: "",
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
    loadFinishes();
  }, []);

  async function loadFinishes() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/finishes?activeOnly=true");
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        setFinishes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar acabamentos:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createFinish() {
    const validationErrors: Record<string, string> = {};
    if (!form.name.trim()) {
      validationErrors.name = "Informe o nome do acabamento";
    }
    if (!form.baseCost || !form.baseCost.trim()) {
      validationErrors.baseCost = "Informe o custo base";
    }
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...validationErrors }));
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    
    // Valida e formata baseCost (deve ser um número com até 4 casas decimais)
    const baseCostValue = form.baseCost.trim();
    if (!/^\d+(\.\d{1,4})?$/.test(baseCostValue)) {
      setFieldError("baseCost", "Use um número válido (ex: 0.0000)");
      toast.error("Custo base inválido.");
      return;
    }
    
    // Garante que o valor não termine com ponto
    const normalizedBaseCost = baseCostValue.replace(/\.$/, '') || '0';
    
    setCreating(true);
    try {
      const res = await fetch("/api/admin/finishes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          unit: form.unit,
          baseCost: normalizedBaseCost,
          calcType: form.calcType,
          minFee: form.minFee && form.minFee.trim() ? form.minFee.trim() : null,
          marginDefault: form.marginDefault && form.marginDefault.trim() ? form.marginDefault.trim() : null,
          active: true,
        }),
      });
      if (res.ok) {
        const newFinish = await res.json();
        toast.success("Acabamento criado com sucesso");
        
        // Recarrega a lista para incluir o novo acabamento
        await loadFinishes();
        
        // Adiciona o ID ao contexto do wizard se ainda não estiver
        if (newFinish.id && !data.finishIds.includes(newFinish.id)) {
          const updatedIds = [...data.finishIds, newFinish.id];
          updateData({ finishIds: updatedIds });
          console.log('Acabamento adicionado ao wizard:', newFinish.id, 'Total IDs:', updatedIds);
        }
        
        setShowCreate(false);
        setForm({
          name: "",
          category: "OUTROS" as FinishCategory,
          unit: "UNIT",
          baseCost: "",
          calcType: "PER_UNIT",
          minFee: "",
          marginDefault: "",
        });
        setFieldErrors({});
      } else {
        const errorData = await res.json().catch(() => ({}));
        const parsed = parseZodErrors(errorData);
        setFieldErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
        toast.error(parsed.generalMessage || "Erro ao criar acabamento");
      }
    } catch (error) {
      toast.error("Erro ao criar acabamento");
    } finally {
      setCreating(false);
    }
  }

  const filteredFinishes = useMemo(() => {
    if (!search.trim()) return finishes;
    const term = search.toLowerCase();
    return finishes.filter((f) => f.name?.toLowerCase().includes(term));
  }, [finishes, search]);

  function handleSelect(finishId: number) {
    if (!data.finishIds.includes(finishId)) {
      updateData({ finishIds: [...data.finishIds, finishId] });
    } else {
      updateData({
        finishIds: data.finishIds.filter((id) => id !== finishId),
      });
    }
  }

  function handleSkip() {
    nextStep();
  }

  function handleContinue() {
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Scissors className="w-12 h-12 mx-auto text-[#F66807] mb-4" />
        <h3 className="text-xl font-semibold text-[#341601] mb-2">
          Selecione ou crie acabamentos
        </h3>
        <p className="text-sm text-gray-600">
          Esta etapa é opcional. Você pode selecionar múltiplos acabamentos.
        </p>
      </div>

      <div>
        <Input
          placeholder="Buscar acabamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>

      {!showCreate && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : filteredFinishes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {search ? "Nenhum acabamento encontrado" : "Nenhum acabamento cadastrado"}
            </p>
          ) : (
            filteredFinishes.map((finish) => {
              const isSelected = data.finishIds.includes(finish.id);
              return (
                <button
                  key={finish.id}
                  onClick={() => handleSelect(finish.id)}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 text-left transition-all",
                    isSelected
                      ? "border-[#F66807] bg-[#F6EEE8]"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#341601]">{finish.name}</p>
                      <p className="text-sm text-gray-600">{finish.category}</p>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-[#F66807]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {showCreate && (
        <div className="border-2 border-[#F66807] rounded-lg p-4 space-y-4 bg-[#F6EEE8]">
          <h4 className="font-semibold text-[#341601]">Criar novo acabamento</h4>
          <div>
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                clearFieldError("name");
              }}
              placeholder="Nome do acabamento"
              className={fieldErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Custo Base *</Label>
              <Input
                type="text"
                value={form.baseCost}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d+(\.\d{0,4})?$/.test(value)) {
                    setForm({ ...form, baseCost: value });
                    clearFieldError("baseCost");
                  }
                }}
                placeholder="0.0000"
                className={fieldErrors.baseCost ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
              />
              {fieldErrors.baseCost ? (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.baseCost}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Formato: número até 4 casas decimais</p>
              )}
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(value: FinishCategory) => {
                  setForm({ ...form, category: value });
                  clearFieldError("category");
                }}
              >
                <SelectTrigger className={fieldErrors.category ? "border-red-500" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAMINACAO">Laminação</SelectItem>
                  <SelectItem value="VERNIZ">Verniz</SelectItem>
                  <SelectItem value="CORTE">Corte</SelectItem>
                  <SelectItem value="DOBRA">Dobra</SelectItem>
                  <SelectItem value="OUTROS">Outros</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.category && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.category}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Unidade</Label>
              <Select
                value={form.unit}
                onValueChange={(value) => setForm({ ...form, unit: value as typeof form.unit })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNIT">Unidade</SelectItem>
                  <SelectItem value="M2">Metro Quadrado</SelectItem>
                  <SelectItem value="LOT">Lote</SelectItem>
                  <SelectItem value="HOUR">Hora</SelectItem>
                  <SelectItem value="SHEET">Folha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Cálculo</Label>
              <Select
                value={form.calcType}
                onValueChange={(value) => setForm({ ...form, calcType: value as typeof form.calcType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PER_UNIT">Por Unidade</SelectItem>
                  <SelectItem value="PER_M2">Por m²</SelectItem>
                  <SelectItem value="PER_LOT">Por Lote</SelectItem>
                  <SelectItem value="PER_HOUR">Por Hora</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Taxa Mínima</Label>
              <Input
                type="text"
                value={form.minFee}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
                    setForm({ ...form, minFee: value });
                    clearFieldError("minFee");
                  }
                }}
                placeholder="0.00"
                className={fieldErrors.minFee ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
              />
              {fieldErrors.minFee ? (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.minFee}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Formato: número até 2 casas decimais</p>
              )}
            </div>
            <div>
              <Label>Margem Padrão (opcional)</Label>
              <Input
                value={form.marginDefault}
                onChange={(e) => setForm({ ...form, marginDefault: e.target.value })}
                placeholder="Ex: 0.20"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={createFinish}
              disabled={creating || !form.name.trim() || !form.baseCost}
              className="flex-1 bg-[#F66807] hover:bg-[#F66807]/90"
            >
              {creating ? "Criando..." : "Criar"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!showCreate && (
          <Button
            variant="outline"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar novo acabamento
          </Button>
        )}
        <div className="flex-1 flex gap-2 justify-end">
          <Button variant="outline" onClick={prevStep}>
            Anterior
          </Button>
          <Button variant="outline" onClick={handleSkip}>
            Pular
          </Button>
          <Button
            onClick={handleContinue}
            className="bg-[#F66807] hover:bg-[#F66807]/90"
          >
            Continuar ({data.finishIds.length} selecionado{data.finishIds.length !== 1 ? "s" : ""})
          </Button>
        </div>
      </div>

      {data.finishIds.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>{data.finishIds.length} acabamento(s) selecionado(s)</strong>
          </p>
        </div>
      )}
    </div>
  );
}

