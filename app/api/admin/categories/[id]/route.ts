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
  roundingStep: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  roundingStrategy: z.enum(["END_ONLY","PER_STEP"]).nullable().optional(),
  pricingStrategy: z.enum(["COST_MARKUP_MARGIN","COST_MARGIN_ONLY","MARGIN_TARGET"]).nullable().optional(),
  minPricePerPiece: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  lossFactor: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
});

export async function GET(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true }
      }
    }
  });

  if (!category) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });

  return NextResponse.json({
    id: category.id,
    name: category.name,
    roundingStep: category.roundingStep,
    _count: {
      products: category._count.products
    }
  });
}

export async function PATCH(req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.productCategory.update({ where: { id }, data: parsed.data as any });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const cnt = await prisma.product.count({ where: { categoryId: id } });
  if (cnt > 0) return NextResponse.json({ error: "Categoria possui produtos" }, { status: 400 });

  await prisma.productCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
