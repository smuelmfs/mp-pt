import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const dimensionId = Number(id);
    
    if (!Number.isFinite(dimensionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Soft delete - marcar como inativo
    await prisma.productDimension.update({
      where: { id: dimensionId },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar dimensão:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
