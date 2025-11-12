"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2 } from "lucide-react";

export default function FinishDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerPrices, setCustomerPrices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/finishes/${id}`);
    const json = await res.json();
    setRow(json);
    setFormData(json);
    
    // Carrega preços por cliente
    const pricesRes = await fetch(`/api/admin/customer-prices/finishes?finishId=${id}`);
    if (pricesRes.ok) {
      const prices = await pricesRes.json();
      setCustomerPrices(prices);
    }
    
    // Carrega lista de clientes
    const customersRes = await fetch(`/api/admin/customers?activeOnly=true`);
    if (customersRes.ok) {
      const customersData = await customersRes.json();
      setCustomers(customersData);
    }
    
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
      await fetch(`/api/admin/finishes/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formData),
      });
      setHasChanges(false);
      load();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }

  // Mantém função patch para compatibilidade com inputs existentes
  async function patch(patch: any) {
    setFormData({ ...formData, ...patch });
    setHasChanges(true);
  }

  async function deleteFinish() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/finishes/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Acabamento eliminado com sucesso");
        router.push("/finishes");
      } else {
        const j = await res.json();
        toast.error(j.error || "Falha ao eliminar acabamento");
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (!Number.isFinite(id)) {
    return (
      <div className="min-h-screen bg-[#F6EEE8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium">ID inválido</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <PageLoading message="Carregando acabamento..." />;
  }

  if (row?.error) {
    return (
      <div className="min-h-screen bg-[#F6EEE8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium">{row.error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6EEE8]">
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar Acabamento"
        description={`Tem a certeza que deseja eliminar o acabamento "${row?.name}"? Esta ação irá desativar o acabamento.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={deleteFinish}
        loading={deleting}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/finishes" 
                className="inline-flex items-center text-[#341601] hover:text-[#F66807] transition-colors"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{row.name}</h1>
                <p className="text-sm text-gray-600 mt-1">Detalhes e configurações do acabamento</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </button>
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
          </div>
        </div>

        {/* Formulário Principal */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Configurações do Acabamento</h2>
            <p className="text-sm text-gray-600 mt-1">Edite as informações básicas do acabamento</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.name}
                  onBlur={(e) => patch({ name: e.target.value })}
                  placeholder="Nome do acabamento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.category}
                  onChange={(e) => patch({ category: e.target.value })}
                >
                  <option value="LAMINACAO">Laminação</option>
                  <option value="VERNIZ">Verniz</option>
                  <option value="CORTE">Corte</option>
                  <option value="DOBRA">Dobra</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidade
                </label>
                <select
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custo Base
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.baseCost}
                  onBlur={(e) => patch({ baseCost: e.target.value })}
                  placeholder="0.0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Margem Padrão (opcional)
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.marginDefault ?? ""}
                  onBlur={(e) => patch({ marginDefault: e.target.value || null })}
                  placeholder="0.15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cálculo
                </label>
                <select
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.calcType}
                  onChange={(e) => patch({ calcType: e.target.value })}
                >
                  <option value="PER_UNIT">Por Unidade</option>
                  <option value="PER_M2">Por M²</option>
                  <option value="PER_LOT">Por Lote</option>
                  <option value="PER_HOUR">Por Hora</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa Mínima
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.minFee ?? ""}
                  onBlur={(e) => patch({ minFee: e.target.value || null })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Área Step (m²)
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.areaStepM2 ?? ""}
                  onBlur={(e) => patch({ areaStepM2: e.target.value || null })}
                  placeholder="1.00"
                />
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    className="h-4 w-4 text-[#F66807] focus:ring-[#F66807] border-gray-300 rounded"
                    defaultChecked={row.active}
                    onChange={(e) => patch({ active: e.target.checked })}
                  />
                  <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700">
                    Ativo
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preços por Cliente */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Preços por Cliente</h2>
            <p className="text-sm text-gray-600 mt-1">Preços específicos configurados para cada cliente</p>
          </div>
          
          <div className="p-6">
            {customerPrices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum preço específico por cliente configurado.</p>
                <p className="text-sm mt-2">Configure preços por cliente na página do cliente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F6EEE8] border-b text-gray-700">
                      <th className="p-3 text-left font-medium">Cliente</th>
                      <th className="p-3 text-left font-medium">Custo Base</th>
                      <th className="p-3 text-left font-medium">Taxa Mínima</th>
                      <th className="p-3 text-left font-medium">Área Step (m²)</th>
                      <th className="p-3 text-left font-medium">Prioridade</th>
                      <th className="p-3 text-left font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerPrices.map((cp: any) => {
                      const customer = customers.find((c: any) => c.id === cp.customerId);
                      return (
                        <tr key={cp.id} className="border-b hover:bg-white">
                          <td className="p-3">
                            <Link 
                              href={`/customers/${cp.customerId}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {customer?.name || `Cliente #${cp.customerId}`}
                            </Link>
                          </td>
                          <td className="p-3 font-medium">€{Number(cp.baseCost).toFixed(4)}</td>
                          <td className="p-3">{cp.minFee ? `€${Number(cp.minFee).toFixed(2)}` : '-'}</td>
                          <td className="p-3">{cp.areaStepM2 ? Number(cp.areaStepM2).toFixed(4) : '-'}</td>
                          <td className="p-3">{cp.priority}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              cp.isCurrent 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {cp.isCurrent ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
