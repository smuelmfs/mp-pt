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
    // Seleção direta de material por materialId (ex.: quando a escolha troca o material base)
    // IMPORTANTE: Filtrar por materialId PRIMEIRO, antes de aplicar variante
    if (overrides.materialId) {
      const mid = Number(overrides.materialId);
      if (Number.isFinite(mid)) {
        const matchIdx = product.materials.findIndex((pm: any) => Number(pm.materialId) === mid);
        if (matchIdx >= 0) {
          // manter apenas o material selecionado
          product.materials = [product.materials[matchIdx]] as any;
        }
      }
    }
    // Override de variante de material (aplica variante ao material já filtrado)
    if (overrides.materialVariantId) {
      // Se já filtramos por materialId, usar o material filtrado
      // Caso contrário, tentar encontrar o material correspondente à variante
      const newVariant = await prisma.materialVariant.findUnique({
        where: { id: overrides.materialVariantId },
        include: { material: true }
      });
      if (newVariant) {
        // Se já filtramos por materialId, usar o material filtrado (deve ser apenas 1)
        if (product.materials.length === 1) {
          // Aplicar variante ao material já filtrado
          product.materials[0].variantId = overrides.materialVariantId;
          product.materials[0].variant = newVariant;
        } else {
          // Se não filtramos ainda, encontrar o ProductMaterial correspondente ao material da variante
          const pmIdx = product.materials.findIndex((pm: any) => Number(pm.materialId) === Number(newVariant.materialId));
          if (pmIdx >= 0) {
            product.materials[pmIdx].variantId = overrides.materialVariantId;
            product.materials[pmIdx].variant = newVariant;
            // manter apenas o PM correspondente
            product.materials = [product.materials[pmIdx]] as any;
          } else {
            // Fallback: usar primeiro material e aplicar variante
            const materialIndex = product.materials.findIndex((m: any) => (m as any).isMain);
            const idx = materialIndex >= 0 ? materialIndex : (product.materials.length > 0 ? 0 : -1);
            if (idx >= 0) {
              product.materials[idx].variantId = overrides.materialVariantId;
              product.materials[idx].variant = newVariant;
              product.materials = [product.materials[idx]] as any;
            }
          }
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

  // Enforçar seleção de acabamentos antes do cálculo de custos
  // Se há acabamentos selecionados (via includeFinishIds ou additionalFinishes), usar apenas esses
  // Se não há seleção e há múltiplos acabamentos, não mostrar nenhum (evita mostrar todos quando nenhum foi selecionado)
  if (overrides) {
    const hasSelectedFinishes = (overrides.includeFinishIds && Array.isArray(overrides.includeFinishIds) && overrides.includeFinishIds.length > 0) ||
                                (overrides.additionalFinishes && Array.isArray(overrides.additionalFinishes) && overrides.additionalFinishes.length > 0);
    
    if (hasSelectedFinishes && (product as any).finishes && (product as any).finishes.length > 0) {
      const selectedFinishIds = new Set<number>();
      
      // Coletar IDs de acabamentos selecionados
      if (overrides.includeFinishIds && Array.isArray(overrides.includeFinishIds)) {
        overrides.includeFinishIds.forEach((id: any) => {
          const fid = Number(id);
          if (Number.isFinite(fid)) selectedFinishIds.add(fid);
        });
      }
      if (overrides.additionalFinishes && Array.isArray(overrides.additionalFinishes)) {
        overrides.additionalFinishes.forEach((add: any) => {
          const fid = Number(add.finishId);
          if (Number.isFinite(fid)) selectedFinishIds.add(fid);
        });
      }
      
      // Filtrar para manter apenas os acabamentos selecionados
      if (selectedFinishIds.size > 0) {
        (product as any).finishes = (product as any).finishes.filter((pf: any) => 
          selectedFinishIds.has(Number(pf.finishId))
        );
      }
    } else if (!hasSelectedFinishes) {
      // Se não há seleção explícita:
      // - Se há apenas 1 acabamento, considerar como padrão e manter
      // - Se há múltiplos acabamentos, não mostrar nenhum (evita mostrar todos quando nenhum foi selecionado)
      if ((product as any).finishes && (product as any).finishes.length > 1) {
        (product as any).finishes = [];
      }
      // Se há apenas 1 acabamento, manter (é considerado padrão)
    }
  } else if ((product as any).finishes && (product as any).finishes.length > 1) {
    // Se não há overrides e há múltiplos acabamentos, não mostrar nenhum
    (product as any).finishes = [];
  }
  // Se não há overrides e há apenas 1 acabamento, manter (é considerado padrão)

  // Inferir material a partir de params.materialOverrides quando a UI só envia overrides por variante (sem materialId explícito)
  if ((product as any).materials && (product as any).materials.length > 1) {
    const overridesHasMaterial = !!(overrides as any)?.materialId || !!(overrides as any)?.productMaterialId || !!(overrides as any)?.materialVariantId;
    const paramsMaterialOverrides = (params as any)?.materialOverrides;
    if (!overridesHasMaterial && paramsMaterialOverrides && typeof paramsMaterialOverrides === "object") {
      const variantIds = Object.keys(paramsMaterialOverrides)
        .map(v => Number(v))
        .filter((n) => Number.isFinite(n));
      if (variantIds.length === 1) {
        const inferredVariantId = variantIds[0];
        try {
          const inferredVariant = await prisma.materialVariant.findUnique({
            where: { id: inferredVariantId },
            include: { material: true }
          });
          if (inferredVariant?.materialId) {
            // Encontrar ProductMaterial correspondente ao material da variante
            const pmIdx = (product as any).materials.findIndex((pm: any) => Number(pm.materialId) === Number(inferredVariant.materialId));
            if (pmIdx >= 0) {
              // Atribuir a variante inferida ao PM selecionado e manter apenas ele
              (product as any).materials[pmIdx].variantId = inferredVariant.id;
              (product as any).materials[pmIdx].variant = inferredVariant;
              (product as any).materials = [(product as any).materials[pmIdx]] as any;
            }
          }
        } catch {
          // se não conseguir inferir, segue fluxo normal sem filtrar
        }
      }
    }
  }

  // Filtro adicional de material com base em params/overrides (quando há múltiplos materiais no produto)
  // Suporta: materialId (id do Material) ou productMaterialId (id de ProductMaterial)
  if ((product as any).materials && (product as any).materials.length > 1) {
    const pickMaterialId = Number(
      (overrides as any)?.materialId ?? (params as any)?.materialId ?? (params as any)?.selectedMaterialId ?? NaN
    );
    const pickPMId = Number(
      (overrides as any)?.productMaterialId ?? (params as any)?.productMaterialId ?? NaN
    );

    if (Number.isFinite(pickPMId)) {
      const match = (product as any).materials.find((pm: any) => Number(pm.id) === pickPMId);
      if (match) (product as any).materials = [match];
    } else if (Number.isFinite(pickMaterialId)) {
      const match = (product as any).materials.find((pm: any) => Number(pm.materialId) === pickMaterialId);
      if (match) (product as any).materials = [match];
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

  // Enforçar seleção única de material antes do cálculo de custos
  if ((product as any).materials && (product as any).materials.length > 1) {
    // Tentar derivar um material selecionado definitivo
    let definitivePMId: number | null = null;
    let definitiveMaterialId: number | null = null;

    const tryNumber = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    // 1) productMaterialId tem precedência absoluta
    definitivePMId = tryNumber((overrides as any)?.productMaterialId ?? (params as any)?.productMaterialId);
    // 2) materialId direto
    if (definitivePMId == null) {
      definitiveMaterialId = tryNumber(
        (overrides as any)?.materialId ?? (params as any)?.materialId ?? (params as any)?.selectedMaterialId
      );
    }
    // 3) materialVariantId → materialId
    if (definitivePMId == null && definitiveMaterialId == null) {
      const varId = tryNumber((overrides as any)?.materialVariantId);
      if (varId != null) {
        const v = await prisma.materialVariant.findUnique({ where: { id: varId }, include: { material: true } });
        if (v?.materialId) definitiveMaterialId = Number(v.materialId);
      }
    }
    // 4) params.materialOverrides com uma única variante
    if (definitivePMId == null && definitiveMaterialId == null) {
      const paramsMaterialOverrides = (params as any)?.materialOverrides;
      if (paramsMaterialOverrides && typeof paramsMaterialOverrides === "object") {
        const variantIds = Object.keys(paramsMaterialOverrides)
          .map(k => Number(k))
          .filter(n => Number.isFinite(n));
        if (variantIds.length === 1) {
          const v = await prisma.materialVariant.findUnique({ where: { id: variantIds[0] }, include: { material: true } });
          if (v?.materialId) definitiveMaterialId = Number(v.materialId);
        }
      }
    }

    // Aplicar filtro definitivo
    if (definitivePMId != null) {
      const match = (product as any).materials.find((pm: any) => Number(pm.id) === definitivePMId);
      if (match) (product as any).materials = [match];
    } else if (definitiveMaterialId != null) {
      const match = (product as any).materials.find((pm: any) => Number(pm.materialId) === definitiveMaterialId);
      if (match) (product as any).materials = [match];
    } else {
      // Se não há seleção explícita e há múltiplos materiais, usar apenas o primeiro
      // (evita mostrar todos os materiais quando nenhum foi selecionado)
      (product as any).materials = [(product as any).materials[0]];
    }
  }

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
      // Ajustar bleed e gutter para valores mais realistas
      // Bleed: 1mm é suficiente para impressão digital (3mm era muito conservador)
      // Gutter: 1mm é suficiente entre peças (2mm era muito conservador)
      // Isso permite melhor aproveitamento da folha (ex: 2 A4 em 1 SRA3)
      const imposition = computeImposition({
        productWidthMm: (product as any).widthMm,
        productHeightMm: (product as any).heightMm,
        sheetWidthMm: pm.variant.widthMm,
        sheetHeightMm: pm.variant.heightMm,
        bleedMm: 1,  // Reduzido de 3mm para 1mm (mais realista para digital)
        gutterMm: 1, // Reduzido de 2mm para 1mm (suficiente entre peças)
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
      // Arredondar setup quando PER_STEP
      setupCost = roundLine(setupCost);
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
        // Calcular área total: área por unidade × quantidade × qtyPerUnit
        let q = (areaM2PerUnit * effectiveQuantity) * qtyPU;
        // Aplicar perda antes do step (conforme planilha)
        q = q * (1 + finishLoss);
        // Aplicar step de área após perda (arredondar para cima no step)
        if (baseResolved.areaStepM2) {
          const step = toNumber(baseResolved.areaStepM2 as any);
          if (step > 0) q = Math.ceil(q / step) * step; // step de área
        }
        finishQuantity = q;
        break;
      }
      case "PER_LOT": {
        finishQuantity = 1; // lote não escala com perdas
        break;
      }
      case "PER_HOUR": {
        // PER_HOUR: qtyPU é horas por unidade, calcular horas totais necessárias
        // Exemplo: qtyPU = 0.1h/un, qty = 100 → horas = 10h
        const baseHours = effectiveQuantity * qtyPU;
        finishQuantity = baseHours * (1 + finishLoss); // perda aplicada às horas
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
        // base já é €/m², finishQuantity já está em m² (com step aplicado)
        line = base * finishQuantity;
        break;
      case "PER_HOUR":
        // base é €/hora, finishQuantity está em horas
        line = base * finishQuantity;
        break;
      case "PER_UNIT":
        // base é €/unidade, finishQuantity está em unidades
        line = base * finishQuantity;
        break;
      case "PER_LOT":
        // base é custo fixo por lote
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
      unit: calcType === "PER_HOUR" ? "HOUR" : f.unit, // PER_HOUR deve mostrar HOUR como unidade
      unitCost: base,
      totalCost: line,
    });
  }

  // =========================
  // Subtotais de custo (produção e fornecedor)
  // =========================
  // Quando PER_STEP, arredondar subtotal de produção
  let productionSubtotal = costMat + costPrint + costFinish;
  if (isPerStep) {
    productionSubtotal = roundMoney2(productionSubtotal);
  }

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
  // Arredondar total antes da margem quando PER_STEP
  if (isPerStep) {
    totalCostBeforeMargin = roundMoney2(totalCostBeforeMargin);
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
  // Arredondar effectiveSubtotal quando PER_STEP
  if (isPerStep) {
    effectiveSubtotal = roundMoney2(effectiveSubtotal);
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
      // Apenas margem (sem markup): subtotal × (1 + margem + ajuste_dinâmico)
      final = effectiveSubtotal * (1 + margin + dynamic);
      break;
    case "MARGIN_TARGET":
      // Margem alvo: preço = subtotal / (1 - margem - ajuste_dinâmico)
      // Garantir que denominador não seja <= 0
      const denominator = Math.max(1 - (margin + dynamic), 0.0001);
      final = effectiveSubtotal / denominator;
      break;
    default: // COST_MARKUP_MARGIN
      // Markup + Margem: subtotal × (1 + markup) × (1 + margem + ajuste_dinâmico)
      final = effectiveSubtotal * (1 + markup) * (1 + margin + dynamic);
      break;
  }

  // Aplicar mínimo por peça (se configurado)
  const floorPerPiece = prefs.minPricePerPiece ? (effectiveQuantity * prefs.minPricePerPiece) : 0;
  if (floorPerPiece > 0 && final < floorPerPiece) {
    final = floorPerPiece;
  }

  // Arredondar para o degrau configurado
  let rounded = roundToStep(final, prefs.step);
  
  // Se após arredondamento ainda estiver abaixo do mínimo por peça, ajustar
  if (prefs.minPricePerPiece && rounded < floorPerPiece) {
    if (prefs.step && prefs.step > 0) {
      // Arredondar o mínimo para cima no degrau
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
