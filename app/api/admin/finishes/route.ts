import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["LAMINACAO","VERNIZ","CORTE","DOBRA","OUTROS"]),
  unit: z.enum(["UNIT","M2","LOT","HOUR","SHEET"]),
  baseCost: z.string().regex(/^\d+(\.\d{1,4})?$/),
  marginDefault: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
  calcType: z.enum(["PER_UNIT","PER_M2","PER_LOT","PER_HOUR"]).default("PER_UNIT"),
  minFee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  areaStepM2: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
  active: z.boolean().optional().default(true),
  minPerPiece: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  lossFactor: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category");
  const unit = searchParams.get("unit");
  const active = searchParams.get("active");

  const where: any = {};
  
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" as const } },
      { category: { equals: q.toUpperCase() as any } },
    ];
  }

  if (category) {
    where.category = category.toUpperCase();
  }

  if (unit) {
    where.unit = unit.toUpperCase();
  }

  if (active !== null && active !== undefined) {
    where.active = active === "true" || active === "1";
  }

  // Filtra apenas registros atuais
  where.isCurrent = true;

  const rows = await prisma.finish.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  
  // Serializa Decimal para string
  const serialized = rows.map(row => ({
    ...row,
    baseCost: row.baseCost.toString(),
    minFee: row.minFee ? row.minFee.toString() : null,
    areaStepM2: row.areaStepM2 ? row.areaStepM2.toString() : null,
    marginDefault: row.marginDefault ? row.marginDefault.toString() : null,
  }));
  
  return NextResponse.json(serialized);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.finish.create({ data: parsed.data as any });
  return NextResponse.json(row, { status: 201 });
}
