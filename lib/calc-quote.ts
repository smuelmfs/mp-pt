import { prisma } from "@/lib/prisma";
import { roundToStep } from "@/lib/rounding";
import { toNumber } from "@/lib/money";

export async function calcQuote(productId: number, quantity: number, params: any) {
  if (!Number.isFinite(productId) || productId <= 0) throw new Error("productId inválido");

  const cfg = await prisma.configGlobal.findFirst({ where: { id: 1 } });
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      printing: true,
      materials: { include: { material: true, variant: true } },
      finishes: { include: { finish: true } },
    },
  });
  if (!product || !cfg) throw new Error("Produto ou Config não encontrados");

  // ===== custos detalhados por item =====
  const items: Array<{
    type: "MATERIAL" | "PRINTING" | "FINISH";
    refId?: number; name: string; quantity?: number; unit?: string; unitCost?: number; totalCost: number;
  }> = [];

  // Materiais
  let costMat = 0;
  for (const pm of product.materials) {
    const unitCost = toNumber(pm.material.unitCost);
    const qtyPU = toNumber(pm.qtyPerUnit);
    const waste = toNumber(pm.wasteFactor);
    const effectiveQty = quantity * qtyPU * (1 + waste);
    const line = unitCost * effectiveQty;
    costMat += line;
    items.push({
      type: "MATERIAL",
      refId: pm.materialId,
      name: pm.material.name,
      quantity: effectiveQty,
      unit: pm.material.unit,
      unitCost,
      totalCost: line,
    });
  }

  // Impressão
  let costPrint = 0;
  if (product.printing) {
    const unitPrice = toNumber(product.printing.unitPrice);
    const yieldVal = product.printing.yield ?? 1;
    const minFee = toNumber(product.printing.minFee);
    const byQty = (unitPrice / yieldVal) * quantity;
    costPrint = Math.max(byQty, minFee);
    items.push({
      type: "PRINTING",
      refId: product.printingId ?? undefined,
      name: `Impressão ${product.printing.colors ?? ""}`.trim(),
      totalCost: costPrint,
    });
  }

  // Acabamentos
  let costFinish = 0;
  for (const pf of product.finishes) {
    const f = pf.finish;
    const base = toNumber(f.baseCost);
    const qtyPU = toNumber(pf.qtyPerUnit) || 1;
    let line = 0;
    const calcType = (pf.calcTypeOverride ?? f.calcType) as string;
    switch (calcType) {
      case "PER_M2":   line = base * (quantity * qtyPU); break;
      case "PER_UNIT": line = base * (quantity * qtyPU); break;
      case "PER_LOT":  line = base; break;
      case "PER_HOUR": line = base * qtyPU; break;
    }
    const minFee = toNumber(f.minFee);
    if (minFee) line = Math.max(line, minFee);
    costFinish += line;

    items.push({
      type: "FINISH",
      refId: pf.finishId,
      name: f.name,
      quantity: calcType === "PER_LOT" ? 1 : quantity * qtyPU,
      unit: f.unit,
      unitCost: base,
      totalCost: line,
    });
  }

  const subtotal = costMat + costPrint + costFinish;

  // Markup / margem fixa (prioridade Produto > Categoria > Global)
  const markup = toNumber(product.markupDefault ?? cfg.markupOperational);
  let margin = toNumber(product.marginDefault ?? cfg.marginDefault);
  if (product.marginDefault == null) {
    const catRule = await prisma.marginRule.findFirst({
      where: { scope: "CATEGORY", categoryId: product.categoryId, active: true },
      orderBy: [{ startsAt: "desc" }],
    });
    if (catRule) margin = toNumber(catRule.margin);
    else {
      const globRule = await prisma.marginRule.findFirst({
        where: { scope: "GLOBAL", active: true },
        orderBy: [{ startsAt: "desc" }],
      });
      if (globRule) margin = toNumber(globRule.margin);
    }
  }

  // Dinâmica (prioridade Produto > Categoria > Global)
  async function bestDynamic(where: any) {
    return prisma.marginRuleDynamic.findFirst({
      where: {
        active: true,
        ...where,
        OR: [{ minSubtotal: null }, { minSubtotal: { lte: subtotal } }],
        AND: [{ OR: [{ minQuantity: null }, { minQuantity: { lte: quantity } }] }],
      },
      orderBy: [{ priority: "asc" }],
    });
  }
  let dynamic = 0;
  const dynProd = await bestDynamic({ scope: "PRODUCT", productId: product.id });
  const dynCat  = await bestDynamic({ scope: "CATEGORY", categoryId: product.categoryId });
  const dynGlob = await bestDynamic({ scope: "GLOBAL" });
  if (dynProd) dynamic = toNumber(dynProd.adjustPercent);
  else if (dynCat) dynamic = toNumber(dynCat.adjustPercent);
  else if (dynGlob) dynamic = toNumber(dynGlob.adjustPercent);

  const priceBeforeMargin = subtotal * (1 + markup);
  let final = priceBeforeMargin * (1 + margin + dynamic);

  const step =
    toNumber(product.roundingStep) ||
    toNumber(product.category.roundingStep) ||
    toNumber(cfg.roundingStep);
  final = roundToStep(final, step);

  return {
    product, quantity, params,
    costMat, costPrint, costFinish, subtotal,
    markup, margin, dynamic, step, final,
    items,
  };
}
