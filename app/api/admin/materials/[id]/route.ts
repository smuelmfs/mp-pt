import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// resolve ctx.params sendo Promise OU objeto
async function getId(ctx: { params: any }) {
  const p = ctx?.params && typeof ctx.params.then === "function" ? await ctx.params : ctx.params;
  const nid = Number(p?.id);
  return Number.isFinite(nid) ? nid : NaN;
}

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.string().min(1).optional(),
  unit: z.enum(["UNIT","M2","LOT","HOUR","SHEET"]).optional(),
  unitCost: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
  active: z.boolean().optional(),
  isCurrent: z.boolean().optional(),
  lossFactor: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
});

export async function GET(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const m = await prisma.material.findUnique({ where: { id }, include: { variants: true } });
  if (!m) return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });
  return NextResponse.json(m);
}

export async function PATCH(req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const m = await prisma.material.update({ where: { id }, data: parsed.data });
  return NextResponse.json(m);
}

export async function DELETE(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const m = await prisma.material.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true, id: m.id });
}
