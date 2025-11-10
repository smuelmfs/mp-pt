import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Cria margens dinâmicas baseadas na análise da planilha
 * 
 * Observações:
 * - Margens dinâmicas aplicam ajustes sobre a margem base
 * - Prioridade: menor número = aplica primeiro
 * - Ajustes podem ser positivos (aumento) ou negativos (desconto)
 */

async function main() {
  console.log("=".repeat(120));
  console.log("📊 Criando Margens Dinâmicas");
  console.log("=".repeat(120));
  console.log();

  // Buscar categorias
  const categories = await prisma.productCategory.findMany();
  const categoryMap = new Map(categories.map(c => [c.name, c.id]));

  // Buscar produtos específicos
  const products = await prisma.product.findMany({
    include: { category: { select: { name: true } } }
  });

  let created = 0;
  let skipped = 0;

  // 1. ENVELOPES DL - Margem dinâmica por quantidade
  console.log("📮 1. ENVELOPES DL...");
  const envelopeProduct = products.find(p => 
    p.name.toUpperCase().includes("ENVELOPE") && 
    p.name.toUpperCase().includes("DL")
  );

  if (envelopeProduct) {
    // Baseado na análise: margem base 2%, ajustes por quantidade
    // Qtd >= 50: +1% (total 3%)
    // Qtd >= 200: +18% (total 20%)
    
    // Verificar se já existe margem fixa
    const existingFixed = await prisma.marginRule.findFirst({
      where: { scope: "PRODUCT", productId: envelopeProduct.id, active: true }
    });

    if (!existingFixed) {
      // Criar margem base
      await prisma.marginRule.create({
        data: {
          scope: "PRODUCT",
          productId: envelopeProduct.id,
          margin: "0.02", // 2% base
          active: true
        }
      });
      console.log(`  ✅ Margem base criada: 2%`);
    }

    // Criar ajustes dinâmicos
    const adjustments = [
      { minQty: 50, adjustPercent: 0.01, priority: 90 }, // +1% para qtd >= 50
      { minQty: 200, adjustPercent: 0.18, priority: 80 }, // +18% para qtd >= 200
    ];

    for (const adj of adjustments) {
      const existing = await prisma.marginRuleDynamic.findFirst({
        where: {
          scope: "PRODUCT",
          productId: envelopeProduct.id,
          minQuantity: adj.minQty,
          active: true
        }
      });

      if (!existing) {
        await prisma.marginRuleDynamic.create({
          data: {
            scope: "PRODUCT",
            productId: envelopeProduct.id,
            minQuantity: adj.minQty,
            adjustPercent: adj.adjustPercent.toFixed(4),
            priority: adj.priority,
            active: true
          }
        });
        console.log(`  ✅ Ajuste: Qtd >= ${adj.minQty} → +${(adj.adjustPercent * 100).toFixed(0)}%`);
        created++;
      } else {
        skipped++;
      }
    }
  } else {
    console.log("  ⚠️  Produto ENVELOPES DL não encontrado");
  }

  // 2. PASTAS A4 - Margem dinâmica por quantidade (categoria)
  console.log("\n📁 2. PASTAS A4 (Categoria)...");
  const pastasCategoryId = categoryMap.get("Pastas A4");
  
  if (pastasCategoryId) {
    // Baseado na análise: margem base 3%, possíveis ajustes por quantidade
    // Vou criar ajustes conservadores baseados em quantidades maiores
    
    const adjustments = [
      { minQty: 100, adjustPercent: -0.01, priority: 90 }, // -1% para qtd >= 100
      { minQty: 250, adjustPercent: -0.02, priority: 80 }, // -2% para qtd >= 250
      { minQty: 500, adjustPercent: -0.03, priority: 70 }, // -3% para qtd >= 500
    ];

    for (const adj of adjustments) {
      const existing = await prisma.marginRuleDynamic.findFirst({
        where: {
          scope: "CATEGORY",
          categoryId: pastasCategoryId,
          minQuantity: adj.minQty,
          active: true
        }
      });

      if (!existing) {
        await prisma.marginRuleDynamic.create({
          data: {
            scope: "CATEGORY",
            categoryId: pastasCategoryId,
            minQuantity: adj.minQty,
            adjustPercent: adj.adjustPercent.toFixed(4),
            priority: adj.priority,
            active: true
          }
        });
        console.log(`  ✅ Ajuste: Qtd >= ${adj.minQty} → ${(adj.adjustPercent * 100).toFixed(0)}%`);
        created++;
      } else {
        skipped++;
      }
    }
  }

  // 3. ENVELOPES (Categoria Papelaria) - Ajustes por quantidade
  console.log("\n📮 3. ENVELOPES (Categoria Papelaria)...");
  const papelariaCategoryId = categoryMap.get("Papelaria");
  
  if (papelariaCategoryId) {
    // Baseado na análise: margem base 2-3%, ajustes por quantidade
    // Criar ajustes conservadores
    
    const adjustments = [
      { minQty: 100, adjustPercent: -0.01, priority: 90 }, // -1% para qtd >= 100
      { minQty: 500, adjustPercent: -0.02, priority: 80 }, // -2% para qtd >= 500
      { minQty: 1000, adjustPercent: -0.03, priority: 70 }, // -3% para qtd >= 1000
    ];

    for (const adj of adjustments) {
      const existing = await prisma.marginRuleDynamic.findFirst({
        where: {
          scope: "CATEGORY",
          categoryId: papelariaCategoryId,
          minQuantity: adj.minQty,
          active: true
        }
      });

      if (!existing) {
        await prisma.marginRuleDynamic.create({
          data: {
            scope: "CATEGORY",
            categoryId: papelariaCategoryId,
            minQuantity: adj.minQty,
            adjustPercent: adj.adjustPercent.toFixed(4),
            priority: adj.priority,
            active: true
          }
        });
        console.log(`  ✅ Ajuste: Qtd >= ${adj.minQty} → ${(adj.adjustPercent * 100).toFixed(0)}%`);
        created++;
      } else {
        skipped++;
      }
    }
  }

  // 4. Grande Formato - Ajustes por subtotal
  console.log("\n🖼️  4. Grande Formato (Ajustes por Subtotal)...");
  const grandeFormatoCategoryId = categoryMap.get("Grande Formato — Flex/Postes/Tendas");
  
  if (grandeFormatoCategoryId) {
    // Baseado na análise: margem base 40%, possíveis ajustes por valor
    // Criar ajustes conservadores para pedidos maiores
    
    const adjustments = [
      { minSubtotal: 100, adjustPercent: -0.02, priority: 90 }, // -2% para subtotal >= €100
      { minSubtotal: 500, adjustPercent: -0.05, priority: 80 }, // -5% para subtotal >= €500
      { minSubtotal: 1000, adjustPercent: -0.08, priority: 70 }, // -8% para subtotal >= €1000
    ];

    for (const adj of adjustments) {
      const existing = await prisma.marginRuleDynamic.findFirst({
        where: {
          scope: "CATEGORY",
          categoryId: grandeFormatoCategoryId,
          minSubtotal: adj.minSubtotal,
          active: true
        }
      });

      if (!existing) {
        await prisma.marginRuleDynamic.create({
          data: {
            scope: "CATEGORY",
            categoryId: grandeFormatoCategoryId,
            minSubtotal: adj.minSubtotal,
            adjustPercent: adj.adjustPercent.toFixed(4),
            priority: adj.priority,
            active: true
          }
        });
        console.log(`  ✅ Ajuste: Subtotal >= €${adj.minSubtotal} → ${(adj.adjustPercent * 100).toFixed(0)}%`);
        created++;
      } else {
        skipped++;
      }
    }
  }

  // 5. Placas rígidas - Ajustes por subtotal
  console.log("\n🔲 5. Placas rígidas (Ajustes por Subtotal)...");
  const placasCategoryId = categoryMap.get("Placas rígidas");
  
  if (placasCategoryId) {
    // Baseado na análise: margem base 30%, possíveis ajustes por valor
    // Criar ajustes conservadores
    
    const adjustments = [
      { minSubtotal: 200, adjustPercent: -0.02, priority: 90 }, // -2% para subtotal >= €200
      { minSubtotal: 500, adjustPercent: -0.05, priority: 80 }, // -5% para subtotal >= €500
      { minSubtotal: 1000, adjustPercent: -0.08, priority: 70 }, // -8% para subtotal >= €1000
    ];

    for (const adj of adjustments) {
      const existing = await prisma.marginRuleDynamic.findFirst({
        where: {
          scope: "CATEGORY",
          categoryId: placasCategoryId,
          minSubtotal: adj.minSubtotal,
          active: true
        }
      });

      if (!existing) {
        await prisma.marginRuleDynamic.create({
          data: {
            scope: "CATEGORY",
            categoryId: placasCategoryId,
            minSubtotal: adj.minSubtotal,
            adjustPercent: adj.adjustPercent.toFixed(4),
            priority: adj.priority,
            active: true
          }
        });
        console.log(`  ✅ Ajuste: Subtotal >= €${adj.minSubtotal} → ${(adj.adjustPercent * 100).toFixed(0)}%`);
        created++;
      } else {
        skipped++;
      }
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log(`✅ RESUMO:`);
  console.log(`  - Margens dinâmicas criadas: ${created}`);
  console.log(`  - Já existentes (puladas): ${skipped}`);
  console.log("=".repeat(120));

  // Listar todas as margens dinâmicas
  const allDynamic = await prisma.marginRuleDynamic.findMany({
    where: { active: true },
    include: {
      category: { select: { name: true } },
      product: { select: { name: true } }
    },
    orderBy: [{ priority: "asc" }]
  });

  if (allDynamic.length > 0) {
    console.log("\n📋 Regras de Margem DINÂMICA Ativas:");
    for (const rule of allDynamic) {
      const target = rule.category?.name || rule.product?.name || "Global";
      const conditions = [];
      if (rule.minQuantity) conditions.push(`Qtd >= ${rule.minQuantity}`);
      if (rule.minSubtotal) conditions.push(`Subtotal >= €${rule.minSubtotal}`);
      console.log(`  - ${target}: ${(Number(rule.adjustPercent) * 100).toFixed(0)}% ${conditions.length > 0 ? `(${conditions.join(", ")})` : ""} [Prioridade: ${rule.priority}]`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

