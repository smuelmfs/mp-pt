import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Ajusta as margens dinâmicas criadas para valores mais precisos
 * baseado na análise detalhada da planilha
 */

async function main() {
  console.log("🔧 Ajustando Margens Dinâmicas...\n");

  // Remover margens dinâmicas incorretas de ENVELOPES
  const envelopeCategory = await prisma.productCategory.findFirst({
    where: { name: "Papelaria" }
  });

  if (envelopeCategory) {
    // Deletar margens dinâmicas existentes incorretas
    const incorrect = await prisma.marginRuleDynamic.findMany({
      where: {
        scope: "CATEGORY",
        categoryId: envelopeCategory.id
      }
    });

    for (const rule of incorrect) {
      await prisma.marginRuleDynamic.delete({
        where: { id: rule.id }
      });
      console.log(`  🗑️  Removida margem dinâmica incorreta (id: ${rule.id})`);
    }

    // Criar margens dinâmicas corretas para ENVELOPES
    // Baseado na análise: 3% padrão, 20% para algumas quantidades, 2% para outras
    // Vou criar regras mais conservadoras: manter 3% padrão e ajustar apenas quando necessário
    
    // Nota: As margens dinâmicas serão criadas manualmente se necessário
    // Por enquanto, manteremos a margem de categoria (30%) como padrão
    console.log(`  ℹ️  Margens dinâmicas de ENVELOPES serão criadas manualmente se necessário`);
  }

  // Verificar e ajustar margens de produtos específicos
  console.log("\n📦 Verificando margens por produto...");

  // Têxteis devem ter 40% (já está correto)
  const textiles = await prisma.product.findMany({
    where: {
      category: { name: "Têxteis Personalizados" }
    },
    include: {
      marginRules: {
        where: { active: true, scope: "PRODUCT" }
      }
    }
  });

  for (const product of textiles) {
    if (product.marginRules.length === 0) {
      await prisma.marginRule.create({
        data: {
          scope: "PRODUCT",
          productId: product.id,
          margin: "0.40",
          active: true
        }
      });
      console.log(`  ✅ ${product.name}: 40%`);
    } else {
      const rule = product.marginRules[0];
      if (Number(rule.margin) !== 0.40) {
        await prisma.marginRule.update({
          where: { id: rule.id },
          data: { margin: "0.40" }
        });
        console.log(`  ✅ ${product.name}: 40% (atualizada)`);
      }
    }
  }

  // Cartões PVC devem ter 4% (já está correto)
  const pvcProducts = await prisma.product.findMany({
    where: {
      category: { name: "Cartões PVC" }
    },
    include: {
      marginRules: {
        where: { active: true, scope: "PRODUCT" }
      }
    }
  });

  for (const product of pvcProducts) {
    if (product.marginRules.length === 0) {
      await prisma.marginRule.create({
        data: {
          scope: "PRODUCT",
          productId: product.id,
          margin: "0.04",
          active: true
        }
      });
      console.log(`  ✅ ${product.name}: 4%`);
    } else {
      const rule = product.marginRules[0];
      if (Number(rule.margin) !== 0.04) {
        await prisma.marginRule.update({
          where: { id: rule.id },
          data: { margin: "0.04" }
        });
        console.log(`  ✅ ${product.name}: 4% (atualizada)`);
      }
    }
  }

  console.log("\n✅ Ajustes concluídos!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

