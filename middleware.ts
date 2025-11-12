import { NextRequest, NextResponse } from "next/server";

// Rotas públicas que não precisam de autenticação
const PUBLIC_PATHS = ["/login"];

// Rotas que só ADMIN pode acessar
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

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Permite acesso a rotas públicas
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  
  // Permite acesso a rotas de API (elas têm sua própria validação)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  
  const hasFirebaseToken = req.cookies.get("firebase-token")?.value;
  const devRole = req.cookies.get("role")?.value;
  
  // Se não tem autenticação, redireciona para login
  if (!hasFirebaseToken && !devRole) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  
  // Verifica se é ADMIN para rotas administrativas
  const isAdminPath = ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isAdminPath) {
    // Se tem devRole, verifica se é ADMIN
    if (devRole && devRole !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    
    // Se tem firebase-token mas não tem devRole, precisa verificar no backend
    // Por enquanto, permite e deixa o backend validar
    // TODO: Poderia fazer verificação aqui também, mas requer chamada async
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|assets|static).*)",
  ],
};


