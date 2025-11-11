import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") ? Number(searchParams.get("customerId")) : null;
  const printingId = searchParams.get("printingId") ? Number(searchParams.get("printingId")) : null;
  
  if (!customerId && !printingId) {
    return NextResponse.json({ error: "customerId ou printingId é obrigatório" }, { status: 400 });
  }
  
  const where: any = { isCurrent: true };
  if (customerId) where.customerId = customerId;
  if (printingId) where.printingId = printingId;
  
  const rows = await prisma.printingCustomerPrice.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true } },
      printing: { select: { id: true, formatLabel: true, technology: true } },
    },
    orderBy: [{ priority: "asc" }],
  });
  // Serializa Decimal para string
  const serialized = rows.map((row: typeof rows[0]) => ({
    ...row,
    unitPrice: row.unitPrice.toString(),
  }));
  return NextResponse.json(serialized);
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

