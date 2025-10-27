import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = Number(id);
    
    console.log('Fetching dimensions for product:', productId);
    
    if (!Number.isFinite(productId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const dimensions = await prisma.productDimension.findMany({
      where: {
        productId: productId,
        active: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    console.log('Found dimensions:', dimensions);

    return NextResponse.json(dimensions);
  } catch (error) {
    console.error("Erro ao buscar dimensões:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
