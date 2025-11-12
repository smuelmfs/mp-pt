"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarDays, FileText, Euro, RefreshCw, Search, Filter, X } from "lucide-react";
import { Loading, ListSkeleton } from "@/components/ui/loading";

type QuoteRow = {
  id: number; 
  number: string; 
  finalPrice: string;
  quantity?: number | null;
  product?: { id: number; name: string } | null;
  customer?: { id: number; name: string } | null;
  createdAt: string;
};

type Customer = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Carregar clientes e produtos para filtros
  useEffect(() => {
    async function loadFilters() {
      try {
        const [customersRes, productsRes] = await Promise.all([
          fetch("/api/admin/customers?activeOnly=true"),
          fetch("/api/admin/products?activeOnly=true&limit=200")
        ]);
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(Array.isArray(customersData) ? customersData : []);
        }
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(Array.isArray(productsData) ? productsData : []);
        }
      } catch (error) {
        console.error('Erro ao carregar filtros:', error);
      }
    }
    loadFilters();
  }, []);

  async function loadQuotes() {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("q", debouncedSearch);
      if (selectedCustomer) params.append("customerId", selectedCustomer);
      if (selectedProduct) params.append("productId", selectedProduct);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const res = await fetch(`/api/quotes?${params.toString()}`);
      const json = await res.json();
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadQuotes();
  }, [debouncedSearch, selectedCustomer, selectedProduct, dateFrom, dateTo]);

  function clearFilters() {
    setSearchQuery("");
    setSelectedCustomer("");
    setSelectedProduct("");
    setDateFrom("");
    setDateTo("");
  }

  const hasActiveFilters = debouncedSearch || selectedCustomer || selectedProduct || dateFrom || dateTo;

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#341601]">Orçamentos</h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Gerencie todos os orçamentos criados</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                onClick={loadQuotes}
                disabled={loadingList}
                variant="outline"
                size="lg"
                className="text-sm sm:text-base"
              >
                <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 ${loadingList ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button 
                asChild
                size="lg"
                className="text-sm sm:text-base"
              >
                <Link href="/quotes/categories">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Novo Orçamento
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="bg-white border-gray-200 shadow-sm">
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
          
          <Card className="bg-white border-gray-200 shadow-sm">
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

          <Card className="bg-white border-gray-200 shadow-sm">
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

        {/* Filtros e Busca */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Buscar e Filtrar</CardTitle>
                <CardDescription>
                  Encontre orçamentos específicos usando os filtros abaixo
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button 
                    onClick={clearFilters}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-[#341601] rounded-lg hover:bg-white transition-colors text-sm font-medium"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </button>
                )}
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-[#341601] rounded-lg hover:bg-white transition-colors text-sm font-medium"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por número, produto, cliente ou usuário..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filtros Avançados */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">
                      Cliente
                    </label>
                    <select
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F66807]"
                    >
                      <option value="">Todos os clientes</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">
                      Produto
                    </label>
                    <select
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F66807] focus:border-[#F66807] hover:border-gray-400 transition-colors"
                    >
                      <option value="">Todos os produtos</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">
                      Data Inicial
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#341601] mb-2">
                      Data Final
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orçamentos List */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Orçamentos {hasActiveFilters ? 'Filtrados' : 'Recentes'}</CardTitle>
            <CardDescription>
              {hasActiveFilters 
                ? `${rows.length} orçamento(s) encontrado(s) com os filtros aplicados`
                : 'Lista de todos os orçamentos criados no sistema'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingList ? (
              <ListSkeleton count={5} />
            ) : rows.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#341601] mb-2">Nenhum orçamento encontrado</h3>
                <p className="text-gray-600 mb-4">Comece criando seu primeiro orçamento através das categorias.</p>
                <Button asChild>
                  <Link href="/quotes/categories">
                    <FileText className="h-5 w-5 mr-2" />
                    Criar Primeiro Orçamento
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((quote) => (
                  <div key={quote.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <Badge variant="outline" className="font-mono text-xs sm:text-sm">
                            #{quote.number}
                          </Badge>
                          <span className="text-xs sm:text-sm text-gray-600">
                            {formatDate(quote.createdAt)}
                          </span>
                        </div>
                        <h3 className="font-medium text-[#341601] mb-2 text-sm sm:text-base break-words">
                          {quote.product?.name || 'Produto não especificado'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          {quote.customer && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs">
                              Cliente: {quote.customer.name}
                            </span>
                          )}
                          <span>Qtd: {quote.quantity?.toLocaleString() || '-'}</span>
                          <span className="font-medium text-[#341601]">
                            Valor: {money(quote.finalPrice)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:ml-4">
                        <Link 
                          href={`/quotes/${quote.id}`}
                          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-[#341601] rounded-lg hover:bg-white transition-colors text-xs sm:text-sm font-medium w-full sm:w-auto"
                        >
                          Ver Detalhes
                        </Link>
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