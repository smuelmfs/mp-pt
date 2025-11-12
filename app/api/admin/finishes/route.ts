import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["LAMINACAO","VERNIZ","CORTE","DOBRA","OUTROS"]),
  unit: z.enum(["UNIT","M2","LOT","HOUR","SHEET"]),
  baseCost: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && /^\d+(\.\d{1,4})?$/.test(val.trim());
  }, { message: "Custo base deve ser um número positivo com até 4 casas decimais" }),
  marginDefault: z.string().regex(/^\d+(\.\d{1,4})?$/).optional().nullable(),
  calcType: z.enum(["PER_UNIT","PER_M2","PER_LOT","PER_HOUR"]).default("PER_UNIT"),
  minFee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  areaStepM2: z.string().regex(/^\d+(\.\d{1,4})?$/).optional().nullable(),
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
  const serialized = rows.map((row: typeof rows[0]) => ({
    ...row,
    baseCost: row.baseCost.toString(),
    minFee: row.minFee ? row.minFee.toString() : null,
    areaStepM2: row.areaStepM2 ? row.areaStepM2.toString() : null,
    marginDefault: row.marginDefault ? row.marginDefault.toString() : null,
  }));
  
  return NextResponse.json(serialized);
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    
    // Normaliza baseCost removendo espaços e garantindo formato correto
    if (json.baseCost) {
      json.baseCost = String(json.baseCost).trim();
    }
    
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: errors || "Erro de validação", details: parsed.error.flatten() }, { status: 400 });
    }

    const row = await prisma.finish.create({ data: parsed.data as any });
    return NextResponse.json(row, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar acabamento:", error);
    return NextResponse.json({ error: error.message || "Erro ao criar acabamento" }, { status: 500 });
  }
}
