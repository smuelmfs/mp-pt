import { NextRequest, NextResponse } from "next/server";

// Rotas SOMENTE ADMIN (UI de gestão)
const ADMIN_PATHS = [
  "/materials",
  "/printing",
  "/finishes",
  "/products",
  "/margins",
  "/customers",
  // se tiver outras de admin, adicione aqui
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get("role")?.value; // "ADMIN" | "COMMERCIAL"

  // protege as rotas de admin
  if (ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

  }

  // Rotas comerciais (quotes) ficam abertas para COMMERCIAL e ADMIN
  return NextResponse.next();
}

// aplica a todas as páginas (não /api)
export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|assets|static).*)",
  ],
};

