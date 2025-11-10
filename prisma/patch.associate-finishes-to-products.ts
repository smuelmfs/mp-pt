import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Associa acabamentos (Bolsa, Ferragem) aos produtos de Pastas A4
 */

async function main() {
  console.log("🔧 Associando acabamentos aos produtos de Pastas A4...\n");

  // Buscar acabamentos
  const bolsa = await prisma.finish.findFirst({
    where: { name: { contains: "Bolsa", mode: "insensitive" } }
  });

  const ferragem = await prisma.finish.findFirst({
    where: { name: { contains: "Ferragem", mode: "insensitive" } }
  });

  if (!bolsa || !ferragem) {
    console.log("❌ Acabamentos Bolsa ou Ferragem não encontrados");
    return;
  }

  // Buscar produtos de Pastas A4
  const pastasA4 = await prisma.product.findMany({
    where: {
      category: { name: { equals: "Pastas A4", mode: "insensitive" } }
    },
    include: {
      finishes: {
        include: { finish: true }
      }
    }
  });

  for (const product of pastasA4) {
    const hasBolsa = product.name.includes("Bolsa");
    const hasFerragem = product.name.includes("Ferragem");

    const currentFinishNames = product.finishes.map(pf => pf.finish.name);

    // Adicionar Bolsa se necessário
    if (hasBolsa && !currentFinishNames.some(n => n.includes("Bolsa"))) {
      await prisma.productFinish.create({
        data: {
          productId: product.id,
          finishId: bolsa.id,
          qtyPerUnit: "1.0000"
        }
      });
      console.log(`✅ ${product.name}: Adicionado acabamento "Bolsa"`);
    }

    // Adicionar Ferragem se necessário
    if (hasFerragem && !currentFinishNames.some(n => n.includes("Ferragem"))) {
      await prisma.productFinish.create({
        data: {
          productId: product.id,
          finishId: ferragem.id,
          qtyPerUnit: "1.0000"
        }
      });
      console.log(`✅ ${product.name}: Adicionado acabamento "Ferragem"`);
    }
  }

  console.log("\n✅ Associações concluídas!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

