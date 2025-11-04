import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rowId = Number(id);
  if (!Number.isFinite(rowId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { materialId, unitCost, priority, validFrom, validTo, isCurrent } = body || {};
  const updated = await prisma.materialCustomerPrice.update({
    where: { id: rowId },
    data: {
      ...(materialId !== undefined ? { materialId: Number(materialId) } : {}),
      ...(unitCost !== undefined ? { unitCost: Number(unitCost) } : {}),
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
  await prisma.materialCustomerPrice.delete({ where: { id: rowId } });
  return NextResponse.json({ ok: true });
}


