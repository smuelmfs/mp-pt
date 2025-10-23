import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getId(ctx: { params: any }) {
  const p = ctx?.params && typeof ctx.params.then === "function" ? await ctx.params : ctx.params;
  const nid = Number(p?.id);
  return Number.isFinite(nid) ? nid : NaN;
}

const UpdateSchema = z.object({
  label: z.string().min(2).optional(),
  gramagem: z.number().int().positive().optional(),
  widthMm: z.number().int().positive().optional(),
  heightMm: z.number().int().positive().optional(),
  sheetsPerPack: z.number().int().positive().optional(),
  packPrice: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
  isCurrent: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const v = await prisma.materialVariant.update({ where: { id }, data: parsed.data });
  return NextResponse.json(v);
}

export async function DELETE(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const v = await prisma.materialVariant.update({ where: { id }, data: { isCurrent: false } });
  return NextResponse.json({ ok: true, id: v.id });
}
