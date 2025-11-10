import { prisma } from "../lib/prisma";
import { Unit } from "@prisma/client";

/**
 * Script para corrigir problemas encontrados na validação
 */

async function fixFlexProducts() {
  console.log("🔧 Corrigindo produtos FLEX...\n");

  // Buscar todos os produtos Flex
  const flexProducts = await prisma.product.findMany({
    where: {
      name: { startsWith: "Flex", mode: "insensitive" }
    },
    include: {
      materials: true
    }
  });

  console.log(`📋 Encontrados ${flexProducts.length} produtos Flex\n`);

  // Buscar ou criar material Vinil FLEX BRANCO
  let flexMaterial = await prisma.material.findFirst({
    where: {
      name: { contains: "FLEX BRANCO", mode: "insensitive" },
      isCurrent: true
    }
  });

  if (!flexMaterial) {
    // Criar material se não existir
    flexMaterial = await prisma.material.create({
      data: {
        name: "Vinil FLEX BRANCO",
        type: "vinil",
        unit: Unit.M2,
        unitCost: "1.1500", // Custo padrão, será atualizado por produto
        active: true,
        isCurrent: true
      }
    });
    console.log(`✅ Material criado: ${flexMaterial.name} (id: ${flexMaterial.id})\n`);
  }

  let fixed = 0;
  let suggestedCreated = 0;

  for (const product of flexProducts) {
    const updates: any = {};

    // 1. Associar material se não tiver
    if (product.materials.length === 0) {
      const areaM2 = ((product.widthMm || 0) * (product.heightMm || 0)) / 1e6;
      const qtyPerUnit = areaM2 > 0 ? areaM2.toFixed(4) : "1.0000";

      await prisma.productMaterial.create({
        data: {
          productId: product.id,
          materialId: flexMaterial.id,
          qtyPerUnit: qtyPerUnit,
          wasteFactor: "0.0000"
        }
      });
      console.log(`  ✅ Material associado: ${product.name}`);
      fixed++;
    }

    // 2. Adicionar quantidades sugeridas se não tiver
    const existingQuantities = await prisma.productSuggestedQuantity.findMany({
      where: { productId: product.id }
    });

    if (existingQuantities.length === 0) {
      const quantities = [1, 5, 10, 25, 50, 100];
      for (let i = 0; i < quantities.length; i++) {
        await prisma.productSuggestedQuantity.create({
          data: {
            productId: product.id,
            quantity: quantities[i],
            order: i
          }
        });
      }
      console.log(`  ✅ Quantidades sugeridas adicionadas: ${product.name}`);
      suggestedCreated += quantities.length;
    }

    // 3. Adicionar dimensões se não tiver
    if (!product.widthMm || !product.heightMm) {
      // Tentar extrair das dimensões do nome
      const dimMatch = product.name.match(/(\d+)x(\d+)/i);
      if (dimMatch) {
        updates.widthMm = Number(dimMatch[1]) * 100; // cm para mm
        updates.heightMm = Number(dimMatch[2]) * 100;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: updates
      });
      console.log(`  ✅ Dimensões atualizadas: ${product.name}`);
    }
  }

  console.log(`\n✅ Flex corrigido: ${fixed} produtos com materiais, ${suggestedCreated} quantidades criadas\n`);
}

async function fixBusinessCards() {
  console.log("🔧 Corrigindo Cartões de Visita...\n");

  // Buscar material de papel padrão para cartões
  let paperMaterial = await prisma.material.findFirst({
    where: {
      name: { contains: "Condat Gloss", mode: "insensitive" },
      type: "papel",
      isCurrent: true
    }
  });

  if (!paperMaterial) {
    // Usar qualquer papel disponível
    paperMaterial = await prisma.material.findFirst({
      where: {
        type: "papel",
        isCurrent: true,
        active: true
      }
    });
  }

  if (!paperMaterial) {
    console.log("⚠️ Nenhum material de papel encontrado. Pulando associação de materiais.\n");
    return;
  }

  const businessCards = await prisma.product.findMany({
    where: {
      name: { contains: "Cartão de Visita", mode: "insensitive" }
    },
    include: {
      materials: true
    }
  });

  console.log(`📋 Encontrados ${businessCards.length} cartões de visita\n`);

  let fixed = 0;

  for (const product of businessCards) {
    if (product.materials.length === 0) {
      // Área de um cartão de visita padrão (85x55mm) em m²
      const areaM2 = ((product.widthMm || 85) * (product.heightMm || 55)) / 1e6;
      const qtyPerUnit = areaM2.toFixed(4);

      await prisma.productMaterial.create({
        data: {
          productId: product.id,
          materialId: paperMaterial.id,
          qtyPerUnit: qtyPerUnit,
          wasteFactor: "0.1000" // 10% de desperdício padrão
        }
      });
      console.log(`  ✅ Material associado: ${product.name}`);
      fixed++;
    }

    // Adicionar dimensões se não tiver
    if (!product.widthMm || !product.heightMm) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          widthMm: 85,
          heightMm: 55
        }
      });
      console.log(`  ✅ Dimensões adicionadas: ${product.name}`);
    }
  }

  console.log(`\n✅ Cartões de Visita corrigidos: ${fixed} produtos com materiais\n`);
}

async function fixEnvelopes() {
  console.log("🔧 Corrigindo Envelopes...\n");

  const envelopes = await prisma.product.findMany({
    where: {
      name: { startsWith: "Envelope", mode: "insensitive" }
    }
  });

  console.log(`📋 Encontrados ${envelopes.length} envelopes\n`);

  let fixed = 0;

  for (const product of envelopes) {
    // Adicionar dimensões padrão para envelopes DL
    if (!product.widthMm || !product.heightMm) {
      let width = 110; // DL padrão
      let height = 220;

      if (product.name.includes("DL 90")) {
        width = 110;
        height = 220;
      } else if (product.name.includes("DL 120")) {
        width = 120;
        height = 235;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          widthMm: width,
          heightMm: height
        }
      });
      console.log(`  ✅ Dimensões adicionadas: ${product.name} (${width}x${height}mm)`);
      fixed++;
    }
  }

  console.log(`\n✅ Envelopes corrigidos: ${fixed} produtos com dimensões\n`);
}

async function main() {
  console.log("🔧 Corrigindo Produtos Importados\n");
  console.log("=".repeat(120));

  try {
    await fixFlexProducts();
    await fixBusinessCards();
    await fixEnvelopes();

    console.log("=".repeat(120));
    console.log("\n✅ Correções concluídas!\n");
    console.log("Execute `npm run validate:products` para verificar novamente.\n");
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

