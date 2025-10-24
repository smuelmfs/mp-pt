import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcQuote } from "@/lib/calc-quote";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") || 10)));
  const q = (searchParams.get("q") || "").trim();

  const where: any = q ? {
    OR: [
      { number: { contains: q, mode: "insensitive" } },
      { product: { name: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
    ],
  } : {};

  const [total, data] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, number: true, createdAt: true, finalPrice: true, subtotal: true, quantity: true,
        product: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return NextResponse.json({ page, pageSize, total, pages: Math.ceil(total / pageSize), data });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const productId = Number(body.productId);
  const quantity  = Number(body.quantity ?? 1000);
  const params    = body.params ?? {};

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "productId é obrigatório (number)" }, { status: 400 });
  }

  const c = await calcQuote(productId, quantity, params);

  // usuário temporário até Firebase Auth
  const user = await prisma.user.upsert({
    where: { email: "demo@local" },
    update: {},
    create: { name: "Comercial Demo", email: "demo@local" },
  });

  const quote = await prisma.quote.create({
    data: {
      number: `Q-${Date.now()}`, userId: user.id,
      productId: c.product.id, quantity: c.quantity, params: c.params,
      subtotal: c.subtotal.toFixed(2),
      markupApplied: c.markup.toString(),
      marginApplied: c.margin.toString(),
      dynamicAdjust: c.dynamic.toString(),
      finalPrice: c.final.toFixed(2),
      vatAmount: c.vatAmount ? c.vatAmount.toFixed(2) : null,
      priceGross: c.priceGross ? c.priceGross.toFixed(2) : null,
      breakdown: { 
        costMat: c.costMat, costPrint: c.costPrint, costFinish: c.costFinish,
        minOrderApplied: c.minOrderApplied, minOrderReason: c.minOrderReason
      },
      items: {
        create: c.items.map(it => ({
          itemType: it.type, refId: it.refId, name: it.name,
          quantity: (it.quantity as any)?.toFixed ? (it.quantity as any).toFixed(4) : null,
          unit: it.unit as "UNIT" | "M2" | "LOT" | "HOUR" | "SHEET" | null,
          unitCost: (it.unitCost as any)?.toFixed ? (it.unitCost as any).toFixed(4) : null,
          totalCost: it.totalCost.toFixed(4),
        })),
      },
    },
  });

  return NextResponse.json({
    ok: true, id: quote.id, quoteNumber: quote.number,
    finalPrice: Number(quote.finalPrice), subtotal: Number(quote.subtotal),
    vatAmount: quote.vatAmount ? Number(quote.vatAmount) : null,
    priceGross: quote.priceGross ? Number(quote.priceGross) : null,
    minOrderApplied: c.minOrderApplied,
    minOrderReason: c.minOrderReason
  });
}
