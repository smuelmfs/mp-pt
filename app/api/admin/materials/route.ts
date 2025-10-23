import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(1),     // ex: "papel", "vinil"
  unit: z.enum(["UNIT","M2","LOT","HOUR","SHEET"]),
  unitCost: z.string().regex(/^\d+(\.\d{1,4})?$/), // "12.3456"
  active: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const withVariants = searchParams.get("withVariants") === "1";

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { type: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const data = await prisma.material.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: withVariants ? { variants: true } : undefined,
  });

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const m = await prisma.material.create({ data: parsed.data });
  return NextResponse.json(m, { status: 201 });
}
