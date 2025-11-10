"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2 } from "lucide-react";

export default function PrintingDetailPage() {
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
    const res = await fetch(`/api/admin/printing/${id}`);
    const json = await res.json();
    setRow(json);
    setFormData(json);
    
    // Carrega preços por cliente
    const pricesRes = await fetch(`/api/admin/customer-prices/printing?printingId=${id}`);
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
      await fetch(`/api/admin/printing/${id}`, {
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

  // Mantém função patch para compatibilidade
  async function patch(patch: any) {
    setFormData({ ...formData, ...patch });
    setHasChanges(true);
  }

  async function deletePrinting() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/printing/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Impressão eliminada com sucesso");
        router.push("/printing");
      } else {
        const j = await res.json();
        toast.error(j.error || "Falha ao eliminar impressão");
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
    return (
      <div className="min-h-screen bg-[#F6EEE8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
        title="Eliminar Impressão"
        description={row ? `Tem a certeza que deseja eliminar a impressão "${row.formatLabel || row.technology || "esta impressão"}"? Esta ação irá desativar a impressão.` : "Tem a certeza que deseja eliminar esta impressão? Esta ação irá desativar a impressão."}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={deletePrinting}
        loading={deleting}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/printing" 
                className="inline-flex items-center text-[#341601] hover:text-[#F66807] transition-colors"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{row.technology} - {row.formatLabel || 'Sem formato'}</h1>
                <p className="text-sm text-gray-600 mt-1">Detalhes e configurações da impressão</p>
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
            <h2 className="text-lg font-semibold text-gray-900">Configurações da Impressão</h2>
            <p className="text-sm text-gray-600 mt-1">Edite as informações básicas da impressão</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tecnologia
                </label>
                <select
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.technology}
                  onChange={(e) => patch({ technology: e.target.value })}
                >
                  <option value="OFFSET">OFFSET</option>
                  <option value="DIGITAL">DIGITAL</option>
                  <option value="UV">UV</option>
                  <option value="GRANDE_FORMATO">GRANDE_FORMATO</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.formatLabel ?? ""}
                  onBlur={(e) => patch({ formatLabel: e.target.value || null })}
                  placeholder="Ex: A4, A3, A2..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cores
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.colors ?? ""}
                  onBlur={(e) => patch({ colors: e.target.value || null })}
                  placeholder="Ex: 4+0, 4+4..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lados
                </label>
                <input
                  type="number"
                  min="1"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.sides ?? ""}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    patch({ sides: Number.isFinite(v) ? v : null });
                  }}
                  placeholder="1 ou 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço por Unidade
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.unitPrice}
                  onBlur={(e) => patch({ unitPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rendimento (Yield)
                </label>
                <input
                  type="number"
                  min="0"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.yield ?? ""}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    patch({ yield: Number.isFinite(v) ? v : null });
                  }}
                  placeholder="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Setup (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] transition-colors"
                  defaultValue={row.setupMinutes ?? ""}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    patch({ setupMinutes: Number.isFinite(v) ? v : null });
                  }}
                  placeholder="30"
                />
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
                      <th className="p-3 text-left font-medium">Lados</th>
                      <th className="p-3 text-left font-medium">Preço Unitário</th>
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
                          <td className="p-3">{cp.sides || '-'}</td>
                          <td className="p-3 font-medium">€{Number(cp.unitPrice).toFixed(4)}</td>
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
