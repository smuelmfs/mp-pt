import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getId(ctx: { params: any }) {
  const p = ctx?.params && typeof ctx.params.then === "function" ? await ctx.params : ctx.params;
  const nid = Number(p?.id);
  return Number.isFinite(nid) ? nid : NaN;
}

export async function GET(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { 
      product: true, 
      user: true, 
      customer: true,
      items: true 
    },
  });
  if (!quote) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  return NextResponse.json(quote);
}

export async function PATCH(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  try {
    const body = await _req.json().catch(() => ({}));
    const { notes } = body as { notes?: string | null };

    // Atualiza apenas o campo de notas
    const quote = await prisma.quote.update({
      where: { id },
      data: { notes: notes || null },
    });

    return NextResponse.json({ ok: true, notes: quote.notes });
  } catch (error) {
    console.error("Erro ao atualizar notas:", error);
    return NextResponse.json({ error: "Erro ao atualizar notas", detail: String((error as any)?.message || error) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  try {
    await prisma.$transaction([
      prisma.quoteItem.deleteMany({ where: { quoteId: id } }),
      prisma.calcLog.deleteMany({ where: { quoteId: id } }),
      prisma.quote.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir orçamento:", error);
    return NextResponse.json({ error: "Erro ao excluir orçamento", detail: String((error as any)?.message || error) }, { status: 500 });
  }
}