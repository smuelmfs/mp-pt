import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rowId = Number(id);
  if (!Number.isFinite(rowId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { printingId, sides, unitPrice, priority, validFrom, validTo, isCurrent } = body || {};
  const updated = await prisma.printingCustomerPrice.update({
    where: { id: rowId },
    data: {
      ...(printingId !== undefined ? { printingId: Number(printingId) } : {}),
      ...(sides !== undefined ? { sides: sides === null ? null : Number(sides) } : {}),
      ...(unitPrice !== undefined ? { unitPrice: Number(unitPrice) } : {}),
      ...(priority !== undefined ? { priority: Number(priority) } : {}),
      ...(validFrom !== undefined ? { validFrom } : {}),
      ...(validTo !== undefined ? { validTo } : {}),
      ...(isCurrent !== undefined ? { isCurrent: !!isCurrent } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rowId = Number(id);
  if (!Number.isFinite(rowId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  await prisma.printingCustomerPrice.delete({ where: { id: rowId } });
  return NextResponse.json({ ok: true });
}


