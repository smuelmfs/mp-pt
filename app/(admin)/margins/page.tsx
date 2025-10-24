"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
      alert("Margem é obrigatória");
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
        setFormFixed({ scope, categoryId: "", productId: "", margin: "0.30", startsAt: "", endsAt: "", active: true });
        setOpenCreate(false);
        loadRules();
      } else {
        const j = await res.json(); 
        alert("Erro: "+(j.error?.message || "Falha ao criar"));
      }
    } catch (error) {
      alert("Erro ao criar regra");
    } finally {
      setLoading(false);
    }
  }

  async function createDyn() {
    if (!formDyn.adjustPercent) {
      alert("Percentual de ajuste é obrigatório");
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
        alert("Erro: "+(j.error?.message || "Falha ao criar"));
      }
    } catch (error) {
      alert("Erro ao criar regra");
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
      alert("Erro ao alterar status");
    }
  }

  async function remove(kind: "FIXA"|"DINAMICA", id: number) {
    if (!confirm("Tem certeza que deseja excluir esta regra?")) return;
    
    try {
      const url = kind === "FIXA" ? `/api/admin/margin-rules/${id}` : `/api/admin/margin-rules-dyn/${id}`;
      await fetch(url, { method: "DELETE" });
      loadRules();
    } catch (error) {
      alert("Erro ao excluir regra");
    }
  }

  const scopeLabels = {
    GLOBAL: "Global",
    CATEGORY: "Categoria",
    PRODUCT: "Produto"
  };

  const scopeColors = {
    GLOBAL: "bg-blue-100 text-blue-800",
    CATEGORY: "bg-green-100 text-green-800", 
    PRODUCT: "bg-purple-100 text-purple-800"
  };

  if (loading && rows.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
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
    <main className="min-h-screen bg-gray-50">
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
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="scope">Escopo</Label>
                <Select value={scope} onValueChange={(value) => setScope(value as Scope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBAL">Global</SelectItem>
                    <SelectItem value="CATEGORY">Categoria</SelectItem>
                    <SelectItem value="PRODUCT">Produto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={loadRules}>
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
                            onClick={() => toggleActive(tab, rule.id, !rule.active)}
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
                    Nova Regra {tab === "FIXA" ? "Fixa" : "Dinâmica"}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure uma nova regra de margem
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => setOpenCreate(false)}
                >
                  ×
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {tab === "FIXA" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="scope">Escopo</Label>
                    <Select value={formFixed.scope} onValueChange={(value) => setFormFixed({...formFixed, scope: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GLOBAL">Global</SelectItem>
                        <SelectItem value="CATEGORY">Categoria</SelectItem>
                        <SelectItem value="PRODUCT">Produto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formFixed.scope === "CATEGORY" && (
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select value={formFixed.categoryId} onValueChange={(value) => setFormFixed({...formFixed, categoryId: value})}>
                        <SelectTrigger>
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
                    <div>
                      <Label htmlFor="product">Produto</Label>
                      <Select value={formFixed.productId} onValueChange={(value) => setFormFixed({...formFixed, productId: value})}>
                        <SelectTrigger>
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

                  <div>
                    <Label htmlFor="margin">Margem (%)</Label>
                    <Input
                      id="margin"
                      type="number"
                      step="0.01"
                      value={formFixed.margin}
                      onChange={(e) => setFormFixed({...formFixed, margin: e.target.value})}
                      placeholder="30.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="startsAt">Data de Início</Label>
                    <Input
                      id="startsAt"
                      type="datetime-local"
                      value={formFixed.startsAt}
                      onChange={(e) => setFormFixed({...formFixed, startsAt: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endsAt">Data de Fim</Label>
                    <Input
                      id="endsAt"
                      type="datetime-local"
                      value={formFixed.endsAt}
                      onChange={(e) => setFormFixed({...formFixed, endsAt: e.target.value})}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formFixed.active}
                      onCheckedChange={(checked) => setFormFixed({...formFixed, active: checked})}
                    />
                    <Label htmlFor="active">Regra ativa</Label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="scope">Escopo</Label>
                    <Select value={formDyn.scope} onValueChange={(value) => setFormDyn({...formDyn, scope: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GLOBAL">Global</SelectItem>
                        <SelectItem value="CATEGORY">Categoria</SelectItem>
                        <SelectItem value="PRODUCT">Produto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formDyn.scope === "CATEGORY" && (
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select value={formDyn.categoryId} onValueChange={(value) => setFormDyn({...formDyn, categoryId: value})}>
                        <SelectTrigger>
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
                    <div>
                      <Label htmlFor="product">Produto</Label>
                      <Select value={formDyn.productId} onValueChange={(value) => setFormDyn({...formDyn, productId: value})}>
                        <SelectTrigger>
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

                  <div>
                    <Label htmlFor="minSubtotal">Subtotal Mínimo (€)</Label>
                    <Input
                      id="minSubtotal"
                      type="number"
                      step="0.01"
                      value={formDyn.minSubtotal}
                      onChange={(e) => setFormDyn({...formDyn, minSubtotal: e.target.value})}
                      placeholder="100.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="minQuantity">Quantidade Mínima</Label>
                    <Input
                      id="minQuantity"
                      type="number"
                      value={formDyn.minQuantity}
                      onChange={(e) => setFormDyn({...formDyn, minQuantity: e.target.value})}
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="adjustPercent">Ajuste (%)</Label>
                    <Input
                      id="adjustPercent"
                      type="number"
                      step="0.0001"
                      value={formDyn.adjustPercent}
                      onChange={(e) => setFormDyn({...formDyn, adjustPercent: e.target.value})}
                      placeholder="-5.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxAdjust">Ajuste Máximo (€)</Label>
                    <Input
                      id="maxAdjust"
                      type="number"
                      step="0.01"
                      value={formDyn.maxAdjust}
                      onChange={(e) => setFormDyn({...formDyn, maxAdjust: e.target.value})}
                      placeholder="50.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Prioridade</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formDyn.priority}
                      onChange={(e) => setFormDyn({...formDyn, priority: e.target.value})}
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="startsAt">Data de Início</Label>
                    <Input
                      id="startsAt"
                      type="datetime-local"
                      value={formDyn.startsAt}
                      onChange={(e) => setFormDyn({...formDyn, startsAt: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endsAt">Data de Fim</Label>
                    <Input
                      id="endsAt"
                      type="datetime-local"
                      value={formDyn.endsAt}
                      onChange={(e) => setFormDyn({...formDyn, endsAt: e.target.value})}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="stackable"
                      checked={formDyn.stackable}
                      onCheckedChange={(checked) => setFormDyn({...formDyn, stackable: checked})}
                    />
                    <Label htmlFor="stackable">Acumulável</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formDyn.active}
                      onCheckedChange={(checked) => setFormDyn({...formDyn, active: checked})}
                    />
                    <Label htmlFor="active">Regra ativa</Label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setOpenCreate(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={tab === "FIXA" ? createFixed : createDyn}
                  disabled={loading}
                >
                  {loading ? 'Criando...' : 'Criar Regra'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
