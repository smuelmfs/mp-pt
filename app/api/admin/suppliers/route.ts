import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") === "1";
  const q = (searchParams.get("q") || "").trim();

  const where: any = activeOnly ? { active: true } : {};
  if (q) where.name = { contains: q, mode: "insensitive" };

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true, active: true },
  });
  return NextResponse.json(suppliers);
}

export async function POST(req: Request) {
  const json = await req.json().catch(()=>({}));
  const name = (json?.name || "").toString().trim();
  if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  const exists = await prisma.supplier.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  const row = exists
    ? await prisma.supplier.update({ where: { id: exists.id }, data: { active: true } })
    : await prisma.supplier.create({ data: { name, active: true } });
  return NextResponse.json(row, { status: 201 });
}

