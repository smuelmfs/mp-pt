"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, FileText, Calendar, User, Package, Euro, TrendingUp, Building2, Download, FileSpreadsheet, Edit2, Save, X, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/ui/loading";

function money(n: number | string | null | undefined) {
  const v = typeof n === "number" ? n : Number(n || 0);
  return `€ ${v.toFixed(2)}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${id}`);
      const json = await res.json();
      setRow(json);
      setNotesText(json.notes || "");
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesText.trim() || null })
      });
      
      if (!res.ok) {
        let detail = "";
        try {
          const err = await res.json();
          detail = err?.error || err?.detail || "";
        } catch {}
        throw new Error(detail || "Erro ao salvar notas");
      }
      
      const data = await res.json();
      setRow((prev: any) => ({ ...prev, notes: data.notes }));
      setIsEditingNotes(false);
      toast.success("Notas salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar notas:", error);
      toast.error((error as Error)?.message || "Erro ao salvar notas");
    } finally {
      setSavingNotes(false);
    }
  }

  async function deleteQuote() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        let detail = "";
        try {
          const err = await res.json();
          detail = err?.error || err?.detail || "";
        } catch {}
        throw new Error(detail || "Erro ao excluir orçamento");
      }
      toast.success("Orçamento excluído com sucesso!");
      setTimeout(() => { window.location.href = "/quotes"; }, 800);
    } catch (error) {
      console.error("Erro ao excluir orçamento:", error);
      toast.error((error as Error)?.message || "Erro ao excluir orçamento");
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!Number.isFinite(id)) {
    return (
      <main className="min-h-screen bg-[#F6EEE8] flex items-center justify-center">
        <Card className="w-full max-w-md bg-white border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <h2 className="text-lg font-semibold mb-2">ID Inválido</h2>
              <p className="text-sm text-gray-600 mb-4">O ID do orçamento não é válido.</p>
              <Link 
                href="/quotes"
                className="inline-flex items-center px-6 py-3 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar aos Orçamentos
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (loading) {
    return <PageLoading message="Carregando orçamento..." />;
  }

  if (row?.error) {
    return (
      <main className="min-h-screen bg-[#F6EEE8] flex items-center justify-center">
        <Card className="w-full max-w-md bg-white border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <h2 className="text-lg font-semibold mb-2">Erro</h2>
              <p className="text-sm text-gray-600 mb-4">{row.error}</p>
              <Button asChild>
                <Link href="/quotes">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Voltar aos Orçamentos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const items = Array.isArray(row.items) ? row.items : [];
  const isMultiProduct = row.params && typeof row.params === 'object' && (row.params as any).multiProduct === true;
  const multiProducts = isMultiProduct && (row.params as any).products ? (row.params as any).products : [];

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Link 
                href="/quotes"
                className="inline-flex items-center text-[#341601] hover:text-[#F66807] transition-colors text-sm font-medium w-fit"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#341601]">Orçamento Nº {row.number}</h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">Detalhes completos do orçamento</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/quotes/${id}/export/pdf`);
                    if (!res.ok) throw new Error("Erro ao gerar PDF");
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `orcamento-${row.number}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast.success("PDF gerado com sucesso!");
                  } catch (error) {
                    console.error("Erro ao exportar PDF:", error);
                    toast.error("Erro ao gerar PDF");
                  }
                }}
                size="sm"
                className="text-xs sm:text-sm"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Exportar PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/quotes/${id}/export/excel`);
                    if (!res.ok) throw new Error("Erro ao gerar Excel");
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `orcamento-${row.number}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast.success("Excel gerado com sucesso!");
                  } catch (error) {
                    console.error("Erro ao exportar Excel:", error);
                    toast.error("Erro ao gerar Excel");
                  }
                }}
                size="sm"
                className="text-xs sm:text-sm"
              >
                <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Exportar Excel</span>
                <span className="sm:hidden">Excel</span>
              </Button>
              <Button 
                onClick={() => window.print()}
                size="sm"
                className="text-xs sm:text-sm"
              >
                <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Imprimir</span>
                <span className="sm:hidden">Print</span>
              </Button>
              <Button
                onClick={() => setShowDeleteModal(true)}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 text-xs sm:text-sm"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Excluir</span>
                <span className="sm:hidden">Del</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Informações Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-[#341601]">
                <Package className="h-5 w-5" />
                {isMultiProduct ? 'Produtos' : 'Produto'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {isMultiProduct ? (
                  <>
                    <div>
                      <span className="text-sm text-gray-600">Total de Produtos:</span>
                      <p className="font-medium">{multiProducts.length}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Quantidade Total:</span>
                      <p className="font-medium">{multiProducts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0).toLocaleString()}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-sm text-gray-600">Nome:</span>
                      <p className="font-medium">{row.product?.name || "Não especificado"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Quantidade:</span>
                      <p className="font-medium">{row.quantity?.toLocaleString() || "0"}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {(row.customer || (isMultiProduct && (row.params as any)?.customerName)) && (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-[#341601]">
                  <Building2 className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {row.customer ? (
                    <>
                      <div>
                        <span className="text-sm text-gray-600">Nome:</span>
                        <p className="font-medium">{row.customer.name}</p>
                      </div>
                      {row.customer.email && (
                        <div>
                          <span className="text-sm text-gray-600">Email:</span>
                          <p className="font-medium">{row.customer.email}</p>
                        </div>
                      )}
                      {row.customer.taxId && (
                        <div>
                          <span className="text-sm text-gray-600">NIF:</span>
                          <p className="font-medium">{row.customer.taxId}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <span className="text-sm text-gray-600">Solicitante:</span>
                      <p className="font-medium">{(row.params as any)?.customerName || 'Não especificado'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-[#341601]">
                <Euro className="h-5 w-5" />
                Valores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <p className="font-medium">{money(row.subtotal)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Preço Final:</span>
                  <p className="font-bold text-lg">{money(row.finalPrice)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-[#341601]">
                <Calendar className="h-5 w-5" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Criado em:</span>
                  <p className="font-medium">{formatDate(row.createdAt)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Usuário:</span>
                  <p className="font-medium">{row.user?.name || "Sistema"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Margens e Ajustes */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#341601]">
              <TrendingUp className="h-5 w-5" />
              Margens e Ajustes Aplicados
              {row?.product?.roundingStrategy === 'PER_STEP' && (
                <Badge variant="secondary" className="ml-2">
                  Arredondamento por etapa
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Detalhamento dos cálculos aplicados ao orçamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-[#F6EEE8] rounded-lg">
                <div className="text-sm text-gray-600">Markup</div>
                <div className="text-xl font-semibold">
                  {(Number(row.markupApplied) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-4 bg-[#F6EEE8] rounded-lg">
                <div className="text-sm text-gray-600">Margem</div>
                <div className="text-xl font-semibold">
                  {(Number(row.marginApplied) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-4 bg-[#F6EEE8] rounded-lg">
                <div className="text-sm text-gray-600">Dinâmica</div>
                <div className="text-xl font-semibold">
                  {(Number(row.dynamicAdjust) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-4 bg-[#F6EEE8] rounded-lg">
                <div className="text-sm text-gray-600">IVA</div>
                <div className="text-xl font-semibold">
                  {row.vatAmount ? money(row.vatAmount) : "N/A"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Produtos (Multi-produto) */}
        {isMultiProduct && multiProducts.length > 0 && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#341601]">Produtos do Orçamento</CardTitle>
              <CardDescription>
                Lista de todos os produtos incluídos neste orçamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {multiProducts.map((product: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-[#F6EEE8] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#341601] mb-2">{product.productName || `Produto ${index + 1}`}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Quantidade:</span>
                            <p className="font-medium">{product.quantity?.toLocaleString() || '0'}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Subtotal:</span>
                            <p className="font-medium">{money(product.subtotal || 0)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Preço Final:</span>
                            <p className="font-medium text-[#F66807]">{money(product.finalPrice || 0)}</p>
                          </div>
                          {product.vatAmount > 0 && (
                            <div>
                              <span className="text-gray-600">Com IVA:</span>
                              <p className="font-medium">{money(product.priceGross || 0)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-6 pt-4 border-t-2 border-[#F66807]">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-[#341601]">Total Geral:</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Subtotal: {money((row.params as any).totalSubtotal || row.subtotal)}</p>
                      <p className="text-2xl font-bold text-[#F66807]">{money(row.finalPrice)}</p>
                      {row.vatAmount && (
                        <p className="text-sm text-gray-600">Com IVA: {money(row.priceGross || 0)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalhamento dos Itens */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#341601]">Detalhamento dos Itens</CardTitle>
            <CardDescription>
              {isMultiProduct ? 'Lista completa de todos os itens de todos os produtos' : 'Lista completa de todos os itens incluídos no orçamento'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum item encontrado neste orçamento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-medium text-[#341601]">Tipo</th>
                      <th className="text-left py-3 px-2 font-medium text-[#341601]">Nome</th>
                      <th className="text-right py-3 px-2 font-medium text-[#341601]">Quantidade</th>
                      <th className="text-left py-3 px-2 font-medium text-[#341601]">Unidade</th>
                      <th className="text-right py-3 px-2 font-medium text-[#341601]">Custo Unit.</th>
                      <th className="text-right py-3 px-2 font-medium text-[#341601]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, index: number) => (
                      <tr key={item.id || index} className="border-b border-gray-100 hover:bg-[#F6EEE8]">
                        <td className="py-3 px-2">
                          <Badge variant="outline" className="text-xs">
                            {item.itemType}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 font-medium">{item.name}</td>
                        <td className="py-3 px-2 text-right">{item.quantity || "-"}</td>
                        <td className="py-3 px-2">{item.unit || "-"}</td>
                        <td className="py-3 px-2 text-right">{item.unitCost ? money(item.unitCost) : "-"}</td>
                        <td className="py-3 px-2 text-right font-medium">
                          {item.totalCost ? money(item.totalCost) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notas do Orçamento */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#341601]">Notas do Orçamento</CardTitle>
                <CardDescription>
                  Informações adicionais e observações sobre este orçamento (apenas no sistema)
                </CardDescription>
              </div>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="inline-flex items-center px-4 py-2 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors shadow-sm text-sm"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  {row.notes ? "Editar Nota" : "Adicionar Nota"}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingNotes ? (
              <div className="space-y-4">
                <textarea
                  value={notesText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotesText(e.target.value)}
                  placeholder="Digite suas notas aqui..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] min-h-[150px] resize-y"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="inline-flex items-center px-6 py-3 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingNotes ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingNotes(false);
                      setNotesText(row.notes || "");
                    }}
                    disabled={savingNotes}
                    className="inline-flex items-center px-6 py-3 border border-gray-300 text-[#341601] font-medium rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : row.notes ? (
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{row.notes}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma nota adicionada a este orçamento.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#341601]">Excluir Orçamento</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Tem certeza que deseja excluir o orçamento <span className="font-medium">#{row?.number}</span>?
                  </p>
                </div>
              </div>
              <p className="text-sm text-red-600 mb-6">
                Esta ação não pode ser desfeita. Todos os dados relacionados a este orçamento serão permanentemente removidos.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={deleteQuote}
                  disabled={deleting}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? "Excluindo..." : "Sim, Excluir"}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-[#341601] font-medium rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}