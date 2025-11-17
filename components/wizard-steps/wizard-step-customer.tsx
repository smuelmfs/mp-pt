"use client";

import { useState, useEffect, useMemo } from "react";
import { useProductWizard } from "@/contexts/product-wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseZodErrors } from "@/lib/parse-zod-errors";

export function WizardStepCustomer() {
  const { data, updateData, nextStep, prevStep, currentStep } = useProductWizard();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", taxId: "" });
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
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers?activeOnly=true");
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createCustomer() {
    if (!form.name.trim()) {
      setFieldError("name", "Informe o nome do cliente");
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email || null,
          taxId: form.taxId || null,
          isActive: true,
        }),
      });
      if (res.ok) {
        const newCustomer = await res.json();
        toast.success("Cliente criado com sucesso");
        setCustomers([...customers, newCustomer]);
        updateData({ customerId: newCustomer.id });
        setShowCreate(false);
        setForm({ name: "", email: "", taxId: "" });
        setFieldErrors({});
      } else {
        const errorData = await res.json().catch(() => ({}));
        const parsed = parseZodErrors(errorData);
        setFieldErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
        toast.error(parsed.generalMessage || "Erro ao criar cliente");
      }
    } catch (error) {
      toast.error("Erro ao criar cliente");
    } finally {
      setCreating(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const term = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.taxId?.toLowerCase().includes(term)
    );
  }, [customers, search]);

  const selectedCustomer = customers.find((c) => c.id === data.customerId);

  function handleSelect(customerId: number) {
    // Permite desselecionar se já estiver selecionado
    if (data.customerId === customerId) {
      updateData({ customerId: undefined });
    } else {
      updateData({ customerId });
    }
  }

  function handleSkip() {
    updateData({ customerId: undefined });
    nextStep();
  }

  function handleContinue() {
    if (!data.customerId) {
      toast.error("Selecione um cliente ou pule esta etapa");
      return;
    }
    nextStep();
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="w-12 h-12 mx-auto text-[#F66807] mb-4" />
        <h3 className="text-xl font-semibold text-[#341601] mb-2">
          Selecione ou crie um cliente
        </h3>
        <p className="text-sm text-gray-600">
          Esta etapa é opcional. Você pode pular e continuar.
        </p>
      </div>

      {/* Busca */}
      <div>
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Lista de clientes */}
      {!showCreate && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : filteredCustomers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </p>
          ) : (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => handleSelect(customer.id)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  data.customerId === customer.id
                    ? "border-[#F66807] bg-[#F6EEE8]"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#341601]">{customer.name}</p>
                    {customer.email && (
                      <p className="text-sm text-gray-600">{customer.email}</p>
                    )}
                  </div>
                  {data.customerId === customer.id && (
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
          <h4 className="font-semibold text-[#341601]">Criar novo cliente</h4>
          <div>
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                clearFieldError("name");
              }}
              placeholder="Nome do cliente"
              className={fieldErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
            )}
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <Label>NIF</Label>
            <Input
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
              placeholder="NIF do cliente"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={createCustomer}
              disabled={creating || !form.name.trim()}
              className="flex-1 bg-[#F66807] hover:bg-[#F66807]/90"
            >
              {creating ? "Criando..." : "Criar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setForm({ name: "", email: "", taxId: "" });
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
            Criar novo cliente
          </Button>
        )}
        <div className="flex-1 flex gap-2 justify-end">
          {currentStep > 0 && (
            <Button variant="outline" onClick={prevStep}>
              Anterior
            </Button>
          )}
          <Button variant="outline" onClick={handleSkip}>
            Pular
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!data.customerId}
            className="bg-[#F66807] hover:bg-[#F66807]/90"
          >
            Continuar
          </Button>
        </div>
      </div>

      {selectedCustomer && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>Cliente selecionado:</strong> {selectedCustomer.name}
          </p>
        </div>
      )}
    </div>
  );
}

