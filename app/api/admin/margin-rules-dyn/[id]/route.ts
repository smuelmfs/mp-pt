import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getId(ctx: { params: any }) {
  const p = typeof ctx.params?.then === "function" ? await ctx.params : ctx.params;
  const nid = Number(p?.id);
  return Number.isFinite(nid) ? nid : NaN;
}

const UpdateSchema = z.object({
  scope: z.enum(["GLOBAL","CATEGORY","PRODUCT"]).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  productId: z.number().int().positive().nullable().optional(),
  minSubtotal: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  minQuantity: z.number().int().positive().nullable().optional(),
  adjustPercent: z.string().regex(/^\-?\d+(\.\d{1,4})?$/).optional(),
  maxAdjust: z.string().regex(/^\-?\d+(\.\d{1,4})?$/).nullable().optional(),
  priority: z.number().int().optional(),
  stackable: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(()=> ({}));
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.marginRuleDynamic.update({ where: { id }, data: parsed.data as any });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  await prisma.marginRuleDynamic.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

