import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = Number(searchParams.get("customerId"));
  const finishId = Number(searchParams.get("finishId"));
  
  if (!Number.isFinite(customerId) && !Number.isFinite(finishId)) {
    return NextResponse.json({ error: "customerId ou finishId é obrigatório" }, { status: 400 });
  }
  
  const where: any = { isCurrent: true };
  if (Number.isFinite(customerId)) where.customerId = customerId;
  if (Number.isFinite(finishId)) where.finishId = finishId;
  
  const rows = await prisma.finishCustomerPrice.findMany({
    where,
    include: {
      customer: true,
      finish: true,
    },
    orderBy: [{ priority: "asc" }],
  });
  
  // Serializa Decimal para string
  const serialized = rows.map((row: typeof rows[0]) => ({
    ...row,
    baseCost: row.baseCost.toString(),
    minFee: row.minFee ? row.minFee.toString() : null,
    areaStepM2: row.areaStepM2 ? row.areaStepM2.toString() : null,
  }));
  return NextResponse.json(serialized);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { customerId, finishId, baseCost, minFee = null, areaStepM2 = null, priority = 100, validFrom = null, validTo = null, isCurrent = true } = body || {};
  if (!Number.isFinite(customerId) || !Number.isFinite(finishId) || baseCost == null)
    return NextResponse.json({ error: "customerId, finishId e baseCost são obrigatórios" }, { status: 400 });
  // Bloquear duplicados por (customerId, finishId)
  const exists = await prisma.finishCustomerPrice.findFirst({ where: { customerId, finishId } });
  if (exists) return NextResponse.json({ error: "Já existe um preço para este acabamento e cliente" }, { status: 409 });
  const created = await prisma.finishCustomerPrice.create({
    data: { customerId, finishId, baseCost, minFee, areaStepM2, priority, validFrom, validTo, isCurrent },
  });
  return NextResponse.json(created, { status: 201 });
}

