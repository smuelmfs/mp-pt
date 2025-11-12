import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Corpo da requisição inválido" },
        { status: 400 }
      );
    }

    const { idToken } = body || {};
    
    if (!idToken) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 400 });
    }

    const decodedToken = await verifyIdToken(idToken);
    
    return NextResponse.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || null,
      name: decodedToken.name || decodedToken.email?.split("@")[0] || "Usuário",
    }, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Erro ao verificar token:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao verificar autenticação" },
      { 
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

