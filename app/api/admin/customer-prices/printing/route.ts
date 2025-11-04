import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = Number(searchParams.get("customerId"));
  if (!Number.isFinite(customerId)) return NextResponse.json({ error: "customerId é obrigatório" }, { status: 400 });
  const rows = await prisma.printingCustomerPrice.findMany({
    where: { customerId },
    orderBy: [{ priority: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { customerId, printingId, sides = null, unitPrice, priority = 100, validFrom = null, validTo = null, isCurrent = true } = body || {};
  if (!Number.isFinite(customerId) || !Number.isFinite(printingId) || unitPrice == null)
    return NextResponse.json({ error: "customerId, printingId e unitPrice são obrigatórios" }, { status: 400 });
  // Bloquear duplicados por (customerId, printingId, sides)
  const exists = await prisma.printingCustomerPrice.findFirst({ where: { customerId, printingId, sides: (sides === null ? null : Number(sides)) } });
  if (exists) return NextResponse.json({ error: "Já existe um preço para esta impressão/lados neste cliente" }, { status: 409 });
  const created = await prisma.printingCustomerPrice.create({
    data: { customerId, printingId, sides, unitPrice, priority, validFrom, validTo, isCurrent },
  });
  return NextResponse.json(created, { status: 201 });
}

