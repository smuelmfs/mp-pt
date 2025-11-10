"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  Plus, 
  Trash2, 
  Power, 
  PowerOff, 
  Calendar,
  Target,
  Zap,
  Settings,
  AlertCircle
} from "lucide-react";

type Scope = "GLOBAL" | "CATEGORY" | "PRODUCT";

export default function MarginsPage() {
  const [tab, setTab] = useState<"FIXA"|"DINAMICA">("FIXA");
  const [scope, setScope] = useState<Scope>("GLOBAL");
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [prods, setProds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleToDelete, setRuleToDelete] = useState<{kind: "FIXA"|"DINAMICA", id: number, name: string} | null>(null);

  const [formFixed, setFormFixed] = useState<any>({
    scope: "GLOBAL", categoryId: "", productId: "", margin: "0.30", startsAt: "", endsAt: "", active: true
  });

  const [formDyn, setFormDyn] = useState<any>({
    scope: "GLOBAL", categoryId: "", productId: "", minSubtotal: "", minQuantity: "",
    adjustPercent: "-0.0500", maxAdjust: "", priority: 100, stackable: false,
    startsAt: "", endsAt: "", active: true
  });

  async function load() {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(`/api/admin/categories`),
        fetch(`/api/admin/products`),
      ]);
      setCats(await cRes.json());
      setProds(await pRes.json());
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const queryParams = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("scope", scope);
    return sp.toString();
  }, [scope]);

  async function loadRules() {
    setLoading(true);
    try {
      const url = tab === "FIXA"
        ? `/api/admin/margin-rules?${queryParams}`
        : `/api/admin/margin-rules-dyn?${queryParams}`;
      const res = await fetch(url);
      setRows(await res.json());
    } catch (error) {
      console.error("Erro ao carregar regras:", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadRules(); /* eslint-disable-next-line */ }, [tab, scope]);

  async function createFixed() {
    if (!formFixed.margin) {
      toast.error("Margem é obrigatória");
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        scope: formFixed.scope,
        categoryId: formFixed.categoryId ? Number(formFixed.categoryId) : undefined,
        productId: formFixed.productId ? Number(formFixed.productId) : undefined,
        margin: formFixed.margin,
        startsAt: formFixed.startsAt || null,
        endsAt: formFixed.endsAt || null,
        active: !!formFixed.active,
      };
      const res = await fetch(`/api/admin/margin-rules`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
      });
      if (res.ok) {
        toast.success("Regra criada com sucesso!");
        setFormFixed({ scope, categoryId: "", productId: "", margin: "0.30", startsAt: "", endsAt: "", active: true });
        setOpenCreate(false);
        loadRules();
      } else {
        const j = await res.json(); 
        toast.error("Erro: "+(j.error?.message || "Falha ao criar"));
      }
    } catch (error) {
      toast.error("Erro ao criar regra");
    } finally {
      setLoading(false);
    }
  }

  async function createDyn() {
    if (!formDyn.adjustPercent) {
      toast.error("Percentual de ajuste é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        scope: formDyn.scope,
        categoryId: formDyn.categoryId ? Number(formDyn.categoryId) : undefined,
        productId: formDyn.productId ? Number(formDyn.productId) : undefined,
        minSubtotal: formDyn.minSubtotal || null,
        minQuantity: formDyn.minQuantity ? Number(formDyn.minQuantity) : null,
        adjustPercent: formDyn.adjustPercent,
        maxAdjust: formDyn.maxAdjust || null,
        priority: Number(formDyn.priority) || 100,
        stackable: !!formDyn.stackable,
        startsAt: formDyn.startsAt || null,
        endsAt: formDyn.endsAt || null,
        active: !!formDyn.active,
      };
      const res = await fetch(`/api/admin/margin-rules-dyn`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
      });
      if (res.ok) {
        setFormDyn({ scope, categoryId: "", productId: "", minSubtotal: "", minQuantity: "", adjustPercent: "-0.0500", maxAdjust: "", priority: 100, stackable: false, startsAt: "", endsAt: "", active: true });
        setOpenCreate(false);
        loadRules();
      } else {
        const j = await res.json(); 
        toast.error("Erro: "+(j.error?.message || "Falha ao criar"));
      }
    } catch (error) {
      toast.error("Erro ao criar regra");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(kind: "FIXA"|"DINAMICA", id: number, active: boolean) {
    try {
      const url = kind === "FIXA" ? `/api/admin/margin-rules/${id}` : `/api/admin/margin-rules-dyn/${id}`;
      await fetch(url, { method: "PATCH", headers: { "content-type":"application/json" }, body: JSON.stringify({ active }) });
      loadRules();
    } catch (error) {
      toast.error("Erro ao alterar status");
    }
  }

  async function editRule(rule: any) {
    setEditingRule(rule);
    if (tab === "FIXA") {
      setFormFixed({
        scope: rule.scope,
        categoryId: rule.categoryId?.toString() || "",
        productId: rule.productId?.toString() || "",
        margin: rule.margin,
        startsAt: rule.startsAt ? new Date(rule.startsAt).toISOString().slice(0, 16) : "",
        endsAt: rule.endsAt ? new Date(rule.endsAt).toISOString().slice(0, 16) : "",
        active: rule.active
      });
    } else {
      setFormDyn({
        scope: rule.scope,
        categoryId: rule.categoryId?.toString() || "",
        productId: rule.productId?.toString() || "",
        minSubtotal: rule.minSubtotal || "",
        minQuantity: rule.minQuantity?.toString() || "",
        adjustPercent: rule.adjustPercent,
        maxAdjust: rule.maxAdjust || "",
        priority: rule.priority.toString(),
        stackable: rule.stackable,
        startsAt: rule.startsAt ? new Date(rule.startsAt).toISOString().slice(0, 16) : "",
        endsAt: rule.endsAt ? new Date(rule.endsAt).toISOString().slice(0, 16) : "",
        active: rule.active
      });
    }
    setOpenCreate(true);
  }

  async function updateFixed() {
    if (!formFixed.margin) {
      toast.error("Margem é obrigatória");
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        scope: formFixed.scope,
        categoryId: formFixed.categoryId ? Number(formFixed.categoryId) : undefined,
        productId: formFixed.productId ? Number(formFixed.productId) : undefined,
        margin: formFixed.margin,
        startsAt: formFixed.startsAt || null,
        endsAt: formFixed.endsAt || null,
        active: !!formFixed.active,
      };
      const res = await fetch(`/api/admin/margin-rules/${editingRule.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
      });
      if (res.ok) {
        setFormFixed({ scope, categoryId: "", productId: "", margin: "0.30", startsAt: "", endsAt: "", active: true });
        setEditingRule(null);
        setOpenCreate(false);
        loadRules();
      } else {
        const j = await res.json(); 
        toast.error("Erro: "+(j.error?.message || "Falha ao atualizar"));
      }
    } catch (error) {
      toast.error("Erro ao atualizar regra");
    } finally {
      setLoading(false);
    }
  }

  async function updateDyn() {
    if (!formDyn.adjustPercent) {
      toast.error("Percentual de ajuste é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        scope: formDyn.scope,
        categoryId: formDyn.categoryId ? Number(formDyn.categoryId) : undefined,
        productId: formDyn.productId ? Number(formDyn.productId) : undefined,
        minSubtotal: formDyn.minSubtotal || null,
        minQuantity: formDyn.minQuantity ? Number(formDyn.minQuantity) : null,
        adjustPercent: formDyn.adjustPercent,
        maxAdjust: formDyn.maxAdjust || null,
        priority: Number(formDyn.priority) || 100,
        stackable: !!formDyn.stackable,
        startsAt: formDyn.startsAt || null,
        endsAt: formDyn.endsAt || null,
        active: !!formDyn.active,
      };
      const res = await fetch(`/api/admin/margin-rules-dyn/${editingRule.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
      });
      if (res.ok) {
        setFormDyn({ scope, categoryId: "", productId: "", minSubtotal: "", minQuantity: "", adjustPercent: "-0.0500", maxAdjust: "", priority: 100, stackable: false, startsAt: "", endsAt: "", active: true });
        setEditingRule(null);
        setOpenCreate(false);
        loadRules();
      } else {
        const j = await res.json(); 
        toast.error("Erro: "+(j.error?.message || "Falha ao atualizar"));
      }
    } catch (error) {
      toast.error("Erro ao atualizar regra");
    } finally {
      setLoading(false);
    }
  }

  async function remove(kind: "FIXA"|"DINAMICA", id: number) {
    setRuleToDelete({ kind, id, name: `${kind === "FIXA" ? "Regra Fixa" : "Regra Dinâmica"} #${id}` });
  }

  async function confirmDelete() {
    if (!ruleToDelete) return;
    
    try {
      const url = ruleToDelete.kind === "FIXA" 
        ? `/api/admin/margin-rules/${ruleToDelete.id}` 
        : `/api/admin/margin-rules-dyn/${ruleToDelete.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        toast.success("Regra excluída com sucesso!");
        setRuleToDelete(null);
        loadRules();
      } else {
        toast.error("Erro ao excluir regra");
      }
    } catch (error) {
      toast.error("Erro ao excluir regra");
    }
  }

  const scopeLabels = {
    GLOBAL: "Global",
    CATEGORY: "Categoria",
    PRODUCT: "Produto"
  };

  const scopeColors = {
    GLOBAL: "bg-gray-100 text-gray-800",
    CATEGORY: "bg-gray-100 text-gray-800", 
    PRODUCT: "bg-gray-100 text-gray-800"
  };

  if (loading && rows.length === 0) {
    return (
      <main className="min-h-screen bg-[#F6EEE8] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Regras de Margem</h1>
              <p className="text-gray-600 mt-2">Configure regras fixas e dinâmicas para cálculo de margens</p>
            </div>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros de Visualização</CardTitle>
            <CardDescription>
              Escolha qual tipo de regra você quer visualizar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="scope" className="text-sm font-medium text-gray-700">
                  Escopo das Regras
                </Label>
                <Select value={scope} onValueChange={(value) => setScope(value as Scope)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBAL">Global - Todas as regras</SelectItem>
                    <SelectItem value="CATEGORY">Categoria - Regras por categoria</SelectItem>
                    <SelectItem value="PRODUCT">Produto - Regras por produto</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {scope === "GLOBAL" && "Mostra todas as regras globais"}
                  {scope === "CATEGORY" && "Mostra regras aplicadas a categorias específicas"}
                  {scope === "PRODUCT" && "Mostra regras aplicadas a produtos específicos"}
                </p>
              </div>
              <Button variant="outline" onClick={loadRules} className="h-11 px-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rules Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Regras de Margem</CardTitle>
                <CardDescription>
                  {rows.length} regra{rows.length !== 1 ? 's' : ''} encontrada{rows.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Tabs value={tab} onValueChange={(value) => setTab(value as "FIXA"|"DINAMICA")}>
                <TabsList>
                  <TabsTrigger value="FIXA">Fixas</TabsTrigger>
                  <TabsTrigger value="DINAMICA">Dinâmicas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {rows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Escopo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Produto</TableHead>
                    {tab === "FIXA" ? (
                      <TableHead>Margem</TableHead>
                    ) : (
                      <>
                        <TableHead>Min Subtotal</TableHead>
                        <TableHead>Min Qtd</TableHead>
                        <TableHead>Ajuste %</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Acumulável</TableHead>
                      </>
                    )}
                    <TableHead>Status</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={scopeColors[rule.scope as keyof typeof scopeColors]}>
                          {scopeLabels[rule.scope as keyof typeof scopeLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>{rule.category?.name ?? "-"}</TableCell>
                      <TableCell>{rule.product?.name ?? "-"}</TableCell>
                      {tab === "FIXA" ? (
                        <TableCell className="font-mono">
                          {(Number(rule.margin) * 100).toFixed(2)}%
                        </TableCell>
                      ) : (
                        <>
                          <TableCell>{rule.minSubtotal ? `€${rule.minSubtotal}` : "-"}</TableCell>
                          <TableCell>{rule.minQuantity ?? "-"}</TableCell>
                          <TableCell className="font-mono">
                            {(Number(rule.adjustPercent) * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell>{rule.priority}</TableCell>
                          <TableCell>
                            <Badge variant={rule.stackable ? "default" : "secondary"}>
                              {rule.stackable ? "Sim" : "Não"}
                            </Badge>
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <Badge variant={rule.active ? "default" : "secondary"}>
                          {rule.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {rule.startsAt ? new Date(rule.startsAt).toLocaleDateString() : "—"}
                          </span>
                          <span>→</span>
                          <span>
                            {rule.endsAt ? new Date(rule.endsAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editRule(rule)}
                            title="Editar regra"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActive(tab, rule.id, !rule.active)}
                            title={rule.active ? "Desativar" : "Ativar"}
                          >
                            {rule.active ? (
                              <PowerOff className="h-3 w-3" />
                            ) : (
                              <Power className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => remove(tab, rule.id)}
                            title="Excluir regra"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma regra encontrada</h3>
                <p className="text-gray-600 mb-6">
                  Comece criando sua primeira regra de margem
                </p>
                <Button onClick={() => setOpenCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Regra
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Modal */}
      {openCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingRule 
                      ? (tab === "FIXA" ? "Editar Regra Fixa" : "Editar Regra Dinâmica")
                      : (tab === "FIXA" ? "Nova Regra Fixa" : "Nova Regra Dinâmica")
                    }
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {tab === "FIXA" 
                      ? "Configure uma margem fixa que será aplicada sempre que as condições forem atendidas"
                      : "Configure uma margem que varia baseada em condições como quantidade ou valor total"
                    }
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setOpenCreate(false);
                    setEditingRule(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
              {tab === "FIXA" ? (
              <>
              {/* Informações Gerais */}
              <div className="space-y-4">
                <div className="border-l-4 border-gray-300 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900">Informações Gerais</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure o escopo e período de vigência da regra
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="scope" className="text-sm font-medium text-gray-700">
                      Escopo da Regra
                    </Label>
                    <Select value={formFixed.scope} onValueChange={(value) => setFormFixed({...formFixed, scope: value})}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GLOBAL">Global - Aplica a todos os produtos</SelectItem>
                        <SelectItem value="CATEGORY">Categoria - Aplica a uma categoria específica</SelectItem>
                        <SelectItem value="PRODUCT">Produto - Aplica a um produto específico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formFixed.scope === "CATEGORY" && (
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                        Categoria
                      </Label>
                      <Select value={formFixed.categoryId} onValueChange={(value) => setFormFixed({...formFixed, categoryId: value})}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {cats.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formFixed.scope === "PRODUCT" && (
                    <div className="space-y-2">
                      <Label htmlFor="product" className="text-sm font-medium text-gray-700">
                        Produto
                      </Label>
                      <Select value={formFixed.productId} onValueChange={(value) => setFormFixed({...formFixed, productId: value})}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {prods.map((prod: any) => (
                            <SelectItem key={prod.id} value={prod.id.toString()}>
                              {prod.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="startsAt" className="text-sm font-medium text-gray-700">
                      Data de Início (opcional)
                    </Label>
                    <Input
                      id="startsAt"
                      type="datetime-local"
                      className="h-11"
                      value={formFixed.startsAt}
                      onChange={(e) => setFormFixed({...formFixed, startsAt: e.target.value})}
                    />
                    <p className="text-xs text-gray-500">Deixe vazio para aplicar imediatamente</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endsAt" className="text-sm font-medium text-gray-700">
                      Data de Fim (opcional)
                    </Label>
                    <Input
                      id="endsAt"
                      type="datetime-local"
                      className="h-11"
                      value={formFixed.endsAt}
                      onChange={(e) => setFormFixed({...formFixed, endsAt: e.target.value})}
                    />
                    <p className="text-xs text-gray-500">Deixe vazio para aplicar indefinidamente</p>
                  </div>
                </div>
              </div>

              {/* Configuração da Margem */}
              <div className="space-y-4">
                <div className="border-l-4 border-gray-300 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900">Configuração da Margem</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Defina o percentual de margem que será aplicado
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="margin" className="text-sm font-medium text-gray-700">
                      Margem (%)
                    </Label>
                    <Input
                      id="margin"
                      type="number"
                      step="0.01"
                      className="h-11"
                      value={formFixed.margin}
                      onChange={(e) => setFormFixed({...formFixed, margin: e.target.value})}
                      placeholder="30.00"
                    />
                    <p className="text-xs text-gray-500">Exemplo: 30.00 = 30% de margem</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <Switch
                        id="active"
                        checked={formFixed.active}
                        onCheckedChange={(checked) => setFormFixed({...formFixed, active: checked})}
                      />
                      <div>
                        <Label htmlFor="active" className="text-sm font-medium text-gray-700">
                          Regra ativa
                        </Label>
                        <p className="text-xs text-gray-500">A regra só será aplicada se estiver ativa</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </>
              ) : (
                <>
                  {/* Informações Gerais */}
                  <div className="space-y-4">
                    <div className="border-l-4 border-gray-300 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900">Informações Gerais</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Configure o escopo e período de vigência da regra
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="scope" className="text-sm font-medium text-gray-700">
                          Escopo da Regra
                        </Label>
                        <Select value={formDyn.scope} onValueChange={(value) => setFormDyn({...formDyn, scope: value})}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GLOBAL">Global - Aplica a todos os produtos</SelectItem>
                            <SelectItem value="CATEGORY">Categoria - Aplica a uma categoria específica</SelectItem>
                            <SelectItem value="PRODUCT">Produto - Aplica a um produto específico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formDyn.scope === "CATEGORY" && (
                        <div className="space-y-2">
                          <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                            Categoria
                          </Label>
                          <Select value={formDyn.categoryId} onValueChange={(value) => setFormDyn({...formDyn, categoryId: value})}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {cats.map((cat: any) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {formDyn.scope === "PRODUCT" && (
                        <div className="space-y-2">
                          <Label htmlFor="product" className="text-sm font-medium text-gray-700">
                            Produto
                          </Label>
                          <Select value={formDyn.productId} onValueChange={(value) => setFormDyn({...formDyn, productId: value})}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione um produto" />
                            </SelectTrigger>
                            <SelectContent>
                              {prods.map((prod: any) => (
                                <SelectItem key={prod.id} value={prod.id.toString()}>
                                  {prod.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="startsAt" className="text-sm font-medium text-gray-700">
                          Data de Início (opcional)
                        </Label>
                        <Input
                          id="startsAt"
                          type="datetime-local"
                          className="h-11"
                          value={formDyn.startsAt}
                          onChange={(e) => setFormDyn({...formDyn, startsAt: e.target.value})}
                        />
                        <p className="text-xs text-gray-500">Deixe vazio para aplicar imediatamente</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="endsAt" className="text-sm font-medium text-gray-700">
                          Data de Fim (opcional)
                        </Label>
                        <Input
                          id="endsAt"
                          type="datetime-local"
                          className="h-11"
                          value={formDyn.endsAt}
                          onChange={(e) => setFormDyn({...formDyn, endsAt: e.target.value})}
                        />
                        <p className="text-xs text-gray-500">Deixe vazio para aplicar indefinidamente</p>
                      </div>
                    </div>
                  </div>

                  {/* Condições de Aplicação */}
                  <div className="space-y-4">
                    <div className="border-l-4 border-gray-300 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900">Condições de Aplicação</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Defina quando esta regra será aplicada baseada em valores ou quantidades
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="minSubtotal" className="text-sm font-medium text-gray-700">
                          Subtotal Mínimo (€)
                        </Label>
                        <Input
                          id="minSubtotal"
                          type="number"
                          step="0.01"
                          className="h-11"
                          value={formDyn.minSubtotal}
                          onChange={(e) => setFormDyn({...formDyn, minSubtotal: e.target.value})}
                          placeholder="100.00"
                        />
                        <p className="text-xs text-gray-500">Aplica apenas se o subtotal for maior que este valor</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="minQuantity" className="text-sm font-medium text-gray-700">
                          Quantidade Mínima
                        </Label>
                        <Input
                          id="minQuantity"
                          type="number"
                          className="h-11"
                          value={formDyn.minQuantity}
                          onChange={(e) => setFormDyn({...formDyn, minQuantity: e.target.value})}
                          placeholder="100"
                        />
                        <p className="text-xs text-gray-500">Aplica apenas se a quantidade for maior que este valor</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority" className="text-sm font-medium text-gray-700">
                          Prioridade
                        </Label>
                        <Input
                          id="priority"
                          type="number"
                          className="h-11"
                          value={formDyn.priority}
                          onChange={(e) => setFormDyn({...formDyn, priority: e.target.value})}
                          placeholder="100"
                        />
                        <p className="text-xs text-gray-500">Menor número = maior prioridade</p>
                      </div>
                    </div>
                  </div>

                  {/* Ajuste de Margem */}
                  <div className="space-y-4">
                    <div className="border-l-4 border-gray-300 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900">Ajuste de Margem</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Configure como a margem será ajustada quando as condições forem atendidas
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="adjustPercent" className="text-sm font-medium text-gray-700">
                          Ajuste de Margem (%)
                        </Label>
                        <Input
                          id="adjustPercent"
                          type="number"
                          step="0.0001"
                          className="h-11"
                          value={formDyn.adjustPercent}
                          onChange={(e) => setFormDyn({...formDyn, adjustPercent: e.target.value})}
                          placeholder="-5.00"
                        />
                        <p className="text-xs text-gray-500">Valor negativo reduz a margem, positivo aumenta</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxAdjust" className="text-sm font-medium text-gray-700">
                          Ajuste Máximo (€)
                        </Label>
                        <Input
                          id="maxAdjust"
                          type="number"
                          step="0.01"
                          className="h-11"
                          value={formDyn.maxAdjust}
                          onChange={(e) => setFormDyn({...formDyn, maxAdjust: e.target.value})}
                          placeholder="50.00"
                        />
                        <p className="text-xs text-gray-500">Limite máximo do ajuste em euros</p>
                      </div>
                    </div>
                  </div>

                  {/* Configurações Avançadas */}
                  <div className="space-y-4">
                    <div className="border-l-4 border-gray-300 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900">Configurações Avançadas</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Opções adicionais para controle da regra
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <Switch
                            id="stackable"
                            checked={formDyn.stackable}
                            onCheckedChange={(checked) => setFormDyn({...formDyn, stackable: checked})}
                          />
                          <div>
                            <Label htmlFor="stackable" className="text-sm font-medium text-gray-700">
                              Regra acumulável
                            </Label>
                            <p className="text-xs text-gray-500">Esta regra pode ser aplicada junto com outras</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <Switch
                            id="active"
                            checked={formDyn.active}
                            onCheckedChange={(checked) => setFormDyn({...formDyn, active: checked})}
                          />
                          <div>
                            <Label htmlFor="active" className="text-sm font-medium text-gray-700">
                              Regra ativa
                            </Label>
                            <p className="text-xs text-gray-500">A regra só será aplicada se estiver ativa</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setOpenCreate(false);
                    setEditingRule(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={editingRule 
                    ? (tab === "FIXA" ? updateFixed : updateDyn)
                    : (tab === "FIXA" ? createFixed : createDyn)
                  }
                  disabled={loading}
                >
                  {loading 
                    ? (editingRule ? 'Salvando...' : 'Criando...') 
                    : (editingRule ? 'Salvar Alterações' : 'Criar Regra')
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {ruleToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl mb-2">Confirmar Exclusão</CardTitle>
              <CardDescription className="text-base">
                Esta ação não pode ser desfeita
              </CardDescription>
            </CardHeader>
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex justify-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setRuleToDelete(null)}
                  className="px-6"
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive"
                  onClick={confirmDelete}
                  className="px-6"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
