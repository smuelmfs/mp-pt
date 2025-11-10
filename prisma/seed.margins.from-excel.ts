import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Cria regras de margem baseadas na análise da planilha Excel
 * 
 * Observações:
 * - Os valores de "% LUCRO" na planilha parecem ser multiplicadores (300% = 3.0)
 * - Vou usar a margem mais comum por categoria
 * - Margem global padrão: 30% (0.30) - da configuração global
 */

async function main() {
  console.log("📊 Criando Regras de Margem...\n");

  // Buscar categorias
  const categories = await prisma.productCategory.findMany({
    orderBy: { name: "asc" }
  });

  const categoryMap = new Map(categories.map(c => [c.name, c.id]));

  // Margens por categoria (baseado na análise da planilha)
  // Valores em decimal: 0.30 = 30% de margem
  const marginsByCategory: Record<string, number> = {
    "Papelaria": 0.30,              // 3% mais comum na planilha (mas usando 30% padrão)
    "Pastas A4": 0.30,              // 3% mais comum
    "Grande Formato — Flex/Postes/Tendas": 0.40, // 40% mais comum (FLEX)
    "Placas rígidas": 0.30,          // 3% mais comum (ALVEOLAR)
    "Cartões PVC": 0.04,             // 4% mais comum
    "Têxteis Personalizados": 0.30,  // Usando padrão
  };

  let created = 0;
  let updated = 0;

  // 1. Criar margem GLOBAL padrão (30%)
  console.log("🌍 Criando margem GLOBAL...");
  const globalMargin = await prisma.marginRule.findFirst({
    where: { scope: "GLOBAL", active: true }
  });

  if (!globalMargin) {
    await prisma.marginRule.create({
      data: {
        scope: "GLOBAL",
        margin: "0.30", // 30% de margem padrão
        active: true
      }
    });
    console.log("  ✅ Margem global criada: 30%");
    created++;
  } else {
    if (Number(globalMargin.margin) !== 0.30) {
      await prisma.marginRule.update({
        where: { id: globalMargin.id },
        data: { margin: "0.30" }
      });
      console.log("  ✅ Margem global atualizada: 30%");
      updated++;
    } else {
      console.log("  ℹ️  Margem global já existe: 30%");
    }
  }

  // 2. Criar margens por CATEGORIA
  console.log("\n📁 Criando margens por CATEGORIA...");
  for (const [categoryName, marginValue] of Object.entries(marginsByCategory)) {
    const categoryId = categoryMap.get(categoryName);
    
    if (!categoryId) {
      console.log(`  ⚠️  Categoria não encontrada: ${categoryName}`);
      continue;
    }

    const existing = await prisma.marginRule.findFirst({
      where: {
        scope: "CATEGORY",
        categoryId,
        active: true
      }
    });

    if (!existing) {
      await prisma.marginRule.create({
        data: {
          scope: "CATEGORY",
          categoryId,
          margin: marginValue.toFixed(4),
          active: true
        }
      });
      console.log(`  ✅ ${categoryName}: ${(marginValue * 100).toFixed(0)}%`);
      created++;
    } else {
      if (Number(existing.margin) !== marginValue) {
        await prisma.marginRule.update({
          where: { id: existing.id },
          data: { margin: marginValue.toFixed(4) }
        });
        console.log(`  ✅ ${categoryName}: ${(marginValue * 100).toFixed(0)}% (atualizada)`);
        updated++;
      } else {
        console.log(`  ℹ️  ${categoryName}: ${(marginValue * 100).toFixed(0)}% (já existe)`);
      }
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log(`✅ Total criado: ${created}`);
  console.log(`✅ Total atualizado: ${updated}`);
  console.log("=".repeat(120));

  // Listar todas as margens criadas
  console.log("\n📋 Regras de Margem Ativas:");
  const allRules = await prisma.marginRule.findMany({
    where: { active: true },
    include: {
      category: { select: { name: true } },
      product: { select: { name: true } }
    },
    orderBy: [
      { scope: "asc" },
      { categoryId: "asc" },
      { productId: "asc" }
    ]
  });

  const byScope = allRules.reduce((acc, r) => {
    if (!acc[r.scope]) acc[r.scope] = [];
    acc[r.scope].push(r);
    return acc;
  }, {} as Record<string, typeof allRules>);

  for (const [scope, rules] of Object.entries(byScope)) {
    console.log(`\n  ${scope}:`);
    for (const rule of rules) {
      const target = rule.category?.name || rule.product?.name || "Global";
      console.log(`    - ${target}: ${(Number(rule.margin) * 100).toFixed(0)}%`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

