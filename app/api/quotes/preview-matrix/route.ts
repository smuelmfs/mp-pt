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
    
    // Aplicar variante de material se selecionada
    const materialChoice = choices.find(c => c.materialVariantId);
    if (materialChoice?.materialVariant) {
      overrides.materialVariantId = materialChoice.materialVariantId;
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

    // Aplicar acabamentos adicionais
    const finishChoices = choices.filter(c => c.finishId);
    if (finishChoices.length > 0) {
      overrides.additionalFinishes = finishChoices.map(c => ({
        finishId: c.finishId,
        qtyPerUnit: c.finishQtyPerUnit || 1
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