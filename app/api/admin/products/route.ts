import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2),
  categoryId: z.number().int().positive(),
  printingId: z.number().int().positive().nullable().optional(),
  marginDefault: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  markupDefault: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  roundingStep: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  roundingStrategy: z.enum(["END_ONLY","PER_STEP"]).nullable().optional(),
  pricingStrategy: z.enum(["COST_MARKUP_MARGIN","COST_MARGIN_ONLY","MARGIN_TARGET"]).nullable().optional(),
  minPricePerPiece: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  attributesSchema: z.record(z.string(), z.any()).optional(),
  active: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const categoryId = searchParams.get("categoryId");
  const productId = searchParams.get("productId");
  const printingId = searchParams.get("printingId");
  const active = searchParams.get("active");

  const where: any = {};
  const andConditions: any[] = [];
  
  // Filtros diretos (sempre aplicados)
  if (categoryId) {
    andConditions.push({ categoryId: parseInt(categoryId) });
  }
  if (productId) {
    andConditions.push({ id: parseInt(productId) });
  }
  if (printingId) {
    andConditions.push({ printingId: parseInt(printingId) });
  }
  if (active === "true") {
    andConditions.push({ active: true });
  }
  if (active === "false") {
    andConditions.push({ active: false });
  }
  
  // Busca (aplicada junto com outros filtros)
  if (q) {
    const maybeId = parseInt(q, 10);
    const or: any[] = [
      { name: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
    if (!Number.isNaN(maybeId)) {
      or.push({ id: maybeId });
    }
    andConditions.push({ OR: or });
  }
  
  // Combinar todas as condições com AND
  if (andConditions.length > 0) {
    if (andConditions.length === 1) {
      Object.assign(where, andConditions[0]);
    } else {
      where.AND = andConditions;
    }
  }

  const rows = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      category: { select: { id: true, name: true } },
      printing: { select: { id: true, technology: true, formatLabel: true, colors: true } },
    },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  if (json.categoryId) json.categoryId = Number(json.categoryId);
  if (json.printingId !== undefined && json.printingId !== null) json.printingId = Number(json.printingId);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.product.create({ data: parsed.data as any });
  return NextResponse.json(row, { status: 201 });
}
