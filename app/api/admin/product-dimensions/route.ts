import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, name, widthMm, heightMm, description, order } = body;

    if (!productId || !name || !widthMm || !heightMm) {
      return NextResponse.json(
        { error: "Campos obrigatórios: productId, name, widthMm, heightMm" },
        { status: 400 }
      );
    }

    const dimension = await prisma.productDimension.create({
      data: {
        productId: Number(productId),
        name,
        widthMm: Number(widthMm),
        heightMm: Number(heightMm),
        description: description || null,
        order: Number(order) || 0,
      },
    });

    return NextResponse.json(dimension);
  } catch (error) {
    console.error("Erro ao criar dimensão:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
