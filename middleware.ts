import { NextRequest, NextResponse } from "next/server";

const ADMIN_PATHS = [
  "/materials",
  "/printing",
  "/finishes",
  "/products",
  "/margins",
  "/customers",
  "/suppliers",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  const hasFirebaseToken = req.cookies.get("firebase-token")?.value;
  const devRole = req.cookies.get("role")?.value;
  
  if (!hasFirebaseToken && !devRole) {
    if (ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  } else if (devRole) {
    if (ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      if (devRole !== "ADMIN") {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|assets|static).*)",
  ],
};


