import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Consolida TODAS as duplicatas de clientes
 */

// Mapeamento: manter o nome em MAIÚSCULAS quando possível, ou o mais completo
const DUPLICATES: Record<string, string> = {
  "Bruno": "BRUNO",
  "Pianos": "PIANOS",
  "RIVERBUILD": "RIVER BUILD",
  "Verdasca": "VERDASCA",
  "artma": "ARTMA",
  "digiwest": "DIGIWEST",
  "Silaco": "SILACO",
  "fet": "FET",
  "missal": "MISSAL",
  "soudias": "SOUDIAS",
  "pineforest": "PINEFOREST",
  "cartaz simao": "simao",
  "cliente wmg": "WMG",
  "concurso wmg": "WMG",
  "concurso laminam": "LAMINAM",
  "CV especial": "CV especial", // manter
  "CV stockled": "CV stockled", // manter
  "CV MARTO e OLIVEIRA": "CV MARTO e OLIVEIRA", // manter
  "Triptico stockled": "stockled",
  "Triptico stockled 2025": "stockled",
  "Festas pederneira": "festas bairro",
  "Festas pederneira": "festas bairro"
};

async function main() {
  console.log("🔄 Consolidando TODAS as duplicatas de clientes...\n");

  let merged = 0;
  const processed = new Set<number>();

  for (const [duplicate, keep] of Object.entries(DUPLICATES)) {
    // Buscar todas as ocorrências do duplicado
    const duplicates = await prisma.customer.findMany({
      where: {
        name: { equals: duplicate, mode: "insensitive" },
        isActive: true
      },
      include: {
        _count: {
          select: {
            materialPrices: true,
            printingPrices: true,
            finishPrices: true
          }
        }
      }
    });

    // Buscar o cliente principal
    const keepCustomer = await prisma.customer.findFirst({
      where: {
        name: { equals: keep, mode: "insensitive" },
        isActive: true
      }
    });

    if (!keepCustomer) {
      // Se não existe, renomear o primeiro duplicado
      if (duplicates.length > 0 && !processed.has(duplicates[0].id)) {
        await prisma.customer.update({
          where: { id: duplicates[0].id },
          data: { name: keep }
        });
        console.log(`  ✅ Renomeado: ${duplicates[0].name} → ${keep}`);
        processed.add(duplicates[0].id);

        // Consolidar os outros
        for (let i = 1; i < duplicates.length; i++) {
          const dup = duplicates[i];
          if (processed.has(dup.id)) continue;

          // Mover preços
          if (dup._count.materialPrices > 0) {
            await prisma.materialCustomerPrice.updateMany({
              where: { customerId: dup.id },
              data: { customerId: duplicates[0].id }
            });
          }
          if (dup._count.printingPrices > 0) {
            await prisma.printingCustomerPrice.updateMany({
              where: { customerId: dup.id },
              data: { customerId: duplicates[0].id }
            });
          }
          if (dup._count.finishPrices > 0) {
            await prisma.finishCustomerPrice.updateMany({
              where: { customerId: dup.id },
              data: { customerId: duplicates[0].id }
            });
          }

          await prisma.customer.delete({ where: { id: dup.id } });
          merged++;
          console.log(`  ✅ Consolidado: ${dup.name} → ${keep}`);
        }
      }
    } else {
      // Consolidar todos os duplicados para o principal
      for (const dup of duplicates) {
        if (dup.id === keepCustomer.id || processed.has(dup.id)) continue;

        // Mover preços
        if (dup._count.materialPrices > 0) {
          await prisma.materialCustomerPrice.updateMany({
            where: { customerId: dup.id },
            data: { customerId: keepCustomer.id }
          });
        }
        if (dup._count.printingPrices > 0) {
          await prisma.printingCustomerPrice.updateMany({
            where: { customerId: dup.id },
            data: { customerId: keepCustomer.id }
          });
        }
        if (dup._count.finishPrices > 0) {
          await prisma.finishCustomerPrice.updateMany({
            where: { customerId: dup.id },
            data: { customerId: keepCustomer.id }
          });
        }

        await prisma.customer.delete({ where: { id: dup.id } });
        merged++;
        console.log(`  ✅ Consolidado: ${dup.name} → ${keepCustomer.name}`);
      }
    }
  }

  console.log(`\n${"=".repeat(120)}`);
  console.log(`✅ RESUMO:`);
  console.log(`  - Consolidados: ${merged}`);
  console.log("=".repeat(120));

  // Contar total
  const total = await prisma.customer.count({ where: { isActive: true } });
  console.log(`\n📊 Total de clientes ativos: ${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

