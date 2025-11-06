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
  supplierUnitCost: z.union([
    z.string().regex(/^\d+(?:[\.,]\d{1,4})?$/),
    z.number()
  ]).nullable().optional(),
  active: z.boolean().optional(),
  isCurrent: z.boolean().optional(),
  lossFactor: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  supplierId: z.number().int().nullable().optional(),
});

export async function GET(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const m = await prisma.material.findUnique({
    where: { id },
    include: { variants: true, supplier: { select: { id: true, name: true } } },
  });
  if (!m) return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });
  // hotfix: fetch supplierUnitCost via raw to avoid client cache issues
  const rawCosts = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "supplierUnitCost"::text as "supplierUnitCost" FROM "Material" WHERE "id" = $1`,
    id
  );
  const supplierUnitCostText = rawCosts?.[0]?.supplierUnitCost ?? null;

  const payload: any = {
    ...m,
    unitCost: m.unitCost != null ? (m.unitCost as unknown as any).toString?.() ?? String(m.unitCost) : null,
    supplierUnitCost: supplierUnitCostText,
    variants: (m.variants || []).map(v => ({
      ...v,
      packPrice: v.packPrice != null ? (v.packPrice as unknown as any).toString?.() ?? String(v.packPrice) : null,
      unitPrice: v.unitPrice != null ? (v.unitPrice as unknown as any).toString?.() ?? String(v.unitPrice) : null,
    })),
  };
  return NextResponse.json(payload);
}

export async function PATCH(req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { supplierId, supplierUnitCost, ...rest } = parsed.data as any;
  const updateData: any = { ...rest };
  if (supplierId !== undefined) {
    if (supplierId) {
      updateData.supplier = { connect: { id: Number(supplierId) } };
    } else {
      updateData.supplier = { disconnect: true };
    }
  }
  let supplierUnitCostToSet: string | null | undefined = undefined;
  if (supplierUnitCost !== undefined) {
    supplierUnitCostToSet = supplierUnitCost != null && supplierUnitCost !== ""
      ? (typeof supplierUnitCost === 'number' ? supplierUnitCost.toFixed(4) : String(supplierUnitCost).replace(',', '.'))
      : null;
  }

  const m = await prisma.material.update({ where: { id }, data: updateData });
  if (supplierUnitCostToSet !== undefined) {
    // hotfix: update using raw SQL to bypass outdated Prisma Client
    await prisma.$executeRawUnsafe(
      `UPDATE "Material" SET "supplierUnitCost" = $1::numeric WHERE "id" = $2`,
      supplierUnitCostToSet,
      id
    );
  }
  return NextResponse.json(m);
}

export async function DELETE(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const m = await prisma.material.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true, id: m.id });
}
