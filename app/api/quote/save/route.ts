import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { calcQuote } from "@/lib/calc-quote";
import { applyChoiceOverrides, applyPriceOverrides } from "@/lib/apply-overrides";
import { verifyIdToken } from "@/lib/auth";

async function getChoiceLabels(choiceIds: number[]) {
  if (!choiceIds.length) return {};
  
  const choices = await (prisma as any).productOptionChoice.findMany({
    where: { id: { in: choiceIds } },
    include: { group: true }
  });
  
  return choices.reduce((acc: Record<number, { name: string; group: string }>, choice: any) => {
    acc[choice.id] = {
      name: choice.name,
      group: choice.group.name
    };
    return acc;
  }, {} as Record<number, { name: string; group: string }>);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const productId = Number(body.productId);
  const quantity  = Number(body.quantity ?? 1000);
  const params    = body.params ?? {};
  const choiceIds = body.choiceIds ?? [];
  const customerId = body.customerId ? Number(body.customerId) : null;

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "productId é obrigatório (number)" }, { status: 400 });
  }

  const choiceOverrides = await applyChoiceOverrides(productId, choiceIds);
  const overrides = {
    ...choiceOverrides,
    customerId: customerId && Number.isFinite(customerId) ? customerId : undefined,
    sourcingMode: body.sourcingMode || "INTERNAL",
    disablePrinting: params?.disablePrinting === true || body.disablePrinting === true
  };
  const c = await calcQuote(productId, quantity, params, overrides);
  const finalResult = applyPriceOverrides(c, choiceOverrides);

  let user;
  try {
    const authHeader = req.headers.get("authorization");
    const idToken = authHeader?.replace("Bearer ", "");
    
    if (idToken) {
      const decodedToken = await verifyIdToken(idToken);
      const userEmail = decodedToken.email || "unknown@local";
      const userName = decodedToken.name || decodedToken.email?.split("@")[0] || "Usuário";
      
      user = await prisma.user.upsert({
        where: { email: userEmail },
        update: { name: userName },
        create: { name: userName, email: userEmail },
      });
    } else {
      user = await prisma.user.upsert({
        where: { email: "demo@local" },
        update: {},
        create: { name: "Comercial Demo", email: "demo@local" },
      });
    }
  } catch (error) {
    user = await prisma.user.upsert({
      where: { email: "demo@local" },
      update: {},
      create: { name: "Comercial Demo", email: "demo@local" },
    });
  }

  const quote = await prisma.quote.create({
    data: {
      number: `Q-${Date.now()}`, userId: user.id,
      productId: finalResult.product.id, quantity: finalResult.quantity,
      customerId: customerId && Number.isFinite(customerId) ? customerId : null,
      params: { 
        ...finalResult.params, 
        choiceIds,
        choiceLabels: await getChoiceLabels(choiceIds)
      },
      subtotal: finalResult.subtotal.toFixed(2),
      markupApplied: finalResult.markup.toString(),
      marginApplied: finalResult.margin.toString(),
      dynamicAdjust: finalResult.dynamic.toString(),
      finalPrice: finalResult.final.toFixed(2),
      vatAmount: finalResult.vatAmount ? finalResult.vatAmount.toFixed(2) : null,
      priceGross: finalResult.priceGross ? finalResult.priceGross.toFixed(2) : null,
      breakdown: { 
        costMat: finalResult.costMat, 
        costPrint: finalResult.costPrint, 
        costFinish: finalResult.costFinish,
        minOrderApplied: finalResult.minOrderApplied,
        minOrderReason: finalResult.minOrderReason
      },
      items: {
        create: finalResult.items.map((it: any) => ({
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
    finalPrice: Number(quote.finalPrice), 
    subtotal: Number(quote.subtotal),
    vatAmount: quote.vatAmount ? Number(quote.vatAmount) : null,
    priceGross: quote.priceGross ? Number(quote.priceGross) : null
  });
}
