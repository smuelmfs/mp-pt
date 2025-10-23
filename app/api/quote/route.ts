import { NextResponse } from "next/server";
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
  return NextResponse.json({
    productId, quantity, params,
    costMat: Number(c.costMat.toFixed(4)),
    costPrint: Number(c.costPrint.toFixed(4)),
    costFinish: Number(c.costFinish.toFixed(4)),
    subtotal: Number(c.subtotal.toFixed(2)),
    markup: c.markup, margin: c.margin, dynamic: c.dynamic, step: c.step,
    finalPrice: Number(c.final.toFixed(2)),
  });
}
