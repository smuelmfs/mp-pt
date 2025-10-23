import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  productId: z.number().int().positive(),
  materialId: z.number().int().positive(),
  variantId: z.number().int().positive().nullable().optional(),
  qtyPerUnit: z.string().regex(/^\d+(\.\d{1,4})?$/),
  wasteFactor: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  ["productId","materialId","variantId"].forEach(k => {
    if (json[k] !== undefined && json[k] !== null) json[k] = Number(json[k]);
  });
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.productMaterial.upsert({
    where: { productId_materialId: { productId: parsed.data.productId, materialId: parsed.data.materialId } },
    update: { ...parsed.data },
    create: parsed.data as any,
  });
  return NextResponse.json(row, { status: 201 });
}
