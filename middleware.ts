import { NextRequest, NextResponse } from "next/server";

// Rotas SOMENTE ADMIN (UI de gestão)
const ADMIN_PATHS = [
  "/materials",
  "/printing",
  "/finishes",
  "/products",
  "/margins",
  "/customers",
  "/suppliers",
  // se tiver outras de admin, adicione aqui
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Verificar se há token Firebase ou cookie de desenvolvimento
  const hasFirebaseToken = req.cookies.get("firebase-token")?.value;
  const devRole = req.cookies.get("role")?.value;
  
  // Se não há nenhum token, verificar se precisa autenticação
  if (!hasFirebaseToken && !devRole) {
    // Protege as rotas de admin - redireciona para login se não autenticado
    if (ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  } else if (devRole) {
    // Modo desenvolvimento: verificar role diretamente
    if (ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      if (devRole !== "ADMIN") {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }
    }
  }
  // Se tem token Firebase, a verificação de role será feita no frontend/API
  // O middleware apenas verifica a presença do token

  return NextResponse.next();
}

// aplica a todas as páginas (não /api)
export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|assets|static).*)",
  ],
};


