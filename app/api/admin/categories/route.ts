import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2),
  roundingStep: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  roundingStrategy: z.enum(["END_ONLY","PER_STEP"]).nullable().optional(),
  pricingStrategy: z.enum(["COST_MARKUP_MARGIN","COST_MARGIN_ONLY","MARGIN_TARGET"]).nullable().optional(),
  minPricePerPiece: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  lossFactor: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
});

export async function GET() {
  const rows = await prisma.productCategory.findMany({ 
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: true }
      }
    }
  });
  
  // Garantir que a contagem está correta
  const categoriesWithCount = await Promise.all(
    rows.map(async (category) => {
      const productCount = await prisma.product.count({
        where: { categoryId: category.id }
      });
      return {
        id: category.id,
        name: category.name,
        roundingStep: category.roundingStep,
        roundingStrategy: category.roundingStrategy,
        pricingStrategy: category.pricingStrategy,
        minPricePerPiece: category.minPricePerPiece,
        lossFactor: category.lossFactor,
        _count: {
          products: productCount
        }
      };
    })
  );
  
  return NextResponse.json(categoriesWithCount);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.productCategory.create({ data: parsed.data as any });
  return NextResponse.json(row, { status: 201 });
}
