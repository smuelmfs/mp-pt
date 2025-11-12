import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const idToken = authHeader?.replace("Bearer ", "");

    if (!idToken) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(idToken);
    const user = await adminAuth.getUser(decodedToken.uid);

    return NextResponse.json({
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email?.split("@")[0] || "Usuário",
      role: decodedToken.role || null,
    });
  } catch (error: any) {
    console.error("Erro ao buscar perfil:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar perfil" },
      { status: 401 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const idToken = authHeader?.replace("Bearer ", "");

    if (!idToken) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(idToken);
    const body = await req.json();
    const { name } = body;

    if (name) {
      await adminAuth.updateUser(decodedToken.uid, {
        displayName: name,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Perfil atualizado com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao atualizar perfil:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar perfil" },
      { status: 500 }
    );
  }
}

