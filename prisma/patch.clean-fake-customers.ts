import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Remove "clientes" que na verdade são produtos/impressões/acabamentos
 * e consolida duplicatas
 */

const FAKE_CUSTOMERS = [
  "CARTAZ A3 / SRA3 - FRENTE",
  "CARTAZ A4 - FRENTE",
  "FLYER A4 - FRENTE / VERSO",
  "FLYER A5 - FRENTE",
  "FLYER A5 - FRENTE / VERSO",
  "FLYER A6 - FRENTE",
  "FLYER A6 - FRENTE / VERSO",
  "PLASTIFICAÇÃO",
  "PLASTIFICAÇÃO + FOIL 1 FACE",
  "PLASTIFICAÇÃO + FOIL 1 FACE SILACO",
  "PLASTIFICAÇÃO + FOIL 2 FACES",
  "cartaz a2",
  "cartaz a3",
  "urna acrilico",
  "SIMPLES" // também é tipo de produto, não cliente
];

// Duplicatas para consolidar (manter o primeiro, remover os outros)
const DUPLICATES: Record<string, string> = {
  "RIVERBUILD": "RIVER BUILD",
  "Bruno": "BRUNO",
  "Pianos": "PIANOS",
  "Verdasca": "VERDASCA",
  "artma": "ARTMA",
  "digiwest": "DIGIWEST",
  "Silaco": "SILACO",
  "pineforest": "PINEFOREST",
  "fet": "FET",
  "missal": "MISSAL",
  "soudias": "SOUDIAS"
};

async function main() {
  console.log("🧹 Limpando clientes falsos e consolidando duplicatas...\n");

  let deleted = 0;
  let merged = 0;

  // 1. Remover clientes falsos
  for (const fakeName of FAKE_CUSTOMERS) {
    const fake = await prisma.customer.findFirst({
      where: {
        name: { equals: fakeName, mode: "insensitive" }
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

    if (fake) {
      // Verificar se tem preços associados
      const hasPrices = fake._count.materialPrices > 0 || 
                       fake._count.printingPrices > 0 || 
                       fake._count.finishPrices > 0;

      if (hasPrices) {
        console.log(`  ⚠️  ${fake.name} tem preços associados, não removido`);
      } else {
        await prisma.customer.delete({ where: { id: fake.id } });
        deleted++;
        console.log(`  ✅ Removido: ${fake.name}`);
      }
    }
  }

  // 2. Consolidar duplicatas
  for (const [duplicate, keep] of Object.entries(DUPLICATES)) {
    const dup = await prisma.customer.findFirst({
      where: {
        name: { equals: duplicate, mode: "insensitive" }
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

    const keepCustomer = await prisma.customer.findFirst({
      where: {
        name: { equals: keep, mode: "insensitive" }
      }
    });

    if (dup && keepCustomer) {
      // Mover preços do duplicado para o principal
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

  console.log(`\n${"=".repeat(120)}`);
  console.log(`✅ RESUMO:`);
  console.log(`  - Removidos (falsos): ${deleted}`);
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

