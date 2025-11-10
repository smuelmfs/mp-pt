import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  technology: z.enum(["OFFSET","DIGITAL","UV","GRANDE_FORMATO"]),
  formatLabel: z.string().optional(),
  colors: z.string().optional(),
  sides: z.number().int().positive().max(2).optional(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,4})?$/),
  yield: z.number().int().positive().optional(),
  setupMinutes: z.number().int().nonnegative().optional(),
  minFee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  active: z.boolean().optional().default(true),
  setupMode: z.enum(["TIME_X_RATE","FLAT"]).optional(),
  setupFlatFee: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  lossFactor: z.string().regex(/^\d+(\.\d{1,4})?$/).nullable().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const technology = searchParams.get("technology");
  const active = searchParams.get("active");

  const where: any = {};
  
  if (q) {
    where.OR = [
      { formatLabel: { contains: q, mode: "insensitive" as const } },
      { colors: { contains: q, mode: "insensitive" as const } },
      { technology: { equals: q.toUpperCase() as any } },
    ];
  }

  if (technology) {
    where.technology = technology.toUpperCase();
  }

  if (active !== null && active !== undefined) {
    where.active = active === "true" || active === "1";
  }

  // Filtra apenas registros atuais
  where.isCurrent = true;

  const rows = await prisma.printing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  
  // Serializa Decimal para string
  const serialized = rows.map(row => ({
    ...row,
    unitPrice: row.unitPrice.toString(),
    minFee: row.minFee ? row.minFee.toString() : null,
  }));
  
  return NextResponse.json(serialized);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.printing.create({ data: parsed.data as any });
  return NextResponse.json(row, { status: 201 });
}
