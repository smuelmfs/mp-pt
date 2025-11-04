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

  // Cliente (opt-in): overrides.customerId tem precedência sobre params.customerId
  const customerId: number | null =
    (overrides?.customerId ?? (params?.customerId ?? null)) ?? null;
  const customer = customerId
    ? await prisma.customer.findUnique({ where: { id: customerId }, include: { group: true } })
    : null;

  // Otimização N+1: carregar todos os preços/overrides do cliente de uma vez
  const now = new Date();
  const customerPricing = customerId
    ? await Promise.all([
        prisma.materialCustomerPrice.findMany({
          where: {
            customerId: customerId,
            isCurrent: true,
            OR: [{ validFrom: null }, { validFrom: { lte: now } }],
            AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }],
          },
          orderBy: [{ priority: "asc" }],
        }),
        prisma.printingCustomerPrice.findMany({
          where: {
            customerId: customerId,
            isCurrent: true,
            OR: [{ validFrom: null }, { validFrom: { lte: now } }],
            AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }],
          },
          orderBy: [{ priority: "asc" }],
        }),
        prisma.finishCustomerPrice.findMany({
          where: {
            customerId: customerId,
            isCurrent: true,
            OR: [{ validFrom: null }, { validFrom: { lte: now } }],
            AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }],
          },
          orderBy: [{ priority: "asc" }],
        }),
        prisma.productCustomerOverride.findMany({
          where: {
            customerId: customerId,
            isCurrent: true,
            OR: [{ validFrom: null }, { validFrom: { lte: now } }],
            AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }],
          },
          orderBy: [{ priority: "asc" }],
        }),
      ]).then(([materials, printings, finishes, products]) => ({ materials, printings, finishes, products }))
    : null;

  const sourcingMode = (overrides?.sourcingMode ?? (product as any).sourcingMode ?? "INTERNAL") as
    | "INTERNAL"
    | "SUPPLIER"
    | "HYBRID";

  // Helpers de resolução de preços/overrides por cliente (sem queries em loop)
  function resolveMaterialUnitCost(materialId: number, baseUnitCost: number) {
    if (!customerPricing) return baseUnitCost;
    const rec = customerPricing.materials.find((r: any) => r.materialId === materialId);
    return rec ? toNumber(rec.unitCost) : baseUnitCost;
  }

  function resolvePrintingUnitPrice(printing: any, baseUnitPrice: number, opts: { sides?: number | null }) {
    if (!customerPricing || !printing?.id) return baseUnitPrice;
    const candidates = customerPricing.printings.filter((r: any) => r.printingId === printing.id);
    const sides = opts?.sides ?? null;
    const best = candidates.find((r: any) => r.sides == null || r.sides === sides) ?? candidates[0];
    return best ? toNumber(best.unitPrice) : baseUnitPrice;
  }

  function resolveFinishPricing(finish: any, pf: any, base: { baseCost: number; minFee?: number | null; areaStepM2?: number | null }) {
    if (!customerPricing || !finish?.id) return base;
    const rec = customerPricing.finishes.find((r: any) => r.finishId === finish.id);
    if (!rec) return base;
    return {
      baseCost: toNumber((rec as any).baseCost ?? base.baseCost),
      minFee: (rec as any).minFee != null ? toNumber((rec as any).minFee) : base.minFee ?? null,
      areaStepM2: (rec as any).areaStepM2 != null ? toNumber((rec as any).areaStepM2) : base.areaStepM2 ?? null,
    };
  }

  function resolveProductPrefs(product: any, category: any, cfgLocal: any) {
    // Base defaults: Product > Category > Global
    let roundingStep = firstDefined(product.roundingStep, category?.roundingStep, cfgLocal.roundingStep, 0) as any;
    let roundingStrategy = (product.roundingStrategy || category?.roundingStrategy || cfgLocal.roundingStrategy || "END_ONLY") as
      | "END_ONLY" | "PER_STEP";
    let pricingStrategy = (product.pricingStrategy || category?.pricingStrategy || cfgLocal.pricingStrategy || "COST_MARKUP_MARGIN") as
      | "COST_MARKUP_MARGIN" | "COST_MARGIN_ONLY" | "MARGIN_TARGET";
    let minPricePerPiece = firstDefined(product.minPricePerPiece, category?.minPricePerPiece, 0) as any;
    let marginDefault = product.marginDefault as any;
    let markupDefault = product.markupDefault as any;
    let minOrderQty = product.minOrderQty as any;
    let minOrderValue = product.minOrderValue as any;

    if (customerPricing) {
      const pco = customerPricing.products.find((r: any) => r.productId === product.id);
      if (pco) {
        if ((pco as any).roundingStep != null) roundingStep = (pco as any).roundingStep;
        if ((pco as any).roundingStrategy != null) roundingStrategy = (pco as any).roundingStrategy as any;
        if ((pco as any).minPricePerPiece != null) minPricePerPiece = (pco as any).minPricePerPiece;
        if ((pco as any).marginDefault != null) marginDefault = (pco as any).marginDefault;
        if ((pco as any).markupDefault != null) markupDefault = (pco as any).markupDefault;
        if ((pco as any).minOrderQty != null) minOrderQty = (pco as any).minOrderQty as any;
        if ((pco as any).minOrderValue != null) minOrderValue = (pco as any).minOrderValue as any;
      }
    }

    return {
      roundingStep: toNumber(roundingStep) || 0,
      roundingStrategy: roundingStrategy as "END_ONLY" | "PER_STEP",
      pricingStrategy: pricingStrategy as "COST_MARKUP_MARGIN" | "COST_MARGIN_ONLY" | "MARGIN_TARGET",
      minPricePerPiece: toNumber(minPricePerPiece) || 0,
      marginDefault: marginDefault != null ? toNumber(marginDefault) : undefined,
      markupDefault: markupDefault != null ? toNumber(markupDefault) : undefined,
      minOrderQty: minOrderQty != null ? Number(minOrderQty) : undefined,
      minOrderValue: minOrderValue != null ? toNumber(minOrderValue) : undefined,
    };
  }

  // Preferências resolvidas (prioridade: ProductCustomerOverride > Produto > Categoria > Global)
  const prefResolved = resolveProductPrefs(product, (product as any).category, cfg);
  const prefs = {
    step: prefResolved.roundingStep,
    roundingStrategy: prefResolved.roundingStrategy,
    pricingStrategy: prefResolved.pricingStrategy,
    minPricePerPiece: prefResolved.minPricePerPiece,
    categoryLoss: toNumber((product as any).category?.lossFactor) || 0,
  } as const;

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

    // Overrides de acabamentos (antes do loop):
    // 1) desabilitar todos
    if (overrides.disableProductFinishes) {
      (product as any).finishes = [];
    }
    // 2) incluir somente os IDs especificados
    if (overrides.includeFinishIds && Array.isArray(overrides.includeFinishIds) && (product as any).finishes?.length) {
      const includeSet = new Set<number>(overrides.includeFinishIds);
      (product as any).finishes = (product as any).finishes.filter((pf: any) => includeSet.has(pf.finishId));
    }
    // 3) adicionais agregados por finishId somando qtyPerUnit
    if (overrides.additionalFinishes && Array.isArray(overrides.additionalFinishes) && overrides.additionalFinishes.length > 0) {
      const agg = new Map<number, number>();
      for (const add of overrides.additionalFinishes) {
        const fid = Number(add.finishId);
        const qty = Number(add.qtyPerUnit ?? 1);
        if (!Number.isFinite(fid)) continue;
        agg.set(fid, (agg.get(fid) || 0) + (Number.isFinite(qty) ? qty : 0));
      }
      for (const [finishId, qtyPerUnit] of agg.entries()) {
        const finish = await prisma.finish.findUnique({ where: { id: finishId } });
        if (finish) {
          (product as any).finishes.push({
            id: 0,
            productId: product.id,
            finishId,
            calcRuleOverride: null,
            calcTypeOverride: null,
            qtyPerUnit,
            costOverride: null,
            finish,
          } as any);
        }
      }
    }
  }

  // Aplicar mínimo de pedido (quantidade)
  let effectiveQuantity = quantity;
  let minOrderApplied = false;
  let minOrderReason = "";

  const minOrderQtyResolved = (prefResolved.minOrderQty ?? product.minOrderQty) as number | undefined;
  if (minOrderQtyResolved && quantity < minOrderQtyResolved) {
    effectiveQuantity = minOrderQtyResolved;
    minOrderApplied = true;
    minOrderReason = `Quantidade mínima: ${minOrderQtyResolved} unidades`;
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
    let unitCostBase = toNumber(pm.material.unitCost);
    unitCostBase = resolveMaterialUnitCost(pm.materialId, unitCostBase);
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
        // baseSheets = ceil(qty / piecesPerSheet)
        const baseSheets = ceilInt(effectiveQuantity / imposition.piecesPerSheet);
        const sheetsWithLoss = ceilInt(baseSheets * (1 + matLoss));
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

    let line = unitCostBase * effectiveQty;
    line = roundLine(line);
    costMat += line;
    items.push({
      type: "MATERIAL",
      refId: pm.materialId,
      name: pm.material.name,
      quantity: effectiveQty,
      unit: pm.material.unit,
      unitCost: unitCostBase,
      totalCost: line,
    });
  }

  // =========================
  // Impressão
  // =========================
  let costPrint = 0;
  if (product.printing) {
    let unitPriceBase = toNumber(product.printing.unitPrice);
    unitPriceBase = resolvePrintingUnitPrice((product as any).printing, unitPriceBase, { sides: (product as any).printing?.sides ?? null });
    const yieldVal = product.printing.yield ?? 1;
    const minFee = toNumber(product.printing.minFee);

    const printLoss = toNumber(
      firstDefined((product.printing as any).lossFactor, prefs.categoryLoss, (cfg as any).lossFactor, 0) as number
    ) || 0;

    // baseTiros = ceil(qty / yield)
    const baseTiros = ceilInt(effectiveQuantity / yieldVal);
    // se baseTiros >= 2 aplica perda, senão usa baseTiros
    const tirosWithLoss = baseTiros >= 2 ? ceilInt(baseTiros * (1 + printLoss)) : baseTiros;

    const byQty = unitPriceBase * tirosWithLoss;

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
      unitCost: unitPriceBase,
      totalCost: costPrint,
    });
  }

  // =========================
  // Acabamentos
  // =========================
  let costFinish = 0;
  for (const pf of product.finishes) {
    const f = pf.finish;
    const base0 = toNumber(pf.costOverride ?? f.baseCost);
    const baseResolved = resolveFinishPricing(f, pf, {
      baseCost: base0,
      minFee: (f as any).minFee != null ? toNumber((f as any).minFee) : null,
      areaStepM2: (f as any).areaStepM2 != null ? toNumber((f as any).areaStepM2) : null,
    });
    const base = baseResolved.baseCost;
    const qtyPU = toNumber(pf.qtyPerUnit) || 1;
    const calcType = (pf.calcTypeOverride ?? f.calcType) as string;

    const finishLoss = toNumber(
      firstDefined((f as any).lossFactor, prefs.categoryLoss, (cfg as any).lossFactor, 0) as number
    ) || 0;

    let finishQuantity = 0;

    switch (calcType) {
      case "PER_M2": {
        let q = (areaM2PerUnit * effectiveQuantity) * qtyPU;
        if (baseResolved.areaStepM2) {
          const step = toNumber(baseResolved.areaStepM2 as any);
          if (step > 0) q = Math.ceil(q / step) * step; // step de área
        }
        finishQuantity = q * (1 + finishLoss); // perda em m² não precisa ceil
        break;
      }
      case "PER_LOT": {
        finishQuantity = 1; // lote não escala com perdas
        break;
      }
      case "PER_HOUR": {
        // Ajuste: PER_HOUR escala por quantidade (horas por unidade)
        finishQuantity = (effectiveQuantity * qtyPU) * (1 + finishLoss);
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

    const minFee = baseResolved.minFee != null ? toNumber(baseResolved.minFee) : toNumber((f as any).minFee);
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

  // Custos de fornecedor com escolha do melhor candidato
  let costSupplier = 0;
  let chosenSupplierName: string | undefined;
  if (product.supplierPrices && product.supplierPrices.length > 0) {
    const now = new Date();
    const candidates = (product.supplierPrices as any[]).filter((sp: any) => {
      if (overrides?.supplierId && sp.supplierId && sp.supplierId !== overrides.supplierId) return false;
      if (sp.isCurrent === false) return false;
      if (sp.validFrom && new Date(sp.validFrom) > now) return false;
      if (sp.validTo && new Date(sp.validTo) < now) return false;
      return true;
    });

    let best: { total: number; sp: any; qty: number } | null = null;
    for (const sp of candidates) {
      const unitCost = toNumber(sp.cost);
      let qty = 1;
      switch (sp.unit) {
        case "UNIT": qty = effectiveQuantity; break;
        case "M2":   qty = areaM2PerUnit > 0 ? areaM2PerUnit * effectiveQuantity : effectiveQuantity; break;
        case "LOT":
        default:     qty = 1;
      }
      const minQty = sp.minQty ? toNumber(sp.minQty) : 0;
      if (minQty > 0 && qty < minQty) qty = minQty;
      const total = isPerStep ? roundMoney2(unitCost * qty) : (unitCost * qty);
      if (!best || total < best.total) best = { total, sp, qty };
    }

    if (best) {
      costSupplier = isPerStep ? roundMoney2(best.total) : best.total;
      chosenSupplierName = best.sp.name || undefined;
      items.push({
        type: "OTHER",
        refId: best.sp.id,
        name: `Fornecedor: ${chosenSupplierName ?? "N/D"}`,
        quantity: best.qty,
        unit: best.sp.unit,
        unitCost: toNumber(best.sp.cost),
        totalCost: costSupplier,
      });
    }
  }

  let totalCostBeforeMargin = 0;
  switch (sourcingMode) {
    case "SUPPLIER":
      totalCostBeforeMargin = costSupplier;
      break;
    case "HYBRID":
      totalCostBeforeMargin = productionSubtotal + costSupplier;
      break;
    case "INTERNAL":
    default:
      totalCostBeforeMargin = productionSubtotal;
      break;
  }

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
  // Ordem de prioridade: CUSTOMER > CUSTOMER_GROUP > PRODUCT > CATEGORY > GLOBAL
  const dynCustomer = customerId ? await bestDynamic({ scope: "CUSTOMER", /* customerId in breakdown filter via overrides */ }) : null;
  const dynGroup = customer?.groupId ? await bestDynamic({ scope: "CUSTOMER_GROUP" /* filter by group via applies elsewhere */ }) : null;
  const dynProd = await bestDynamic({ scope: "PRODUCT", productId: product.id });
  const dynCat  = await bestDynamic({ scope: "CATEGORY", categoryId: product.categoryId });
  const dynGlob = await bestDynamic({ scope: "GLOBAL" });
  if (dynCustomer) dynamic = toNumber((dynCustomer as any).adjustPercent);
  else if (dynGroup) dynamic = toNumber((dynGroup as any).adjustPercent);
  else if (dynProd) dynamic = toNumber((dynProd as any).adjustPercent);
  else if (dynCat) dynamic = toNumber((dynCat as any).adjustPercent);
  else if (dynGlob) dynamic = toNumber((dynGlob as any).adjustPercent);

  // =========================
  // Mínimo por valor — aplica no total antes da margem
  // =========================
  let effectiveSubtotal = totalCostBeforeMargin;
  const productMinOrderValue = (product.minOrderValue != null ? toNumber(product.minOrderValue as any) : undefined) as number | undefined;
  const minOrderValueResolved = firstDefined(prefResolved.minOrderValue, productMinOrderValue) as any;
  if (minOrderValueResolved && totalCostBeforeMargin < toNumber(minOrderValueResolved)) {
    effectiveSubtotal = toNumber(minOrderValueResolved);
    minOrderApplied = true;
    minOrderReason = `Valor mínimo: €${minOrderValueResolved}`;
  }

  // =========================
  // Markup / Margem fixa (prioridade Produto > Categoria > Global) — prefs resolvidos podem fornecer margin/markup
  // =========================
  const productMarkupDefault = (product.markupDefault != null ? toNumber(product.markupDefault as any) : undefined) as number | undefined;
  const cfgMarkupOperational = (cfg.markupOperational != null ? toNumber(cfg.markupOperational as any) : undefined) as number | undefined;
  const markup = toNumber(firstDefined(prefResolved.markupDefault, productMarkupDefault, cfgMarkupOperational) as any);
  const productMarginDefault = (product.marginDefault != null ? toNumber(product.marginDefault as any) : undefined) as number | undefined;
  const cfgMarginDefault = (cfg.marginDefault != null ? toNumber(cfg.marginDefault as any) : undefined) as number | undefined;
  let margin = toNumber(firstDefined(prefResolved.marginDefault, productMarginDefault, cfgMarginDefault) as any);
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

  const floorPerPiece = prefs.minPricePerPiece ? (effectiveQuantity * prefs.minPricePerPiece) : 0;
  let rounded = roundToStep(final, prefs.step);
  if (prefs.minPricePerPiece && rounded < floorPerPiece) {
    if (prefs.step && prefs.step > 0) {
      const stepped = Math.ceil(floorPerPiece / prefs.step) * prefs.step;
      rounded = roundMoney2(stepped);
    } else {
      rounded = roundMoney2(floorPerPiece);
    }
  }
  final = rounded;

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
