import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = Number(searchParams.get("customerId"));
  if (!Number.isFinite(customerId)) return NextResponse.json({ error: "customerId é obrigatório" }, { status: 400 });
  const rows = await prisma.materialCustomerPrice.findMany({
    where: { customerId },
    include: { /* join via custom queries if needed */ },
    orderBy: [{ priority: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { customerId, materialId, unitCost, priority = 100, validFrom = null, validTo = null, isCurrent = true } = body || {};
  if (!Number.isFinite(customerId) || !Number.isFinite(materialId) || unitCost == null)
    return NextResponse.json({ error: "customerId, materialId e unitCost são obrigatórios" }, { status: 400 });
  // Bloquear duplicados por (customerId, materialId)
  const exists = await prisma.materialCustomerPrice.findFirst({ where: { customerId, materialId } });
  if (exists) return NextResponse.json({ error: "Já existe um preço para este material e cliente" }, { status: 409 });
  const created = await prisma.materialCustomerPrice.create({
    data: { customerId, materialId, unitCost, priority, validFrom, validTo, isCurrent },
  });
  return NextResponse.json(created, { status: 201 });
}

