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
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" } }] } : {};

  const rows = await prisma.finish.findMany({
    where, orderBy: { createdAt: "desc" }, take: 200,
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.finish.create({ data: parsed.data as any });
  return NextResponse.json(row, { status: 201 });
}
