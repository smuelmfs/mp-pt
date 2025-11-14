"use client";

import { useState, useEffect, useMemo } from "react";
import { useProductWizard } from "@/contexts/product-wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Building2, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function WizardStepSupplier() {
  const { data, updateData, nextStep, prevStep } = useProductWizard();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/suppliers?activeOnly=1");
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createSupplier() {
    if (!formName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: formName.trim() }),
      });
      if (res.ok) {
        const newSupplier = await res.json();
        toast.success("Fornecedor criado com sucesso");
        setSuppliers([...suppliers, newSupplier]);
        updateData({ supplierId: newSupplier.id });
        setShowCreate(false);
        setFormName("");
      } else {
        const errorData = await res.json().catch(() => ({}));
        let errorMessage = "Erro ao criar fornecedor";
        
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
      toast.error("Erro ao criar fornecedor");
    } finally {
      setCreating(false);
    }
  }

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const term = search.toLowerCase();
    return suppliers.filter((s) => s.name?.toLowerCase().includes(term));
  }, [suppliers, search]);

  const selectedSupplier = suppliers.find((s) => s.id === data.supplierId);

  function handleSelect(supplierId: number) {
    // Permite desselecionar se já estiver selecionado
    if (data.supplierId === supplierId) {
      updateData({ supplierId: undefined });
    } else {
      updateData({ supplierId });
    }
  }

  function handleSkip() {
    updateData({ supplierId: undefined });
    nextStep();
  }

  function handleContinue() {
    if (!data.supplierId) {
      toast.error("Selecione um fornecedor ou pule esta etapa");
      return;
    }
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Building2 className="w-12 h-12 mx-auto text-[#F66807] mb-4" />
        <h3 className="text-xl font-semibold text-[#341601] mb-2">
          Selecione ou crie um fornecedor
        </h3>
        <p className="text-sm text-gray-600">
          Esta etapa é opcional. Você pode pular e continuar.
        </p>
      </div>

      {/* Busca */}
      <div>
        <Input
          placeholder="Buscar fornecedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Lista de fornecedores */}
      {!showCreate && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : filteredSuppliers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {search ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
            </p>
          ) : (
            filteredSuppliers.map((supplier) => (
              <button
                key={supplier.id}
                onClick={() => handleSelect(supplier.id)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  data.supplierId === supplier.id
                    ? "border-[#F66807] bg-[#F6EEE8]"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[#341601]">{supplier.name}</p>
                  {data.supplierId === supplier.id && (
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
          <h4 className="font-semibold text-[#341601]">Criar novo fornecedor</h4>
          <div>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Nome do fornecedor"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={createSupplier}
              disabled={creating || !formName.trim()}
              className="flex-1 bg-[#F66807] hover:bg-[#F66807]/90"
            >
              {creating ? "Criando..." : "Criar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setFormName("");
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
            Criar novo fornecedor
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
            disabled={!data.supplierId}
            className="bg-[#F66807] hover:bg-[#F66807]/90"
          >
            Continuar
          </Button>
        </div>
      </div>

      {selectedSupplier && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>Fornecedor selecionado:</strong> {selectedSupplier.name}
          </p>
        </div>
      )}
    </div>
  );
}

