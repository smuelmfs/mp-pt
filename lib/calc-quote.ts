import { prisma } from "@/lib/prisma";
import { roundToStep, roundMoney2, ceilInt } from "@/lib/rounding";
import { toNumber } from "@/lib/money";
import { computeImposition } from "@/lib/imposition";

const firstDefined = <T>(...vals: (T | null | undefined)[]) =>
  vals.find(v => v !== undefined && v !== null) as T | undefined;

export async function calcQuote(productId: number, quantity: number, params: any, overrides?: any) {
  if (!Number.isFinite(productId) || productId <= 0) throw new Error("productId inválido");

  const cfg = await prisma.configGlobal.findFirst({ where: { id: 1 } });
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      printing: true,
      materials: { include: { material: true, variant: true } },
      finishes: { include: { finish: true } },
      supplierPrices: true,
    },
  });
  if (!product || !cfg) throw new Error("Produto ou Config não encontrados");

  // Preferências (prioridade: Produto > Categoria > Global)
  const prefs = {
    step:
      toNumber((product as any).roundingStep) ||
      toNumber((product as any).category?.roundingStep) ||
      toNumber((cfg as any).roundingStep) ||
      0,
    roundingStrategy:
      ((product as any).roundingStrategy || (product as any).category?.roundingStrategy || (cfg as any).roundingStrategy || "END_ONLY") as
        | "END_ONLY"
        | "PER_STEP",
    pricingStrategy:
      ((product as any).pricingStrategy || (product as any).category?.pricingStrategy || (cfg as any).pricingStrategy || "COST_MARKUP_MARGIN") as
        | "COST_MARKUP_MARGIN"
        | "COST_MARGIN_ONLY"
        | "MARGIN_TARGET",
    minPricePerPiece:
      toNumber((product as any).minPricePerPiece) ||
      toNumber((product as any).category?.minPricePerPiece) ||
      0,
    categoryLoss: toNumber((product as any).category?.lossFactor) || 0,
  };

  const isPerStep = prefs.roundingStrategy === "PER_STEP";
  const roundLine = (v: number) => (isPerStep ? roundMoney2(v) : v);

  // Aplicar overrides se fornecidos
  if (overrides) {
    // Override de variante de material (usa primeiro material principal se houver flag isMain)
    if (overrides.materialVariantId) {
      const materialIndex = product.materials.findIndex((m: any) => (m as any).isMain);
      if (materialIndex >= 0) {
        product.materials[materialIndex].variantId = overrides.materialVariantId;
        const newVariant = await prisma.materialVariant.findUnique({
          where: { id: overrides.materialVariantId },
          include: { material: true }
        });
        if (newVariant) {
          product.materials[materialIndex].variant = newVariant;
        }
      }
    }
    // Override de dimensões
    if (overrides.widthOverride) (product as any).widthMm = overrides.widthOverride;
    if (overrides.heightOverride) (product as any).heightMm = overrides.heightOverride;

    // Adicionar acabamentos extras
    if (overrides.additionalFinishes && overrides.additionalFinishes.length > 0) {
      for (const additionalFinish of overrides.additionalFinishes) {
        const finish = await prisma.finish.findUnique({ where: { id: additionalFinish.finishId } });
        if (finish) {
          product.finishes.push({
            id: 0,
            productId: product.id,
            finishId: additionalFinish.finishId,
            calcRuleOverride: null,
            calcTypeOverride: null,
            qtyPerUnit: additionalFinish.qtyPerUnit,
            costOverride: null,
            finish
          } as any);
        }
      }
    }
  }

  // Aplicar mínimo de pedido (quantidade)
  let effectiveQuantity = quantity;
  let minOrderApplied = false;
  let minOrderReason = "";

  if (product.minOrderQty && quantity < product.minOrderQty) {
    effectiveQuantity = product.minOrderQty;
    minOrderApplied = true;
    minOrderReason = `Quantidade mínima: ${product.minOrderQty} unidades`;
  }

  // Área por unidade (para M2) — inferida de dimensões ou params
  const widthMm = product.widthMm || (product.attributesSchema as any)?.largura_mm || 0;
  const heightMm = product.heightMm || (product.attributesSchema as any)?.altura_mm || 0;
  const areaM2PerUnit = widthMm && heightMm ? (Number(widthMm) * Number(heightMm)) / 1_000_000 : 0;

  // ===== custos detalhados por item =====
  const items: Array<{
    type: "MATERIAL" | "PRINTING" | "FINISH" | "OTHER";
    refId?: number; name: string; quantity?: number; unit?: string; unitCost?: number; totalCost: number;
  }> = [];

  // =========================
  // Materiais
  // =========================
  let costMat = 0;
  for (const pm of product.materials) {
    const unitCost = toNumber(pm.material.unitCost);
    const waste = toNumber(pm.wasteFactor);
    const matLoss = toNumber(
      firstDefined((pm as any).lossFactor, (pm.material as any).lossFactor, prefs.categoryLoss, (cfg as any).lossFactor, 0) as number
    ) || 0;

    let effectiveQty = 0;
    let qtyPU = toNumber(pm.qtyPerUnit);

    if (
      pm.variant && pm.variant.widthMm && pm.variant.heightMm &&
      (product as any).widthMm && (product as any).heightMm &&
      pm.material.unit === "SHEET"
    ) {
      const imposition = computeImposition({
        productWidthMm: (product as any).widthMm,
        productHeightMm: (product as any).heightMm,
        sheetWidthMm: pm.variant.widthMm,
        sheetHeightMm: pm.variant.heightMm,
        bleedMm: 3,
        gutterMm: 2,
      });

      if (imposition.piecesPerSheet > 0) {
        const sheetsNeeded = effectiveQuantity / imposition.piecesPerSheet;
        const sheetsWithLoss = ceilInt(sheetsNeeded * (1 + matLoss)); // perda antes do ceil físico
        effectiveQty = sheetsWithLoss;
        qtyPU = sheetsWithLoss / effectiveQuantity;
      } else {
        qtyPU = toNumber(pm.qtyPerUnit);
        effectiveQty = effectiveQuantity * qtyPU * (1 + waste);
        effectiveQty = effectiveQty * (1 + matLoss);
        if (pm.material.unit === "SHEET") effectiveQty = ceilInt(effectiveQty);
      }
    } else {
      qtyPU = toNumber(pm.qtyPerUnit);
      effectiveQty = effectiveQuantity * qtyPU * (1 + waste);
      effectiveQty = effectiveQty * (1 + matLoss);
      if (pm.material.unit === "SHEET") effectiveQty = ceilInt(effectiveQty);
    }

    let line = unitCost * effectiveQty;
    line = roundLine(line);
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

  // =========================
  // Impressão
  // =========================
  let costPrint = 0;
  if (product.printing) {
    const unitPrice = toNumber(product.printing.unitPrice);
    const yieldVal = product.printing.yield ?? 1;
    const minFee = toNumber(product.printing.minFee);

    const printLoss = toNumber(
      firstDefined((product.printing as any).lossFactor, prefs.categoryLoss, (cfg as any).lossFactor, 0) as number
    ) || 0;

    const baseTiros = effectiveQuantity / yieldVal;
    const tirosWithLoss = ceilInt(baseTiros * (1 + printLoss));

    const byQty = unitPrice * tirosWithLoss;

    // Custo de setup
    let setupCost = 0;
    const setupMode = (product.printing as any).setupMode as "TIME_X_RATE" | "FLAT" | undefined;
    if (setupMode === "FLAT") {
      setupCost = toNumber((product.printing as any).setupFlatFee || 0);
    } else {
      const minutes = toNumber((product.printing as any).setupMinutes || (cfg as any).setupTimeMin || 0);
      const hourCost = toNumber((cfg as any).printingHourCost || 0);
      setupCost = (minutes / 60) * hourCost;
    }

    costPrint = Math.max(byQty + setupCost, minFee);
    costPrint = roundLine(costPrint);

    items.push({
      type: "PRINTING",
      refId: product.printingId ?? undefined,
      name: `Impressão ${product.printing.colors ?? ""}`.trim(),
      quantity: tirosWithLoss,
      unit: "UNIT",
      unitCost: unitPrice,
      totalCost: costPrint,
    });
  }

  // =========================
  // Acabamentos
  // =========================
  let costFinish = 0;
  for (const pf of product.finishes) {
    const f = pf.finish;
    const base = toNumber(pf.costOverride ?? f.baseCost);
    const qtyPU = toNumber(pf.qtyPerUnit) || 1;
    const calcType = (pf.calcTypeOverride ?? f.calcType) as string;

    const finishLoss = toNumber(
      firstDefined((f as any).lossFactor, prefs.categoryLoss, (cfg as any).lossFactor, 0) as number
    ) || 0;

    let finishQuantity = 0;

    switch (calcType) {
      case "PER_M2": {
        let q = (areaM2PerUnit * effectiveQuantity) * qtyPU;
        if (f.areaStepM2) {
          const step = toNumber(f.areaStepM2);
          if (step > 0) q = ceilInt(q / step) * step; // step de área
        }
        finishQuantity = q * (1 + finishLoss); // perda em m² não precisa ceil
        break;
      }
      case "PER_LOT": {
        finishQuantity = 1; // lote não escala com perdas
        break;
      }
      case "PER_HOUR": {
        finishQuantity = qtyPU; // horas por pedido (se precisar escalar por qty, ajustar para qtyPU*effectiveQuantity)
        break;
      }
      default: { // PER_UNIT
        finishQuantity = ceilInt((effectiveQuantity * qtyPU) * (1 + finishLoss)); // unidade física
        break;
      }
    }

    let line = 0;
    switch (calcType) {
      case "PER_M2":
      case "PER_HOUR":
      case "PER_UNIT":
        line = base * finishQuantity;
        break;
      case "PER_LOT":
        line = base;
        break;
    }

    const minFee = toNumber(f.minFee);
    if (minFee) line = Math.max(line, minFee);
    if ((f as any).minPerPiece) {
      line = Math.max(line, effectiveQuantity * toNumber((f as any).minPerPiece));
    }

    line = roundLine(line);
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

  // =========================
  // Subtotais de custo (produção e fornecedor)
  // =========================
  const productionSubtotal = costMat + costPrint + costFinish;

  // Custos de fornecedor (Produtos Publicitários)
  let costSupplier = 0;
  if (product.supplierPrices && product.supplierPrices.length > 0) {
    for (const sp of product.supplierPrices) {
      const unit = sp.unit;
      const unitCost = toNumber(sp.cost);
      let qty = 1;
      switch (unit) {
        case "UNIT": qty = effectiveQuantity; break;
        case "M2":   qty = areaM2PerUnit > 0 ? areaM2PerUnit * effectiveQuantity : effectiveQuantity; break;
        case "LOT":
        default:     qty = 1;
      }
      const line = roundLine(unitCost * qty);
      costSupplier += line;
      items.push({
        type: "OTHER",
        refId: sp.id,
        name: `Fornecedor: ${sp.name}`,
        quantity: qty,
        unit,
        unitCost,
        totalCost: line,
      });
    }
  }

  const totalCostBeforeMargin = productionSubtotal + costSupplier;

  // =========================
  // Regras de margem dinâmica — usar total antes da margem
  // =========================
  async function bestDynamic(where: any) {
    return prisma.marginRuleDynamic.findFirst({
      where: {
        active: true,
        ...where,
        OR: [{ minSubtotal: null }, { minSubtotal: { lte: totalCostBeforeMargin } }],
        AND: [{ OR: [{ minQuantity: null }, { minQuantity: { lte: effectiveQuantity } }] }],
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

  // =========================
  // Mínimo por valor — aplica no total antes da margem
  // =========================
  let effectiveSubtotal = totalCostBeforeMargin;
  if (product.minOrderValue && totalCostBeforeMargin < toNumber(product.minOrderValue)) {
    effectiveSubtotal = toNumber(product.minOrderValue);
    minOrderApplied = true;
    minOrderReason = `Valor mínimo: €${product.minOrderValue}`;
  }

  // =========================
  // Markup / Margem fixa (prioridade Produto > Categoria > Global)
  // =========================
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

  // =========================
  // Estratégia de precificação + mínimo por peça + step + IVA
  // =========================
  let final = 0;
  switch (prefs.pricingStrategy) {
    case "COST_MARGIN_ONLY":
      final = effectiveSubtotal * (1 + margin + dynamic);
      break;
    case "MARGIN_TARGET":
      final = effectiveSubtotal / Math.max(1 - (margin + dynamic), 0.0001);
      break;
    default:
      final = effectiveSubtotal * (1 + markup) * (1 + margin + dynamic);
  }

  if (prefs.minPricePerPiece) {
    final = Math.max(final, effectiveQuantity * prefs.minPricePerPiece);
  }

  final = roundToStep(final, prefs.step);

  let vatAmount = 0;
  let priceGross = final;
  if (cfg.vatPercent) {
    vatAmount = roundMoney2(final * toNumber(cfg.vatPercent));
    priceGross = roundMoney2(final + vatAmount);
  }

  return {
    product, quantity: effectiveQuantity, params,
    costMat, costPrint, costFinish,
    subtotalProduction: productionSubtotal,  // material + impressão + acabamentos
    subtotal: effectiveSubtotal,            // total antes da margem (inclui supplier e/ou mínimo por valor)
    markup, margin, dynamic, step: prefs.step,
    final,
    vatAmount, priceGross,
    minOrderApplied, minOrderReason,
    items,
  };
}
