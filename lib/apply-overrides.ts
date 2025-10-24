import { prisma } from '@/lib/prisma';

export interface ChoiceOverride {
  materialVariant?: {
    id: number;
    label: string;
    material: string;
  } | null;
  finish?: {
    id: number;
    name: string;
    qtyPerUnit?: number;
  } | null;
  dimensions?: {
    width?: number;
    height?: number;
  };
  price?: {
    adjustment?: number;
    fixed?: number;
  };
}

export interface ProductOverrides {
  materialVariantId?: number;
  additionalFinishes: Array<{
    finishId: number;
    qtyPerUnit: number;
  }>;
  widthOverride?: number;
  heightOverride?: number;
  priceAdjustment?: number;
  priceFixed?: number;
}

/**
 * Aplica as escolhas (choiceIds) como overrides no produto
 */
export async function applyChoiceOverrides(
  productId: number,
  choiceIds: number[]
): Promise<ProductOverrides> {
  if (!choiceIds || choiceIds.length === 0) {
    return {
      additionalFinishes: []
    };
  }

  // Buscar as escolhas com seus overrides
  const choices = await prisma.productOptionChoice.findMany({
    where: {
      id: { in: choiceIds },
      active: true
    },
    include: {
      materialVariant: {
        include: {
          material: true
        }
      },
      finish: true
    }
  });

  const overrides: ProductOverrides = {
    additionalFinishes: []
  };

  // Aplicar overrides de cada escolha
  for (const choice of choices) {
    // Override de variante de material (apenas a primeira encontrada)
    if (choice.materialVariantId && !overrides.materialVariantId) {
      overrides.materialVariantId = choice.materialVariantId;
    }

    // Override de acabamento adicional
    if (choice.finishId && choice.finishQtyPerUnit) {
      overrides.additionalFinishes.push({
        finishId: choice.finishId,
        qtyPerUnit: Number(choice.finishQtyPerUnit)
      });
    }

    // Override de dimensões (sobrescreve se for maior)
    if (choice.widthOverride) {
      overrides.widthOverride = Math.max(
        overrides.widthOverride || 0,
        choice.widthOverride
      );
    }
    if (choice.heightOverride) {
      overrides.heightOverride = Math.max(
        overrides.heightOverride || 0,
        choice.heightOverride
      );
    }

    // Override de preço (acumula ajustes percentuais, soma fixos)
    if (choice.priceAdjustment) {
      overrides.priceAdjustment = (overrides.priceAdjustment || 0) + Number(choice.priceAdjustment);
    }
    if (choice.priceFixed) {
      overrides.priceFixed = (overrides.priceFixed || 0) + Number(choice.priceFixed);
    }
  }

  return overrides;
}

/**
 * Aplica os overrides no produto antes do cálculo
 */
export function applyProductOverrides(
  product: any,
  overrides: ProductOverrides
): any {
  const modifiedProduct = { ...product };

  // Aplicar override de variante de material
  if (overrides.materialVariantId) {
    // Encontrar e substituir a variante principal
    const materialIndex = modifiedProduct.materials.findIndex((m: any) => m.isMain);
    if (materialIndex >= 0) {
      modifiedProduct.materials[materialIndex].variantId = overrides.materialVariantId;
    }
  }

  // Aplicar acabamentos adicionais
  if (overrides.additionalFinishes.length > 0) {
    for (const additionalFinish of overrides.additionalFinishes) {
      modifiedProduct.finishes.push({
        finishId: additionalFinish.finishId,
        qtyPerUnit: additionalFinish.qtyPerUnit,
        calcTypeOverride: null,
        costOverride: null
      });
    }
  }

  // Aplicar override de dimensões
  if (overrides.widthOverride) {
    modifiedProduct.widthMm = overrides.widthOverride;
  }
  if (overrides.heightOverride) {
    modifiedProduct.heightMm = overrides.heightOverride;
  }

  return modifiedProduct;
}

/**
 * Aplica ajustes de preço no resultado final
 */
export function applyPriceOverrides(
  result: any,
  overrides: ProductOverrides
): any {
  let adjustedResult = { ...result };

  // Aplicar ajuste percentual
  if (overrides.priceAdjustment) {
    const adjustmentFactor = 1 + overrides.priceAdjustment;
    adjustedResult.subtotal *= adjustmentFactor;
    adjustedResult.finalPrice *= adjustmentFactor;
    if (adjustedResult.vatAmount) {
      adjustedResult.vatAmount *= adjustmentFactor;
    }
    if (adjustedResult.priceGross) {
      adjustedResult.priceGross *= adjustmentFactor;
    }
  }

  // Aplicar ajuste fixo
  if (overrides.priceFixed) {
    adjustedResult.subtotal += overrides.priceFixed;
    adjustedResult.finalPrice += overrides.priceFixed;
    if (adjustedResult.vatAmount) {
      adjustedResult.vatAmount += overrides.priceFixed * 0.23; // Assumindo 23% de IVA
    }
    if (adjustedResult.priceGross) {
      adjustedResult.priceGross += overrides.priceFixed;
    }
  }

  return adjustedResult;
}
