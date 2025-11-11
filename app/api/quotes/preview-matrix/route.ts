import { NextRequest, NextResponse } from 'next/server';
import { calcQuote } from '@/lib/calc-quote';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantities = [], choiceIds = [], params = {}, overrides: incomingOverrides = {} } = body;

    if (!productId || !quantities.length) {
      return NextResponse.json({ error: 'productId e quantities são obrigatórios' }, { status: 400 });
    }

    // Buscar as escolhas selecionadas
    const choices = await prisma.productOptionChoice.findMany({
      where: { 
        id: { in: choiceIds },
        active: true 
      },
      include: {
        materialVariant: {
          include: { material: true }
        },
        finish: true
      }
    });

    // Aplicar overrides baseados nas escolhas
    const overrides: any = { ...(incomingOverrides || {}) };
    
    // Se não encontrou ProductOptionChoices, tentar detectar tipos diretos (ProductMaterial, ProductFinish, ProductDimension)
    if (choices.length === 0 && choiceIds.length > 0) {
      // Tentar encontrar ProductMaterials correspondentes aos IDs
      const productMaterials = await prisma.productMaterial.findMany({
        where: {
          id: { in: choiceIds },
          productId: productId
        },
        include: {
          material: true,
          variant: true
        }
      });
      
      // Tentar encontrar ProductFinishes correspondentes aos IDs
      const productFinishes = await prisma.productFinish.findMany({
        where: {
          id: { in: choiceIds },
          productId: productId
        },
        include: {
          finish: true
        }
      });
      
      // Tentar encontrar ProductDimensions correspondentes aos IDs
      const productDimensions = await prisma.productDimension.findMany({
        where: {
          id: { in: choiceIds },
          productId: productId,
          active: true
        }
      });
      
      // Aplicar materiais encontrados
      if (productMaterials.length > 0) {
        const pm = productMaterials[0]; // Seleção única
        overrides.productMaterialId = pm.id;
        overrides.materialId = pm.materialId;
        if (pm.variantId) {
          overrides.materialVariantId = pm.variantId;
        }
      }
      
      // Aplicar acabamentos encontrados
      if (productFinishes.length > 0) {
        overrides.disableProductFinishes = true;
        overrides.includeFinishIds = productFinishes.map((pf: typeof productFinishes[0]) => pf.finishId);
        overrides.additionalFinishes = productFinishes.map((pf: typeof productFinishes[0]) => ({
          finishId: pf.finishId,
          qtyPerUnit: Number(pf.qtyPerUnit) || 1,
        }));
      }
      
      // Aplicar dimensões encontradas
      if (productDimensions.length > 0) {
        const dim = productDimensions[0]; // Seleção única
        overrides.widthOverride = dim.widthMm;
        overrides.heightOverride = dim.heightMm;
      }
    } else {
      // Aplicar material/variante de material se selecionada via ProductOptionChoice
      const materialChoice = choices.find((c: typeof choices[0]) => c.materialVariantId);
      if (materialChoice?.materialVariant) {
        overrides.materialVariantId = materialChoice.materialVariantId;
        overrides.materialId = materialChoice.materialVariant.materialId;
      }
      
      // Aplicar dimensões se sobrescritas via ProductOptionChoice
      const dimensionChoice = choices.find((c: typeof choices[0]) => c.widthOverride || c.heightOverride);
      if (dimensionChoice) {
        if (dimensionChoice.widthOverride) overrides.widthOverride = dimensionChoice.widthOverride;
        if (dimensionChoice.heightOverride) overrides.heightOverride = dimensionChoice.heightOverride;
      }
      
      // Acabamentos: quando o usuário selecionar acabamentos, usar somente os escolhidos
      const finishChoices = choices.filter((c: typeof choices[0]) => c.finishId);
      if (finishChoices.length > 0) {
        overrides.disableProductFinishes = true;
        overrides.includeFinishIds = finishChoices.map((c: typeof finishChoices[0]) => c.finishId);
        overrides.additionalFinishes = finishChoices.map((c: typeof finishChoices[0]) => ({
          finishId: c.finishId,
          qtyPerUnit: c.finishQtyPerUnit || 1,
        }));
      }
    }
    
    // Aplicar overrideAttrs se existir
    const attrsChoice = choices.find((c: typeof choices[0]) => c.overrideAttrs);
    if (attrsChoice?.overrideAttrs) {
      Object.assign(params, attrsChoice.overrideAttrs);
    }
    
    // Aplicar dimensões via params.dimensionOverrides (fallback)
    if (params && (params as any).dimensionOverrides && !overrides.widthOverride && !overrides.heightOverride) {
      const dimOverrides = (params as any).dimensionOverrides;
      // Se há dimensão padrão ou dimensão específica selecionada
      if (dimOverrides.default) {
        overrides.widthOverride = dimOverrides.default.widthMm;
        overrides.heightOverride = dimOverrides.default.heightMm;
      } else if (typeof dimOverrides === 'object') {
        // Pegar a primeira dimensão não-padrão
        const dimKeys = Object.keys(dimOverrides).filter((k: string) => k !== 'default');
        if (dimKeys.length > 0) {
          const firstDim = dimOverrides[dimKeys[0]];
          if (firstDim && firstDim.widthMm && firstDim.heightMm) {
            overrides.widthOverride = firstDim.widthMm;
            overrides.heightOverride = firstDim.heightMm;
          }
        }
      }
    }

    // Calcular ajustes de preço das escolhas
    let priceAdjustment = 0;
    let priceFixed = 0;
    
    choices.forEach((choice: typeof choices[0]) => {
      if (choice.priceAdjustment) {
        priceAdjustment += parseFloat(choice.priceAdjustment.toString());
      }
      if (choice.priceFixed) {
        priceFixed += parseFloat(choice.priceFixed.toString());
      }
    });

    // Material selecionado via params (fallback caso a escolha não tenha variante)
    // IMPORTANTE: productMaterialId tem precedência sobre materialId
    if (!overrides.productMaterialId && params && (params as any).productMaterialId) {
      overrides.productMaterialId = Number((params as any).productMaterialId);
    }
    if (!overrides.materialId && params && (params as any).materialId) {
      overrides.materialId = Number((params as any).materialId);
    }
    if (!overrides.materialId && params && (params as any).selectedMaterialId) {
      overrides.materialId = Number((params as any).selectedMaterialId);
    }

    // Calcular para cada quantidade
    const rows = [];
    let vatPercent = 0;

    for (const quantity of quantities) {
      try {
        const result = await calcQuote(productId, quantity, params, overrides);

        // Aplicar ajustes no subtotal
        let adjustedSubtotal = result.subtotal;
        if (priceAdjustment !== 0) {
          adjustedSubtotal = adjustedSubtotal * (1 + priceAdjustment);
        }
        if (priceFixed !== 0) {
          adjustedSubtotal = adjustedSubtotal + priceFixed;
        }

        // Recalcular preço final
        const priceBeforeMargin = adjustedSubtotal * (1 + result.markup);
        const final = priceBeforeMargin * (1 + result.margin + result.dynamic);
        const roundedFinal = result.step ? Math.round(final / result.step) * result.step : final;

        // Calcular IVA
        let vatAmount = 0;
        let priceGross = roundedFinal;
        if (result.vatAmount) {
          vatAmount = roundedFinal * (result.vatAmount / result.final);
          priceGross = roundedFinal + vatAmount;
          vatPercent = result.vatAmount / result.final;
        }

        rows.push({
          qty: quantity,
          priceNet: roundedFinal,
          priceGross,
          unitGross: priceGross / quantity
        });

      } catch (error) {
        console.error(`Erro ao calcular para quantidade ${quantity}:`, error);
        rows.push({
          qty: quantity,
          priceNet: 0,
          priceGross: 0,
          unitGross: 0,
          error: 'Erro no cálculo'
        });
      }
    }

    return NextResponse.json({
      rows,
      vatPercent
    });

  } catch (error) {
    console.error('Erro ao calcular preview matrix:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}