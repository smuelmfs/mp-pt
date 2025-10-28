import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getId(ctx: { params: any }) {
  const p = ctx?.params && typeof ctx.params.then === "function" ? await ctx.params : ctx.params;
  const nid = Number(p?.id);
  return Number.isFinite(nid) ? nid : NaN;
}

const UpdateSchema = z.object({
  technology: z.enum(["OFFSET","DIGITAL","UV","GRANDE_FORMATO"]).optional(),
  formatLabel: z.string().optional(),
  colors: z.string().optional(),
  sides: z.number().int().optional(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
  yield: z.number().int().optional(),
  setupMinutes: z.number().int().optional(),
  minFee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  active: z.boolean().optional(),
  setupMode: z.enum(["TIME_X_RATE","FLAT"]).optional(),
  setupFlatFee: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  lossFactor: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
});

export async function GET(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const r = await prisma.printing.findUnique({ where: { id } });
  if (!r) return NextResponse.json({ error: "Config de impressão não encontrada" }, { status: 404 });
  return NextResponse.json(r);
}

export async function PATCH(req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const r = await prisma.printing.update({ where: { id }, data: parsed.data });
  return NextResponse.json(r);
}

export async function DELETE(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const r = await prisma.printing.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true, id: r.id });
}
