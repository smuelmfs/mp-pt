import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  scope: z.enum(["GLOBAL","CATEGORY","PRODUCT"]),
  categoryId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
  margin: z.string().regex(/^\-?\d+(\.\d{1,4})?$/), // "0.3000"
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  active: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") as "GLOBAL"|"CATEGORY"|"PRODUCT" | null;
  const productId = searchParams.get("productId");
  const categoryId = searchParams.get("categoryId");

  const where: any = {};
  if (scope) where.scope = scope;
  if (productId) where.productId = Number(productId);
  if (categoryId) where.categoryId = Number(categoryId);

  const rows = await prisma.marginRule.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: { product: { select: { id: true, name: true } }, category: { select: { id: true, name: true } } },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  if (json.categoryId) json.categoryId = Number(json.categoryId);
  if (json.productId) json.productId = Number(json.productId);

  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.marginRule.create({ data: parsed.data as any });
  return NextResponse.json(row, { status: 201 });
}
