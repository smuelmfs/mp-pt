"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calculator, 
  User, 
  Settings, 
  LogOut, 
  CheckCircle, 
  AlertCircle,
  Building2,
  FileText,
  Package,
  Printer,
  Scissors,
  TrendingUp,
  Layers,
  Cog
} from "lucide-react";

function LoginForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const redirect = sp.get("redirect") || "/";

  const [role, setRole] = useState<"ADMIN"|"COMMERCIAL"|"">("");
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadMe() {
    const res = await fetch("/api/me");
    const j = await res.json();
    setCurrentRole(j.role || null);
  }

  useEffect(() => { loadMe(); }, []);

  async function login() {
    if (!role) { 
      alert("Escolha um papel"); 
      return; 
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/dev/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        router.replace(redirect);
      } else {
        alert("Falha ao logar");
      }
    } catch (error) {
      alert("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/dev/logout", { method: "POST" });
      loadMe();
    } catch (error) {
      alert("Erro ao fazer logout");
    } finally {
      setLoading(false);
    }
  }

  const commercialFeatures = [
    { name: "Orçamentos", href: "/quotes", icon: FileText },
    { name: "Categorias", href: "/quotes/categories", icon: Layers },
  ];

  const adminFeatures = [
    { name: "Produtos", href: "/products", icon: Package },
    { name: "Materiais", href: "/materials", icon: Building2 },
    { name: "Impressões", href: "/printing", icon: Printer },
    { name: "Acabamentos", href: "/finishes", icon: Scissors },
    { name: "Margens", href: "/margins", icon: TrendingUp },
    { name: "Categorias", href: "/categories", icon: Layers },
    { name: "Configurações", href: "/config", icon: Cog },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side - Login Form */}
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900">
                  <Calculator className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">MP-PT</CardTitle>
              <CardDescription>
                Sistema de Orçamentos para Impressão Digital
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Status atual:</span>
                </div>
                <Badge variant={currentRole ? "default" : "secondary"}>
                  {currentRole ? currentRole : "Não autenticado"}
                </Badge>
              </div>

              {/* Role Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Escolha seu perfil:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    variant={role === "COMMERCIAL" ? "default" : "outline"}
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => setRole("COMMERCIAL")}
                  >
                    <User className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-semibold">Comercial</div>
                      <div className="text-xs text-muted-foreground">Criar orçamentos</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant={role === "ADMIN" ? "default" : "outline"}
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => setRole("ADMIN")}
                  >
                    <Settings className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-semibold">Administrador</div>
                      <div className="text-xs text-muted-foreground">Configurar sistema</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={login} 
                  disabled={!role || loading}
                  className="flex-1"
                >
                  {loading ? "Entrando..." : "Continuar"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={logout}
                  disabled={loading}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>

              {/* Development Notice */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Modo de desenvolvimento. Após integrar Firebase Auth, esta página será substituída pela autenticação real.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Right side - Features Preview */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Funcionalidades</h2>
              <p className="text-gray-600">Explore as diferentes áreas do sistema</p>
            </div>

            {/* Commercial Features */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <User className="h-5 w-5 mr-2 text-slate-600" />
                  Área Comercial
                </CardTitle>
                <CardDescription>
                  Criar e gerenciar orçamentos para clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {commercialFeatures.map((feature) => (
                    <a
                      key={feature.href}
                      href={feature.href}
                      className="flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <feature.icon className="h-4 w-4 mr-3 text-gray-500" />
                      <span className="text-sm font-medium">{feature.name}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Admin Features */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Settings className="h-5 w-5 mr-2 text-slate-600" />
                  Área Administrativa
                </CardTitle>
                <CardDescription>
                  Configurar produtos, materiais e regras do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {adminFeatures.map((feature) => (
                    <a
                      key={feature.href}
                      href={feature.href}
                      className="flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <feature.icon className="h-4 w-4 mr-3 text-gray-500" />
                      <span className="text-sm font-medium">{feature.name}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
