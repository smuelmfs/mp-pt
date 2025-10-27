"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, FileText, Euro, RefreshCw } from "lucide-react";

type QuoteRow = {
  id: number; 
  number: string; 
  finalPrice: string;
  product?: { id: number; name: string } | null;
  createdAt: string;
};

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

export default function QuotesPage() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  async function loadQuotes() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/quotes");
      const json = await res.json();
      // A API retorna { data: [...], total: number, page: number, ... }
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadQuotes();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Orçamentos</h1>
            <p className="text-slate-600 mt-2">Gerencie todos os orçamentos criados</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={loadQuotes}
              disabled={loadingList}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button asChild className="flex items-center gap-2">
              <Link href="/quotes/categories">
                <FileText className="h-4 w-4" />
                Novo Orçamento
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Orçamentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rows.length}</div>
              <p className="text-xs text-muted-foreground">
                {rows.length === 0 ? 'Nenhum orçamento criado' : 'Orçamentos criados'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {money(rows.reduce((sum, row) => sum + Number(row.finalPrice || 0), 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                Valor total dos orçamentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Último Orçamento</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rows.length > 0 ? `#${rows[0].number}` : '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                {rows.length > 0 ? formatDate(rows[0].createdAt) : 'Nenhum orçamento'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Orçamentos List */}
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos Recentes</CardTitle>
            <CardDescription>
              Lista de todos os orçamentos criados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingList ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2 text-slate-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Carregando orçamentos...
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum orçamento encontrado</h3>
                <p className="text-slate-600 mb-4">Comece criando seu primeiro orçamento através das categorias.</p>
                <Button asChild>
                  <Link href="/quotes/categories">
                    <FileText className="h-4 w-4 mr-2" />
                    Criar Primeiro Orçamento
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((quote) => (
                  <div key={quote.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="font-mono">
                            #{quote.number}
                          </Badge>
                          <span className="text-sm text-slate-600">
                            {formatDate(quote.createdAt)}
                          </span>
                        </div>
                        <h3 className="font-medium text-slate-900 mb-1">
                          {quote.product?.name || 'Produto não especificado'}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>ID: {quote.id}</span>
                          <span className="font-medium text-slate-900">
                            Valor: {money(quote.finalPrice)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/quotes/${quote.id}`}>
                            Ver Detalhes
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}