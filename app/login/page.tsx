"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Mail,
  Lock
} from "lucide-react";
import { signInWithEmailAndPassword, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";

const ADMIN_PATHS = [
  "/materials",
  "/printing",
  "/finishes",
  "/products",
  "/margins",
  "/customers",
  "/suppliers",
  "/categories",
  "/config",
];

const normalizePath = (path: string) => {
  if (!path) {
    return "/";
  }
  const trimmed = path.trim();
  if (!trimmed) {
    return "/";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      return url.pathname || "/";
    } catch {
      return "/";
    }
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const isAdminPath = (path: string) => {
  const normalized = normalizePath(path).split("?")[0];
  return ADMIN_PATHS.some((adminPath) => 
    normalized === adminPath || normalized.startsWith(`${adminPath}/`)
  );
};

function LoginForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const redirect = sp.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const idToken = await user.getIdToken();
          const res = await fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          if (res.ok) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const data = await res.json();
              setUserRole(data.role);
              document.cookie = `firebase-token=${idToken}; path=/; max-age=3600; SameSite=Lax; Secure`;
            }
          }
        } catch (error) {
          console.error("Erro ao verificar token:", error);
        }
      } else {
        setUserRole(null);
        document.cookie = "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    });

    return () => unsubscribe();
  }, [router, redirect]);

  async function login() {
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          document.cookie = `firebase-token=${idToken}; path=/; max-age=3600; SameSite=Lax; Secure`;
          setUserRole(data.role);
          toast.success("Login realizado com sucesso!");
          
          const normalizedRedirect = redirect ? normalizePath(redirect) : null;
          const redirectIsAdminPath = normalizedRedirect ? isAdminPath(normalizedRedirect) : false;

          if (data.role === "ADMIN") {
            if (normalizedRedirect && redirectIsAdminPath) {
              router.replace(normalizedRedirect);
            } else {
              router.replace("/products");
            }
          } else {
            if (normalizedRedirect && !redirectIsAdminPath) {
              router.replace(normalizedRedirect);
            } else {
              router.replace("/quotes");
            }
          }
        } else {
          toast.error("Resposta inválida do servidor");
        }
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await res.json().catch(() => ({}));
          let errorMessage = "Erro ao verificar autenticação";
          
          if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (errorData.error.message) {
              errorMessage = errorData.error.message;
            } else if (errorData.error.formErrors && errorData.error.formErrors.length > 0) {
              errorMessage = errorData.error.formErrors[0];
            } else if (errorData.error.fieldErrors) {
              const firstField = Object.keys(errorData.error.fieldErrors)[0];
              const firstError = errorData.error.fieldErrors[firstField];
              if (Array.isArray(firstError) && firstError.length > 0) {
                errorMessage = `${firstField}: ${firstError[0]}`;
              }
            }
          }
          
          toast.error(errorMessage);
        } else {
          toast.error("Erro ao verificar autenticação");
        }
      }
    } catch (error: any) {
      let errorMessage = "Erro ao fazer login";
      
      if (error.code) {
        switch (error.code) {
          case "auth/invalid-credential":
          case "auth/wrong-password":
          case "auth/user-not-found":
            errorMessage = "Email ou senha incorretos";
            break;
          case "auth/invalid-email":
            errorMessage = "Email inválido";
            break;
          case "auth/user-disabled":
            errorMessage = "Esta conta foi desativada";
            break;
          case "auth/too-many-requests":
            errorMessage = "Muitas tentativas. Tente novamente mais tarde";
            break;
          case "auth/network-request-failed":
            errorMessage = "Erro de conexão. Verifique sua internet";
            break;
          default:
            errorMessage = error.message || "Erro ao fazer login";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log("Erro de autenticação:", error.code || error.message);
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#F66807] via-[#FF8C42] to-[#FFB366] flex items-center justify-center p-4 overflow-hidden" style={{ height: '100vh', width: '100vw' }}>
      <div className="w-full max-w-md">
        <Card className="w-full shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="flex justify-center">
              <img 
                src="/logo.svg" 
                alt="MyPrint.pt" 
                className="h-20 w-auto"
                style={{ maxWidth: '215px' }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#341601] font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white border-gray-300 text-gray-900 focus:border-[#F66807] focus:ring-[#F66807] h-11 placeholder:text-gray-500 placeholder:opacity-100"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#341601] font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white border-gray-300 text-gray-900 focus:border-[#F66807] focus:ring-[#F66807] h-11 placeholder:text-gray-500 placeholder:opacity-100"
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") login();
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button 
                onClick={login} 
                disabled={loading || !email || !password}
                className="w-full h-11"
                size="lg"
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-gradient-to-br from-[#F66807] via-[#FF8C42] to-[#FFB366] flex items-center justify-center overflow-hidden">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded w-48 mb-4"></div>
          <div className="h-4 bg-white/20 rounded w-32"></div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
