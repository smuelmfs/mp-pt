"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, FileText, Calendar, User, Package, Euro, TrendingUp } from "lucide-react";

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

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${id}`);
      const json = await res.json();
      setRow(json);
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!Number.isFinite(id)) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <h2 className="text-lg font-semibold mb-2">ID Inválido</h2>
              <p className="text-sm text-slate-600 mb-4">O ID do orçamento não é válido.</p>
              <Button asChild>
                <Link href="/quotes">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar aos Orçamentos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
              <p className="text-slate-600">Carregando orçamento...</p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (row?.error) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <h2 className="text-lg font-semibold mb-2">Erro</h2>
              <p className="text-sm text-slate-600 mb-4">{row.error}</p>
              <Button asChild>
                <Link href="/quotes">
                  <ArrowLeft className="h-4 w-4 mr-2" />
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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/quotes">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Orçamento #{row.number}</h1>
              <p className="text-slate-600 mt-1">Detalhes completos do orçamento</p>
            </div>
          </div>
          <Button onClick={() => window.print()} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Imprimir/PDF
          </Button>
        </div>

        {/* Informações Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-600">Nome:</span>
                  <p className="font-medium">{row.product?.name || "Não especificado"}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Quantidade:</span>
                  <p className="font-medium">{row.quantity?.toLocaleString() || "0"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Valores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-600">Subtotal:</span>
                  <p className="font-medium">{money(row.subtotal)}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Preço Final:</span>
                  <p className="font-bold text-lg">{money(row.finalPrice)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-600">Criado em:</span>
                  <p className="font-medium">{formatDate(row.createdAt)}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Usuário:</span>
                  <p className="font-medium">{row.user?.name || "Sistema"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Margens e Ajustes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">Markup</div>
                <div className="text-xl font-semibold">
                  {(Number(row.markupApplied) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">Margem</div>
                <div className="text-xl font-semibold">
                  {(Number(row.marginApplied) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">Dinâmica</div>
                <div className="text-xl font-semibold">
                  {(Number(row.dynamicAdjust) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">IVA</div>
                <div className="text-xl font-semibold">
                  {row.vatAmount ? money(row.vatAmount) : "N/A"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalhamento dos Itens */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento dos Itens</CardTitle>
            <CardDescription>
              Lista completa de todos os itens incluídos no orçamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Nenhum item encontrado neste orçamento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 font-medium text-slate-700">Tipo</th>
                      <th className="text-left py-3 px-2 font-medium text-slate-700">Nome</th>
                      <th className="text-right py-3 px-2 font-medium text-slate-700">Quantidade</th>
                      <th className="text-left py-3 px-2 font-medium text-slate-700">Unidade</th>
                      <th className="text-right py-3 px-2 font-medium text-slate-700">Custo Unit.</th>
                      <th className="text-right py-3 px-2 font-medium text-slate-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, index: number) => (
                      <tr key={item.id || index} className="border-b border-slate-100 hover:bg-slate-50">
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
      </div>
    </main>
  );
}