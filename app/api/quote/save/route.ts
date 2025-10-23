import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcQuote } from "@/lib/calc-quote";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const productId = Number(body.productId);
  const quantity  = Number(body.quantity ?? 1000);
  const params    = body.params ?? {};

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "productId é obrigatório (number)" }, { status: 400 });
  }

  const c = await calcQuote(productId, quantity, params);

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
      breakdown: { costMat: c.costMat, costPrint: c.costPrint, costFinish: c.costFinish },
      items: {
        create: c.items.map(it => ({
          itemType: it.type, refId: it.refId, name: it.name,
          quantity: (it.quantity as any)?.toFixed ? (it.quantity as any).toFixed(4) : null,
          unit: it.unit as any,
          unitCost: (it.unitCost as any)?.toFixed ? (it.unitCost as any).toFixed(4) : null,
          totalCost: it.totalCost.toFixed(4),
        })),
      },
    },
  });

  return NextResponse.json({
    ok: true, id: quote.id, quoteNumber: quote.number,
    finalPrice: Number(quote.finalPrice), subtotal: Number(quote.subtotal)
  });
}
