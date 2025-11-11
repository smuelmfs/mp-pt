import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(1),     // ex: "papel", "vinil"
  unit: z.enum(["UNIT","M2","LOT","HOUR","SHEET"]),
  unitCost: z.string().regex(/^\d+(\.\d{1,4})?$/), // "12.3456"
  supplierUnitCost: z.union([
    z.string().regex(/^\d+(?:[\.,]\d{1,4})?$/),
    z.number()
  ]).nullable().optional(),
  active: z.boolean().optional().default(true),
  lossFactor: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
  supplierId: z.number().int().nullable().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const withVariants = searchParams.get("withVariants") === "1";
  const supplierId = searchParams.get("supplierId");

  const where: any = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { type: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  if (supplierId) {
    const sid = Number(supplierId);
    if (Number.isFinite(sid)) {
      where.supplierId = sid;
    }
  }

  const data = await prisma.material.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      ...(withVariants ? { variants: true } : {}),
      supplier: { select: { id: true, name: true } },
    },
  });

  // hotfix: fetch supplierUnitCost via raw per material
  const payload = await Promise.all(data.map(async (m:any) => {
    const raw = await prisma.$queryRawUnsafe(
      `SELECT "supplierUnitCost"::text as "supplierUnitCost" FROM "Material" WHERE "id" = $1`,
      m.id
    ) as Array<{ supplierUnitCost: string | null }>;
    const supplierUnitCostText = raw?.[0]?.supplierUnitCost ?? null;
    return {
      ...m,
      unitCost: m.unitCost != null ? (m.unitCost as any).toString?.() ?? String(m.unitCost) : null,
      supplierUnitCost: supplierUnitCostText,
      variants: m.variants ? m.variants.map((v:any)=> ({
        ...v,
        packPrice: v.packPrice != null ? (v.packPrice as any).toString?.() ?? String(v.packPrice) : null,
        unitPrice: v.unitPrice != null ? (v.unitPrice as any).toString?.() ?? String(v.unitPrice) : null,
      })) : undefined,
    };
  }));

  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { supplierId, supplierUnitCost, ...rest } = parsed.data as any;
  const m = await prisma.material.create({
    data: {
      ...rest,
      ...(supplierUnitCost != null && supplierUnitCost !== "" ? { supplierUnitCost: typeof supplierUnitCost === 'number' ? supplierUnitCost.toFixed(4) : String(supplierUnitCost).replace(',', '.')} : {}),
      ...(supplierId ? { supplier: { connect: { id: Number(supplierId) } } } : {}),
    },
  });
  return NextResponse.json(m, { status: 201 });
}
