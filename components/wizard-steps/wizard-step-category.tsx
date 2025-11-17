"use client";

import { useState, useEffect, useMemo } from "react";
import { useProductWizard } from "@/contexts/product-wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Layers, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseZodErrors } from "@/lib/parse-zod-errors";

export function WizardStepCategory() {
  const { data, updateData, nextStep, prevStep } = useProductWizard();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    roundingStep: "0.05",
    roundingStrategy: "",
    pricingStrategy: "",
    minPricePerPiece: "",
    lossFactor: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createCategory() {
    if (!form.name.trim()) {
      setFieldErrors({ name: "Informe o nome da categoria" });
      toast.error("Preencha o campo obrigatório.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          roundingStep: form.roundingStep ? Number(form.roundingStep) : 0.05,
          roundingStrategy: form.roundingStrategy || null,
          pricingStrategy: form.pricingStrategy || null,
          minPricePerPiece: form.minPricePerPiece || null,
          lossFactor: form.lossFactor || null,
        }),
      });
      if (res.ok) {
        const newCategory = await res.json();
        toast.success("Categoria criada com sucesso");
        setCategories([...categories, newCategory]);
        updateData({ categoryId: newCategory.id });
        setShowCreate(false);
        setForm({
          name: "",
          roundingStep: "0.05",
          roundingStrategy: "",
          pricingStrategy: "",
          minPricePerPiece: "",
          lossFactor: "",
        });
        setFieldErrors({});
      } else {
        const errorData = await res.json().catch(() => ({}));
        const parsed = parseZodErrors(errorData);
        setFieldErrors(parsed.fieldErrors.name ? { name: parsed.fieldErrors.name } : {});
        toast.error(parsed.generalMessage || "Erro ao criar categoria");
      }
    } catch (error) {
      toast.error("Erro ao criar categoria");
    } finally {
      setCreating(false);
    }
  }

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.toLowerCase();
    return categories.filter((c) => c.name?.toLowerCase().includes(term));
  }, [categories, search]);

  const selectedCategory = categories.find((c) => c.id === data.categoryId);

  function handleSelect(categoryId: number) {
    // Permite desselecionar se já estiver selecionado
    if (data.categoryId === categoryId) {
      updateData({ categoryId: undefined });
    } else {
      updateData({ categoryId });
    }
  }

  function handleContinue() {
    if (!data.categoryId) {
      toast.error("Selecione ou crie uma categoria");
      return;
    }
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Layers className="w-12 h-12 mx-auto text-[#F66807] mb-4" />
        <h3 className="text-xl font-semibold text-[#341601] mb-2">
          Selecione ou crie uma categoria
        </h3>
        <p className="text-sm text-gray-600">
          A categoria é obrigatória para criar o produto.
        </p>
      </div>

      {/* Busca */}
      <div>
        <Input
          placeholder="Buscar categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Lista de categorias */}
      {!showCreate && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : filteredCategories.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {search ? "Nenhuma categoria encontrada" : "Nenhuma categoria cadastrada"}
            </p>
          ) : (
            filteredCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleSelect(category.id)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  data.categoryId === category.id
                    ? "border-[#F66807] bg-[#F6EEE8]"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[#341601]">{category.name}</p>
                  {data.categoryId === category.id && (
                    <Check className="w-5 h-5 text-[#F66807]" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Formulário de criação */}
      {showCreate && (
        <div className="border-2 border-[#F66807] rounded-lg p-4 space-y-4 bg-[#F6EEE8]">
          <h4 className="font-semibold text-[#341601]">Criar nova categoria</h4>
          <div>
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (fieldErrors.name) {
                  setFieldErrors({});
                }
              }}
              placeholder="Nome da categoria"
              className={fieldErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Arredondamento</Label>
              <Input
                type="number"
                step="0.01"
                value={form.roundingStep}
                onChange={(e) => setForm({ ...form, roundingStep: e.target.value })}
                placeholder="0.05"
              />
            </div>
            <div>
              <Label>Fator de Perda (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.lossFactor}
                onChange={(e) => setForm({ ...form, lossFactor: e.target.value })}
                placeholder="0.05"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={createCategory}
              disabled={creating || !form.name.trim()}
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
                  roundingStep: "0.05",
                  roundingStrategy: "",
                  pricingStrategy: "",
                  minPricePerPiece: "",
                  lossFactor: "",
                });
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
            Criar nova categoria
          </Button>
        )}
        <div className="flex-1 flex gap-2 justify-end">
          <Button variant="outline" onClick={prevStep}>
            Anterior
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!data.categoryId}
            className="bg-[#F66807] hover:bg-[#F66807]/90"
          >
            Continuar
          </Button>
        </div>
      </div>

      {selectedCategory && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>Categoria selecionada:</strong> {selectedCategory.name}
          </p>
        </div>
      )}
    </div>
  );
}

