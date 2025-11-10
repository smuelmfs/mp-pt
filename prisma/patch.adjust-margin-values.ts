import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Ajusta valores de margens baseado na análise detalhada da planilha
 */

async function main() {
  console.log("🔧 Ajustando Valores de Margens...\n");

  // 1. Ajustar margem base de ENVELOPES DL
  console.log("📮 1. Ajustando ENVELOPES DL...");
  const envelopeProduct = await prisma.product.findFirst({
    where: {
      name: { contains: "ENVELOPE", mode: "insensitive" },
      name: { contains: "DL", mode: "insensitive" }
    }
  });

  if (envelopeProduct) {
    // Baseado na análise: margem mais comum é 3%, não 2%
    const existingRule = await prisma.marginRule.findFirst({
      where: { scope: "PRODUCT", productId: envelopeProduct.id, active: true }
    });

    if (existingRule) {
      if (Number(existingRule.margin) !== 0.03) {
        await prisma.marginRule.update({
          where: { id: existingRule.id },
          data: { margin: "0.03" } // 3% base
        });
        console.log(`  ✅ Margem base atualizada: 3%`);
      } else {
        console.log(`  ℹ️  Margem base já está correta: 3%`);
      }
    }

    // Ajustar margens dinâmicas
    // Qtd >= 50: manter +1% (total 4%)
    // Qtd >= 200: ajustar para +17% (total 20%, que é o valor da planilha)
    const dynamicRules = await prisma.marginRuleDynamic.findMany({
      where: {
        scope: "PRODUCT",
        productId: envelopeProduct.id,
        active: true
      }
    });

    for (const rule of dynamicRules) {
      if (rule.minQuantity === 200 && Number(rule.adjustPercent) !== 0.17) {
        await prisma.marginRuleDynamic.update({
          where: { id: rule.id },
          data: { adjustPercent: "0.17" } // +17% para qtd >= 200
        });
        console.log(`  ✅ Ajuste Qtd >= 200 atualizado: +17%`);
      } else if (rule.minQuantity === 50 && Number(rule.adjustPercent) !== 0.01) {
        await prisma.marginRuleDynamic.update({
          where: { id: rule.id },
          data: { adjustPercent: "0.01" } // +1% para qtd >= 50
        });
        console.log(`  ✅ Ajuste Qtd >= 50 atualizado: +1%`);
      }
    }
  } else {
    console.log("  ⚠️  Produto ENVELOPES DL não encontrado");
  }

  // 2. Verificar e ajustar margens de categoria se necessário
  console.log("\n📁 2. Verificando margens de categoria...");
  
  const categories = await prisma.productCategory.findMany();
  const expectedMargins: Record<string, number> = {
    "Papelaria": 0.30,
    "Pastas A4": 0.30,
    "Grande Formato — Flex/Postes/Tendas": 0.40,
    "Placas rígidas": 0.30,
    "Cartões PVC": 0.04,
    "Têxteis Personalizados": 0.30,
  };

  for (const category of categories) {
    const expected = expectedMargins[category.name];
    if (!expected) continue;

    const existing = await prisma.marginRule.findFirst({
      where: {
        scope: "CATEGORY",
        categoryId: category.id,
        active: true
      }
    });

    if (existing) {
      if (Number(existing.margin) !== expected) {
        await prisma.marginRule.update({
          where: { id: existing.id },
          data: { margin: expected.toFixed(4) }
        });
        console.log(`  ✅ ${category.name}: ${(expected * 100).toFixed(0)}% (atualizada)`);
      }
    } else {
      await prisma.marginRule.create({
        data: {
          scope: "CATEGORY",
          categoryId: category.id,
          margin: expected.toFixed(4),
          active: true
        }
      });
      console.log(`  ✅ ${category.name}: ${(expected * 100).toFixed(0)}% (criada)`);
    }
  }

  // 3. Verificar margem global
  console.log("\n🌍 3. Verificando margem global...");
  const globalMargin = await prisma.marginRule.findFirst({
    where: { scope: "GLOBAL", active: true }
  });

  if (globalMargin) {
    if (Number(globalMargin.margin) !== 0.30) {
      await prisma.marginRule.update({
        where: { id: globalMargin.id },
        data: { margin: "0.30" }
      });
      console.log(`  ✅ Margem global atualizada: 30%`);
    } else {
      console.log(`  ℹ️  Margem global já está correta: 30%`);
    }
  } else {
    await prisma.marginRule.create({
      data: {
        scope: "GLOBAL",
        margin: "0.30",
        active: true
      }
    });
    console.log(`  ✅ Margem global criada: 30%`);
  }

  // 4. Revisar margens dinâmicas - remover ajustes muito agressivos
  console.log("\n🔄 4. Revisando margens dinâmicas...");
  const allDynamic = await prisma.marginRuleDynamic.findMany({
    where: { active: true }
  });

  let removed = 0;
  for (const rule of allDynamic) {
    const adjust = Number(rule.adjustPercent);
    // Remover ajustes muito agressivos (> 20% ou < -20%)
    if (Math.abs(adjust) > 0.20) {
      await prisma.marginRuleDynamic.update({
        where: { id: rule.id },
        data: { active: false }
      });
      removed++;
      console.log(`  🗑️  Removida margem dinâmica muito agressiva: ${(adjust * 100).toFixed(0)}%`);
    }
  }

  if (removed === 0) {
    console.log(`  ℹ️  Nenhuma margem dinâmica muito agressiva encontrada`);
  }

  console.log("\n✅ Ajustes concluídos!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

