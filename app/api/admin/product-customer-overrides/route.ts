import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = Number(searchParams.get("customerId"));
  const productId = Number(searchParams.get("productId"));
  const where: any = {};
  if (Number.isFinite(customerId)) where.customerId = customerId;
  if (Number.isFinite(productId)) where.productId = productId;
  const rows = await prisma.productCustomerOverride.findMany({ where, orderBy: [{ priority: "asc" }] });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const {
    productId,
    customerId,
    marginDefault = null,
    markupDefault = null,
    roundingStep = null,
    roundingStrategy = null,
    minPricePerPiece = null,
    minOrderQty = null,
    minOrderValue = null,
    validFrom = null,
    validTo = null,
    isCurrent = true,
    priority = 100,
  } = body || {};
  if (!Number.isFinite(productId) || !Number.isFinite(customerId))
    return NextResponse.json({ error: "productId e customerId são obrigatórios" }, { status: 400 });
  const created = await prisma.productCustomerOverride.create({
    data: {
      productId,
      customerId,
      marginDefault,
      markupDefault,
      roundingStep,
      roundingStrategy,
      minPricePerPiece,
      minOrderQty,
      minOrderValue,
      validFrom,
      validTo,
      isCurrent,
      priority,
    },
  });
  return NextResponse.json(created, { status: 201 });
}

