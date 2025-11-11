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
    
    // Se não encontrou ProductOptionChoices, pode ser que os IDs sejam ProductMaterial IDs
    // (quando o frontend envia material_${pm.id} e extrai apenas o ID numérico)
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
      
      if (productMaterials.length > 0) {
        // Usar o primeiro ProductMaterial encontrado (seleção única)
        const pm = productMaterials[0];
        overrides.productMaterialId = pm.id;
        overrides.materialId = pm.materialId;
        if (pm.variantId) {
          overrides.materialVariantId = pm.variantId;
        }
      }
    } else {
      // Aplicar material/variante de material se selecionada via ProductOptionChoice
      const materialChoice = choices.find(c => c.materialVariantId);
      if (materialChoice?.materialVariant) {
        overrides.materialVariantId = materialChoice.materialVariantId;
        overrides.materialId = materialChoice.materialVariant.materialId;
      }
    }

    // Aplicar dimensões se sobrescritas
    const dimensionChoice = choices.find(c => c.widthOverride || c.heightOverride);
    if (dimensionChoice) {
      if (dimensionChoice.widthOverride) overrides.widthOverride = dimensionChoice.widthOverride;
      if (dimensionChoice.heightOverride) overrides.heightOverride = dimensionChoice.heightOverride;
    }

    // Aplicar overrideAttrs se existir
    const attrsChoice = choices.find(c => c.overrideAttrs);
    if (attrsChoice?.overrideAttrs) {
      Object.assign(params, attrsChoice.overrideAttrs);
    }

    // Acabamentos: quando o usuário selecionar acabamentos, usar somente os escolhidos
    const finishChoices = choices.filter(c => c.finishId);
    if (finishChoices.length > 0) {
      overrides.disableProductFinishes = true;
      overrides.includeFinishIds = finishChoices.map(c => c.finishId);
      overrides.additionalFinishes = finishChoices.map(c => ({
        finishId: c.finishId,
        qtyPerUnit: c.finishQtyPerUnit || 1,
      }));
    }

    // Calcular ajustes de preço das escolhas
    let priceAdjustment = 0;
    let priceFixed = 0;
    
    choices.forEach(choice => {
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