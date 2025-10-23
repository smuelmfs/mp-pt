import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  productId: z.number().int().positive(),
  finishId: z.number().int().positive(),
  calcRuleOverride: z.enum(["UNIT","M2","LOT","HOUR","SHEET"]).nullable().optional(),
  calcTypeOverride: z.enum(["PER_UNIT","PER_M2","PER_LOT","PER_HOUR"]).nullable().optional(),
  qtyPerUnit: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  costOverride: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  ["productId","finishId"].forEach(k => { if (json[k] !== undefined) json[k] = Number(json[k]); });

  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.productFinish.upsert({
    where: { productId_finishId: { productId: parsed.data.productId, finishId: parsed.data.finishId } },
    update: { ...parsed.data },
    create: parsed.data as any,
  });
  return NextResponse.json(row, { status: 201 });
}
