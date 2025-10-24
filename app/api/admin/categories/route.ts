import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2),
  roundingStep: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
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
  
  return NextResponse.json(rows.map(category => ({
    id: category.id,
    name: category.name,
    roundingStep: category.roundingStep,
    _count: {
      products: category._count.products
    }
  })));
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.productCategory.create({ data: parsed.data as any });
  return NextResponse.json(row, { status: 201 });
}
