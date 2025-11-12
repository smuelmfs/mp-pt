import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth";

/**
 * API para verificar role do usuário (usado pelo frontend)
 */
export async function GET(req: NextRequest) {
  try {
    const idToken = req.cookies.get("firebase-token")?.value;
    
    if (!idToken) {
      return NextResponse.json({ role: null, authenticated: false });
    }

    const decodedToken = await verifyIdToken(idToken);
    
    return NextResponse.json({
      role: decodedToken.role || null,
      authenticated: true,
      email: decodedToken.email,
      uid: decodedToken.uid,
    });
  } catch (error) {
    return NextResponse.json({ role: null, authenticated: false });
  }
}

