import { prisma } from "@/lib/prisma";
import { roundToStep } from "@/lib/rounding";
import { toNumber } from "@/lib/money";
import { computeImposition } from "@/lib/imposition";

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

  // Aplicar mínimo de pedido
  let effectiveQuantity = quantity;
  let minOrderApplied = false;
  let minOrderReason = "";

  if (product.minOrderQty && quantity < product.minOrderQty) {
    effectiveQuantity = product.minOrderQty;
    minOrderApplied = true;
    minOrderReason = `Quantidade mínima: ${product.minOrderQty} unidades`;
  }

  // ===== custos detalhados por item =====
  const items: Array<{
    type: "MATERIAL" | "PRINTING" | "FINISH";
    refId?: number; name: string; quantity?: number; unit?: string; unitCost?: number; totalCost: number;
  }> = [];

  // Materiais
  let costMat = 0;
  for (const pm of product.materials) {
    const unitCost = toNumber(pm.material.unitCost);
    const waste = toNumber(pm.wasteFactor);
    let effectiveQty = 0;
    let qtyPU = toNumber(pm.qtyPerUnit);

    // Imposição automática se disponível
    if (pm.variant && pm.variant.widthMm && pm.variant.heightMm && 
        (product as any).widthMm && (product as any).heightMm && 
        pm.material.unit === "SHEET") {
      
      const imposition = computeImposition({
        productWidthMm: (product as any).widthMm,
        productHeightMm: (product as any).heightMm,
        sheetWidthMm: pm.variant.widthMm,
        sheetHeightMm: pm.variant.heightMm,
        bleedMm: 3, // sangria padrão de 3mm
        gutterMm: 2, // folga padrão de 2mm
      });

      if (imposition.piecesPerSheet > 0) {
        // Calcular folhas necessárias baseado na imposição
        const sheetsNeeded = Math.ceil(effectiveQuantity / imposition.piecesPerSheet);
        // Aplicar perda global se configurada
        const lossFactor = toNumber(cfg.lossFactor) || 0;
        const sheetsWithLoss = Math.ceil(sheetsNeeded * (1 + lossFactor));
        effectiveQty = sheetsWithLoss;
        qtyPU = sheetsWithLoss / effectiveQuantity; // qtyPerUnit calculado automaticamente
      } else {
        // Fallback para qtyPerUnit manual se imposição falhar
        qtyPU = toNumber(pm.qtyPerUnit);
        effectiveQty = effectiveQuantity * qtyPU * (1 + waste);
        // Aplicar perda global
        const lossFactor = toNumber(cfg.lossFactor) || 0;
        effectiveQty = effectiveQty * (1 + lossFactor);
      }
    } else {
      // Cálculo tradicional (sem imposição)
      qtyPU = toNumber(pm.qtyPerUnit);
      effectiveQty = effectiveQuantity * qtyPU * (1 + waste);
      // Aplicar perda global
      const lossFactor = toNumber(cfg.lossFactor) || 0;
      effectiveQty = effectiveQty * (1 + lossFactor);
    }

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
      
      // Calcular quantidade de tiros considerando perda global
      const baseTiros = Math.ceil(effectiveQuantity / yieldVal);
      const lossFactor = toNumber(cfg.lossFactor) || 0;
      const tirosWithLoss = Math.ceil(baseTiros * (1 + lossFactor));
      
      const byQty = unitPrice * tirosWithLoss;
      
      // Custo de setup se configurado
      let setupCost = 0;
      if (product.printing.setupMinutes && (cfg as any).printingHourCost) {
        const setupHours = toNumber(product.printing.setupMinutes) / 60;
        setupCost = setupHours * toNumber((cfg as any).printingHourCost);
      }
      
      costPrint = Math.max(byQty + setupCost, minFee);
      
      items.push({
        type: "PRINTING",
        refId: product.printingId ?? undefined,
        name: `Impressão ${product.printing.colors ?? ""}`.trim(),
        quantity: tirosWithLoss,
        unit: "UNIT", // Usar UNIT já que TIRO não existe no enum
        unitCost: unitPrice,
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
    let finishQuantity = effectiveQuantity * qtyPU;
    const calcType = (pf.calcTypeOverride ?? f.calcType) as string;
    
    // Aplicar AreaStep para acabamentos PER_M2
    if (calcType === "PER_M2" && f.areaStepM2) {
      const areaStep = toNumber(f.areaStepM2);
      if (areaStep > 0) {
        // Arredondar área para cima no degrau configurado
        finishQuantity = Math.ceil(finishQuantity / areaStep) * areaStep;
      }
    }
    
    switch (calcType) {
      case "PER_M2":   line = base * finishQuantity; break;
      case "PER_UNIT": line = base * finishQuantity; break;
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
      quantity: calcType === "PER_LOT" ? 1 : finishQuantity,
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

  // Aplicar valor mínimo se configurado
  let effectiveSubtotal = subtotal;
  if (product.minOrderValue && subtotal < toNumber(product.minOrderValue)) {
    effectiveSubtotal = toNumber(product.minOrderValue);
    minOrderApplied = true;
    minOrderReason = `Valor mínimo: €${product.minOrderValue}`;
  }

  const priceBeforeMargin = effectiveSubtotal * (1 + markup);
  let final = priceBeforeMargin * (1 + margin + dynamic);

  const step =
    toNumber(product.roundingStep) ||
    toNumber(product.category.roundingStep) ||
    toNumber(cfg.roundingStep);
  final = roundToStep(final, step);
  
  // Calcular IVA se configurado
  let vatAmount = 0;
  let priceGross = final;
  if (cfg.vatPercent) {
    vatAmount = final * toNumber(cfg.vatPercent);
    priceGross = final + vatAmount;
  }

  return {
    product, quantity, params,
    costMat, costPrint, costFinish, subtotal: effectiveSubtotal,
    markup, margin, dynamic, step, final,
    vatAmount, priceGross,
    minOrderApplied, minOrderReason,
    items,
  };
}
