import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = Number(searchParams.get("customerId"));
  if (!Number.isFinite(customerId)) return NextResponse.json({ error: "customerId é obrigatório" }, { status: 400 });
  const rows = await prisma.finishCustomerPrice.findMany({
    where: { customerId },
    orderBy: [{ priority: "asc" }],
  });
  return NextResponse.json(rows);
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

