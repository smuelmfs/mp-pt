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
  attributesSchema: z.record(z.any()).optional(),
  active: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const where = q ? {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ],
  } : {};

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
