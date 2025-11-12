import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const idToken = authHeader?.replace("Bearer ", "");

    if (!idToken) {
      return NextResponse.json({ role: null, authenticated: false });
    }

    const decodedToken = await verifyIdToken(idToken);
    
    return NextResponse.json({
      authenticated: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || null,
      name: decodedToken.name || decodedToken.email?.split("@")[0] || "Usuário",
    });
  } catch (error) {
    return NextResponse.json({ role: null, authenticated: false });
  }
}

