"use client";

import { useState, useEffect, useMemo } from "react";
import { useProductWizard } from "@/contexts/product-wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Printer, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function WizardStepPrinting() {
  const { data, updateData, nextStep, prevStep } = useProductWizard();
  const [printings, setPrintings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    technology: "OFFSET",
    formatLabel: "",
    colors: "",
    sides: "1",
    unitPrice: "",
    yield: "1",
    setupMinutes: "0",
    minFee: "0.00",
  });

  useEffect(() => {
    loadPrintings();
  }, []);

  async function loadPrintings() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/printing?activeOnly=true");
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        setPrintings(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar impressões:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createPrinting() {
    if (!form.formatLabel || !form.formatLabel.trim()) {
      toast.error("Nome da impressão é obrigatório");
      return;
    }
    if (!form.unitPrice || !form.unitPrice.trim()) {
      toast.error("Preço unitário é obrigatório");
      return;
    }
    
    // Valida e formata unitPrice (deve ser um número com até 4 casas decimais)
    const unitPriceValue = form.unitPrice.trim();
    // Aceita números inteiros ou decimais com até 4 casas (ex: 0, 0.0, 0.0000)
    if (!/^\d+(\.\d{1,4})?$/.test(unitPriceValue)) {
      toast.error("Preço unitário deve ser um número válido (ex: 0.0000 ou 0)");
      return;
    }
    
    // Garante que o valor não termine com ponto (ex: "0." -> "0")
    const normalizedUnitPrice = unitPriceValue.replace(/\.$/, '') || '0';
    
    // Valida e formata minFee se fornecido (deve ser um número com até 2 casas decimais)
    let minFeeValue: string | null = null;
    if (form.minFee && form.minFee.trim()) {
      const minFeeTrimmed = form.minFee.trim();
      if (!/^\d+(\.\d{1,2})?$/.test(minFeeTrimmed)) {
        toast.error("Taxa mínima deve ser um número válido (ex: 0.00)");
        return;
      }
      minFeeValue = minFeeTrimmed;
    }
    
    setCreating(true);
    try {
      const body: any = {
        technology: form.technology,
        formatLabel: form.formatLabel.trim() || undefined,
        unitPrice: normalizedUnitPrice,
        active: true,
      };
      
      // Adiciona campos opcionais apenas se tiverem valor
      if (form.colors && form.colors.trim()) {
        body.colors = form.colors.trim();
      }
      
      if (form.sides && Number(form.sides) > 0) {
        body.sides = Number(form.sides);
      }
      
      if (form.yield && Number(form.yield) > 0) {
        body.yield = Number(form.yield);
      }
      
      if (form.setupMinutes && Number(form.setupMinutes) >= 0) {
        body.setupMinutes = Number(form.setupMinutes);
      }
      
      if (minFeeValue) {
        body.minFee = minFeeValue;
      }
      
      const res = await fetch("/api/admin/printing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        const newPrinting = await res.json();
        toast.success("Impressão criada com sucesso");
        setPrintings([...printings, newPrinting]);
        updateData({ printingId: newPrinting.id });
        setShowCreate(false);
        setForm({
          technology: "OFFSET",
          formatLabel: "",
          colors: "",
          sides: "1",
          unitPrice: "",
          yield: "1",
          setupMinutes: "0",
          minFee: "0.00",
        });
        // Recarrega a lista para incluir a nova impressão
        loadPrintings();
      } else {
        const errorData = await res.json().catch(() => ({}));
        // Extrai mensagem de erro do objeto Zod ou erro genérico
        let errorMessage = "Erro ao criar impressão";
        
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error.formErrors && errorData.error.formErrors.length > 0) {
            // Erro do Zod: pega o primeiro erro de formulário
            errorMessage = errorData.error.formErrors[0];
          } else if (errorData.error.fieldErrors) {
            // Erro do Zod: pega o primeiro erro de campo
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
      console.error("Erro ao criar impressão:", error);
      toast.error("Erro ao criar impressão");
    } finally {
      setCreating(false);
    }
  }

  const filteredPrintings = useMemo(() => {
    if (!search.trim()) return printings;
    const term = search.toLowerCase();
    return printings.filter(
      (p) =>
        p.technology?.toLowerCase().includes(term) ||
        p.formatLabel?.toLowerCase().includes(term)
    );
  }, [printings, search]);

  const selectedPrinting = printings.find((p) => p.id === data.printingId);

  function handleSelect(printingId: number) {
    // Permite desselecionar se já estiver selecionado
    if (data.printingId === printingId) {
      updateData({ printingId: undefined });
    } else {
      updateData({ printingId });
    }
  }

  function handleContinue() {
    if (!data.printingId) {
      toast.error("Selecione ou crie uma impressão");
      return;
    }
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Printer className="w-12 h-12 mx-auto text-[#F66807] mb-4" />
        <h3 className="text-xl font-semibold text-[#341601] mb-2">
          Selecione ou crie uma impressão
        </h3>
        <p className="text-sm text-gray-600">
          A impressão é obrigatória para criar o produto.
        </p>
      </div>

      <div>
        <Input
          placeholder="Buscar impressão..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>

      {!showCreate && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : filteredPrintings.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {search ? "Nenhuma impressão encontrada" : "Nenhuma impressão cadastrada"}
            </p>
          ) : (
            filteredPrintings.map((printing) => (
              <button
                key={printing.id}
                onClick={() => handleSelect(printing.id)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  data.printingId === printing.id
                    ? "border-[#F66807] bg-[#F6EEE8]"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#341601]">
                      {printing.formatLabel || "Sem nome"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {printing.technology}
                      {printing.colors && ` • ${printing.colors} cores`}
                      {printing.sides && ` • ${printing.sides} faces`}
                    </p>
                  </div>
                  {data.printingId === printing.id && (
                    <Check className="w-5 h-5 text-[#F66807]" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {showCreate && (
        <div className="border-2 border-[#F66807] rounded-lg p-4 space-y-4 bg-[#F6EEE8]">
          <h4 className="font-semibold text-[#341601]">Criar nova impressão</h4>
          <div>
            <Label>Nome da Impressão *</Label>
            <Input
              value={form.formatLabel}
              onChange={(e) => setForm({ ...form, formatLabel: e.target.value })}
              placeholder="Ex: A4, A3, Cartão de Visita..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tecnologia *</Label>
              <Select
                value={form.technology}
                onValueChange={(value) => setForm({ ...form, technology: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFSET">Offset</SelectItem>
                  <SelectItem value="DIGITAL">Digital</SelectItem>
                  <SelectItem value="UV">UV</SelectItem>
                  <SelectItem value="GRANDE_FORMATO">Grande Formato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço Unitário *</Label>
              <Input
                type="text"
                value={form.unitPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  // Permite apenas números e ponto decimal, com até 4 casas decimais
                  if (value === "" || /^\d+(\.\d{0,4})?$/.test(value)) {
                    setForm({ ...form, unitPrice: value });
                  }
                }}
                placeholder="0.0000"
              />
              <p className="text-xs text-gray-500 mt-1">Formato: número com até 4 casas decimais (ex: 0.0000)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={createPrinting}
              disabled={creating || !form.formatLabel?.trim() || !form.unitPrice}
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
            Criar nova impressão
          </Button>
        )}
        <div className="flex-1 flex gap-2 justify-end">
          <Button variant="outline" onClick={prevStep}>
            Anterior
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!data.printingId}
            className="bg-[#F66807] hover:bg-[#F66807]/90"
          >
            Continuar
          </Button>
        </div>
      </div>

      {selectedPrinting && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>Impressão selecionada:</strong> {selectedPrinting.formatLabel || selectedPrinting.technology}
          </p>
        </div>
      )}
    </div>
  );
}

