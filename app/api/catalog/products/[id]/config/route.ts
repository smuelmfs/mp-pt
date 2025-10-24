import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getId(ctx: { params: any }) {
  const p = typeof ctx.params?.then === "function" ? await ctx.params : ctx.params;
  const nid = Number(p?.id);
  return Number.isFinite(nid) ? nid : NaN;
}

export async function GET(_req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  try {
    // Buscar o produto com materiais e acabamentos configurados
    const product = await prisma.product.findUnique({
      where: { id: productId, active: true },
      include: {
        category: true,
        printing: true,
        materials: {
          include: {
            material: true,
            variant: true
          }
        },
        finishes: {
          include: {
            finish: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    // Buscar tiragens sugeridas
    const suggestedQuantities = await (prisma as any).productSuggestedQuantity.findMany({
      where: { productId, active: true },
      orderBy: { order: "asc" }
    });

    // Criar grupos de opções baseados nos materiais e acabamentos configurados
    const optionGroups = [];

    // Grupo de Materiais (se houver materiais configurados)
    if (product.materials && product.materials.length > 0) {
      optionGroups.push({
        id: 'materials',
        name: 'Material',
        kind: 'RADIO',
        required: true,
        multiSelect: false,
        hasMultipleOptions: product.materials.length > 1, // Marcar se há múltiplas opções
        choices: product.materials.map((pm: any) => ({
          id: `material_${pm.id}`,
          name: pm.variant ? `${pm.material.name} - ${pm.variant.label}` : pm.material.name,
          description: `Material: ${pm.material.name}${pm.variant ? ` (${pm.variant.label})` : ''}`,
          materialVariant: {
            id: pm.variant?.id || pm.material.id,
            label: pm.variant?.label || pm.material.name,
            material: {
              id: pm.material.id,
              name: pm.material.name,
              type: pm.material.type
            }
          },
          qtyPerUnit: pm.qtyPerUnit,
          wasteFactor: pm.wasteFactor
        }))
      });
    }

    // Grupo de Acabamentos (se houver acabamentos configurados)
    if (product.finishes && product.finishes.length > 0) {
      optionGroups.push({
        id: 'finishes',
        name: 'Acabamentos',
        kind: 'SELECT',
        required: false,
        multiSelect: true,
        hasMultipleOptions: product.finishes.length > 1, // Marcar se há múltiplas opções
        choices: product.finishes.map((pf: any) => ({
          id: `finish_${pf.id}`,
          name: pf.finish.name,
          description: `Acabamento: ${pf.finish.name}`,
          finish: {
            id: pf.finish.id,
            name: pf.finish.name,
            qtyPerUnit: pf.qtyPerUnit || pf.finish.qtyPerUnit,
            calcType: pf.calcTypeOverride || pf.finish.calcType,
            costOverride: pf.costOverride
          }
        }))
      });
    }

    // Estruturar os dados para o configurador
    const config = {
      product: {
        id: product.id,
        name: product.name,
        category: product.category.name,
        widthMm: product.widthMm,
        heightMm: product.heightMm,
        minOrderQty: product.minOrderQty,
        minOrderValue: product.minOrderValue
      },
      optionGroups,
      quantityPresets: suggestedQuantities.map((qty: any) => ({
        id: qty.id,
        quantity: qty.quantity,
        label: qty.label
      }))
    };

    return NextResponse.json(config);

  } catch (error) {
    console.error('Erro ao carregar configuração do produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}