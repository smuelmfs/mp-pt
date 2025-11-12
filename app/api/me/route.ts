import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Tentar obter token do header Authorization
    const authHeader = req.headers.get("authorization");
    const idToken = authHeader?.replace("Bearer ", "");

    if (idToken) {
      const decodedToken = await verifyIdToken(idToken);
      // Buscar dados atualizados do Firebase Admin para garantir nome correto
      const { adminAuth } = await import("@/lib/firebase-admin");
      let displayName = decodedToken.name;
      try {
        const firebaseUser = await adminAuth.getUser(decodedToken.uid);
        displayName = firebaseUser.displayName || decodedToken.name || decodedToken.email?.split("@")[0] || "Usuário";
      } catch (error) {
        // Se falhar, usar dados do token
        console.error("Erro ao buscar dados do Firebase Admin:", error);
      }

      return NextResponse.json({
        role: decodedToken.role || null,
        email: decodedToken.email,
        uid: decodedToken.uid,
        name: displayName,
      });
    }

    // Fallback: verificar cookie (modo desenvolvimento)
    const cookie = (req.headers.get("cookie") || "").split(";").map(s => s.trim());
    const role = cookie.find(c => c.startsWith("role="))?.split("=")[1] || null;
    return NextResponse.json({ role, authenticated: false });
  } catch (error) {
    // Se falhar, retornar sem autenticação
    return NextResponse.json({ role: null, authenticated: false });
  }
}
