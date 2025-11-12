import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
  const products = body.products || [];
  const customerId = body.customerId ? Number(body.customerId) : null;
  const customerName = body.customerName || null;

  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json({ error: "products é obrigatório (array não vazio)" }, { status: 400 });
  }

  // Obter usuário
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

  // Calcular cada produto
  const productCalculations = [];
  let totalSubtotal = 0;
  let totalFinalPrice = 0;
  let totalVatAmount = 0;
  let totalPriceGross = 0;

  for (const productData of products) {
    const productId = Number(productData.productId);
    const quantity = Number(productData.quantity ?? 1000);
    const params = productData.params ?? {};
    const choiceIds = productData.choiceIds ?? [];

    if (!Number.isFinite(productId) || productId <= 0) {
      continue;
    }

    const choiceOverrides = await applyChoiceOverrides(productId, choiceIds);
    const overrides = {
      ...choiceOverrides,
      customerId: customerId && Number.isFinite(customerId) ? customerId : undefined,
      sourcingMode: productData.sourcingMode || "INTERNAL"
    };
    
    const c = await calcQuote(productId, quantity, params, overrides);
    const finalResult = applyPriceOverrides(c, choiceOverrides);

    productCalculations.push({
      productId,
      productName: productData.productName || finalResult.product.name,
      quantity,
      choiceIds,
      params: {
        ...finalResult.params,
        choiceIds,
        choiceLabels: await getChoiceLabels(choiceIds)
      },
      subtotal: finalResult.subtotal,
      markupApplied: finalResult.markup.toString(),
      marginApplied: finalResult.margin.toString(),
      dynamicAdjust: finalResult.dynamic.toString(),
      finalPrice: finalResult.final,
      vatAmount: finalResult.vatAmount || 0,
      priceGross: finalResult.priceGross || 0,
      breakdown: {
        costMat: finalResult.costMat,
        costPrint: finalResult.costPrint,
        costFinish: finalResult.costFinish,
        minOrderApplied: finalResult.minOrderApplied,
        minOrderReason: finalResult.minOrderReason
      },
      items: finalResult.items
    });

    totalSubtotal += Number(finalResult.subtotal);
    totalFinalPrice += Number(finalResult.final);
    totalVatAmount += (finalResult.vatAmount || 0);
    totalPriceGross += (finalResult.priceGross || 0);
  }

  // Criar orçamento principal (usando o primeiro produto como referência)
  const mainProduct = productCalculations[0];
  const quote = await prisma.quote.create({
    data: {
      number: `Q-${Date.now()}`,
      userId: user.id,
      productId: mainProduct.productId,
      quantity: mainProduct.quantity,
      customerId: customerId && Number.isFinite(customerId) ? customerId : null,
      params: {
        multiProduct: true,
        customerName: customerName, // Nome do cliente manual se fornecido
        products: productCalculations.map(p => ({
          productId: p.productId,
          productName: p.productName,
          quantity: p.quantity,
          finalPrice: Number(p.finalPrice),
          subtotal: Number(p.subtotal),
          vatAmount: Number(p.vatAmount),
          priceGross: Number(p.priceGross)
        })),
        totalSubtotal: totalSubtotal,
        totalFinalPrice: totalFinalPrice,
        totalVatAmount: totalVatAmount,
        totalPriceGross: totalPriceGross
      },
      subtotal: totalSubtotal.toFixed(2),
      markupApplied: mainProduct.markupApplied,
      marginApplied: mainProduct.marginApplied,
      dynamicAdjust: mainProduct.dynamicAdjust,
      finalPrice: totalFinalPrice.toFixed(2),
      vatAmount: totalVatAmount > 0 ? totalVatAmount.toFixed(2) : null,
      priceGross: totalPriceGross > 0 ? totalPriceGross.toFixed(2) : null,
      breakdown: {
        multiProduct: true,
        products: productCalculations.map(p => ({
          productId: p.productId,
          productName: p.productName,
          breakdown: p.breakdown
        })),
        totalCostMat: productCalculations.reduce((sum, p) => sum + Number(p.breakdown.costMat || 0), 0),
        totalCostPrint: productCalculations.reduce((sum, p) => sum + Number(p.breakdown.costPrint || 0), 0),
        totalCostFinish: productCalculations.reduce((sum, p) => sum + Number(p.breakdown.costFinish || 0), 0)
      },
      items: {
        create: productCalculations.flatMap((p, index) => 
          p.items.map((it: any) => ({
            itemType: it.type,
            refId: it.refId,
            name: `${p.productName} - ${it.name}`,
            quantity: (it.quantity as any)?.toFixed ? (it.quantity as any).toFixed(4) : null,
            unit: it.unit as any,
            unitCost: (it.unitCost as any)?.toFixed ? (it.unitCost as any).toFixed(4) : null,
            totalCost: it.totalCost.toFixed(4),
          }))
        )
      },
    },
  });

  return NextResponse.json({
    ok: true,
    id: quote.id,
    quoteNumber: quote.number,
    finalPrice: Number(quote.finalPrice),
    subtotal: Number(quote.subtotal),
    vatAmount: quote.vatAmount ? Number(quote.vatAmount) : null,
    priceGross: quote.priceGross ? Number(quote.priceGross) : null,
    productCount: products.length
  });
}

