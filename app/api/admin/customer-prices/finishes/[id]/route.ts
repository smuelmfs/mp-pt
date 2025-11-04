import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rowId = Number(id);
  if (!Number.isFinite(rowId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { finishId, baseCost, minFee, areaStepM2, priority, validFrom, validTo, isCurrent } = body || {};
  const updated = await prisma.finishCustomerPrice.update({
    where: { id: rowId },
    data: {
      ...(finishId !== undefined ? { finishId: Number(finishId) } : {}),
      ...(baseCost !== undefined ? { baseCost: Number(baseCost) } : {}),
      ...(minFee !== undefined ? { minFee: minFee === null ? null : Number(minFee) } : {}),
      ...(areaStepM2 !== undefined ? { areaStepM2: areaStepM2 === null ? null : Number(areaStepM2) } : {}),
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
  await prisma.finishCustomerPrice.delete({ where: { id: rowId } });
  return NextResponse.json({ ok: true });
}


