import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getId(ctx: { params: any }) {
  const p = typeof ctx.params?.then === "function" ? await ctx.params : ctx.params;
  const nid = Number(p?.id);
  return Number.isFinite(nid) ? nid : NaN;
}

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  categoryId: z.number().int().positive().optional(),
  printingId: z.number().int().positive().nullable().optional(),
  marginDefault: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  markupDefault: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  roundingStep: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  attributesSchema: z.record(z.any()).nullable().optional(),
  active: z.boolean().optional(),
});

export async function GET(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const row = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      printing: true,
      materials: { include: { material: true, variant: true } },
      finishes: { include: { finish: true } },
    },
  });
  if (!row) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  if (json.categoryId) json.categoryId = Number(json.categoryId);
  if (json.printingId !== undefined) json.printingId = json.printingId === null ? null : Number(json.printingId);

  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.product.update({ where: { id }, data: parsed.data as any });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const row = await prisma.product.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true, id: row.id });
}
