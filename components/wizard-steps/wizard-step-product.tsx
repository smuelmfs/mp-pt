"use client";

import { useState, useEffect } from "react";
import { useProductWizard } from "@/contexts/product-wizard-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package } from "lucide-react";

export function WizardStepProduct() {
  const { data, updateData, nextStep, prevStep } = useProductWizard();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    marginDefault: "",
    markupDefault: "",
    roundingStep: "",
    roundingStrategy: "",
    pricingStrategy: "",
    minPricePerPiece: "",
  });

  useEffect(() => {
    // Pré-preenche o nome se não tiver
    if (!form.name && data.productName) {
      setForm((f) => ({ ...f, name: data.productName || "" }));
    }
  }, [data.productName]);

  async function createProduct() {
    if (!form.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }
    if (!data.categoryId) {
      toast.error("Categoria é obrigatória");
      return;
    }
    setCreating(true);
    try {
      const body: any = {
        name: form.name.trim(),
        categoryId: Number(data.categoryId),
        printingId: data.printingId ? Number(data.printingId) : null,
        marginDefault: form.marginDefault || null,
        markupDefault: form.markupDefault || null,
        roundingStep: form.roundingStep || null,
        roundingStrategy: form.roundingStrategy || null,
        pricingStrategy: form.pricingStrategy || null,
        minPricePerPiece: form.minPricePerPiece || null,
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const newProduct = await res.json();
        toast.success("Produto criado com sucesso!");
        updateData({ 
          productName: form.name.trim(),
          productId: newProduct.id 
        });
        
        // Avança para o último passo (margem) que mostra a confirmação
        // O passo de margem irá redirecionar
        nextStep();
      } else {
        const errorData = await res.json().catch(() => ({}));
        let errorMessage = "Erro ao criar produto";
        
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
    } catch (error) {
      toast.error("Erro ao criar produto");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Package className="w-12 h-12 mx-auto text-[#F66807] mb-4" />
        <h3 className="text-xl font-semibold text-[#341601] mb-2">
          Configure o produto
        </h3>
        <p className="text-sm text-gray-600">
          Complete as informações básicas do produto. Materiais e acabamentos serão configurados na próxima etapa.
        </p>
      </div>

      {/* Resumo das seleções */}
      <div className="bg-[#F6EEE8] rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-[#341601]">Resumo das seleções:</p>
        <div className="text-xs text-gray-600 space-y-1">
          {data.categoryId && <p>• Categoria selecionada</p>}
          {data.materialIds.length > 0 && <p>• {data.materialIds.length} material(is) selecionado(s)</p>}
          {data.printingId && <p>• Impressão selecionada</p>}
          {data.finishIds.length > 0 && <p>• {data.finishIds.length} acabamento(s) selecionado(s)</p>}
        </div>
      </div>

      {/* Formulário */}
      <div className="space-y-4">
        <div>
          <Label>Nome do Produto *</Label>
          <Input
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              updateData({ productName: e.target.value });
            }}
            placeholder="Nome do produto"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Margem Padrão (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.marginDefault}
              onChange={(e) => setForm({ ...form, marginDefault: e.target.value })}
              placeholder="30"
            />
          </div>
          <div>
            <Label>Markup Padrão (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.markupDefault}
              onChange={(e) => setForm({ ...form, markupDefault: e.target.value })}
              placeholder="10"
            />
          </div>
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
            <Label>Preço Mínimo por Peça</Label>
            <Input
              type="number"
              step="0.01"
              value={form.minPricePerPiece}
              onChange={(e) => setForm({ ...form, minPricePerPiece: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={prevStep}>
          Anterior
        </Button>
        <Button
          onClick={createProduct}
          disabled={creating || !form.name.trim() || !data.categoryId}
          className="bg-[#F66807] hover:bg-[#F66807]/90"
        >
          {creating ? "Criando..." : "Criar Produto"}
        </Button>
      </div>
    </div>
  );
}

