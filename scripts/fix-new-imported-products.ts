import { prisma } from "../lib/prisma";

/**
 * Script para corrigir problemas encontrados na validação dos novos produtos importados
 */

async function fixPastasA4() {
  console.log("🔧 Corrigindo Pastas A4...\n");

  const pastas = await prisma.product.findMany({
    where: {
      name: { startsWith: "Pasta A4", mode: "insensitive" }
    },
    include: {
      materials: true
    }
  });

  console.log(`📋 Encontradas ${pastas.length} pastas A4\n`);

  // Buscar material de papel padrão
  let paperMaterial = await prisma.material.findFirst({
    where: {
      name: { contains: "SRA3", mode: "insensitive" },
      type: "papel",
      isCurrent: true
    }
  });

  if (!paperMaterial) {
    paperMaterial = await prisma.material.findFirst({
      where: {
        name: { contains: "250g", mode: "insensitive" },
        type: "papel",
        isCurrent: true
      }
    });
  }

  if (!paperMaterial) {
    console.log("⚠️ Material de papel não encontrado. Pulando.\n");
    return;
  }

  let fixed = 0;

  for (const pasta of pastas) {
    const updates: any = {};

    // Adicionar material se não tiver
    if (pasta.materials.length === 0) {
      const areaM2 = ((pasta.widthMm || 210) * (pasta.heightMm || 297)) / 1e6;
      const qtyPerUnit = areaM2.toFixed(4);

      await prisma.productMaterial.create({
        data: {
          productId: pasta.id,
          materialId: paperMaterial.id,
          qtyPerUnit: qtyPerUnit,
          wasteFactor: "0.1000"
        }
      });
      console.log(`  ✅ Material associado: ${pasta.name}`);
      fixed++;
    }

    // Adicionar dimensões se não tiver
    if (!pasta.widthMm || !pasta.heightMm) {
      updates.widthMm = 210; // A4 width
      updates.heightMm = 297; // A4 height
    }

    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: pasta.id },
        data: updates
      });
      console.log(`  ✅ Dimensões adicionadas: ${pasta.name}`);
    }
  }

  console.log(`\n✅ Pastas A4 corrigidas: ${fixed} produtos com materiais\n`);
}

async function fixCartoesPVC() {
  console.log("🔧 Corrigindo Cartões PVC...\n");

  const cartoes = await prisma.product.findMany({
    where: {
      name: { contains: "Cartão PVC", mode: "insensitive" }
    },
    include: {
      suggestedQuantities: true
    }
  });

  console.log(`📋 Encontrados ${cartoes.length} cartões PVC\n`);

  let fixed = 0;

  for (const cartao of cartoes) {
    if (cartao.suggestedQuantities.length === 0) {
      const quantities = [25, 50, 100, 250, 500, 1000];
      for (let i = 0; i < quantities.length; i++) {
        await prisma.productSuggestedQuantity.create({
          data: {
            productId: cartao.id,
            quantity: quantities[i],
            order: i
          }
        });
      }
      console.log(`  ✅ Quantidades sugeridas adicionadas: ${cartao.name}`);
      fixed++;
    }
  }

  console.log(`\n✅ Cartões PVC corrigidos: ${fixed} produtos\n`);
}

async function fixAlveolar() {
  console.log("🔧 Corrigindo produtos Alveolar...\n");

  // Buscar ou criar impressão UV PLANO_M2
  let printing = await prisma.printing.findFirst({
    where: {
      technology: "UV",
      formatLabel: { contains: "PLANO_M2", mode: "insensitive" },
      isCurrent: true
    }
  });

  if (!printing) {
    // Criar impressão UV PLANO_M2 se não existir
    printing = await prisma.printing.create({
      data: {
        technology: "UV",
        formatLabel: "PLANO_M2",
        colors: null,
        sides: 1,
        unitPrice: "0.0000", // Preço será definido por cliente ou material
        active: true,
        isCurrent: true
      }
    });
    console.log(`  ✅ Impressão criada: ${printing.formatLabel} (id: ${printing.id})\n`);
  }

  const placas = await prisma.product.findMany({
    where: {
      name: { contains: "Placa Alveolar", mode: "insensitive" },
      printingId: null
    }
  });

  console.log(`📋 Encontradas ${placas.length} placas sem impressão\n`);

  let fixed = 0;

  for (const placa of placas) {
    await prisma.product.update({
      where: { id: placa.id },
      data: { printingId: printing.id }
    });
    console.log(`  ✅ Impressão associada: ${placa.name}`);
    fixed++;
  }

  console.log(`\n✅ Alveolar corrigido: ${fixed} produtos\n`);
}

async function fixTextiles() {
  console.log("🔧 Corrigindo produtos Têxteis...\n");

  const textiles = await prisma.product.findMany({
    where: {
      category: {
        name: "Têxteis Personalizados"
      }
    },
    include: {
      suggestedQuantities: true
    }
  });

  console.log(`📋 Encontrados ${textiles.length} produtos têxteis\n`);

  let fixed = 0;

  for (const textile of textiles) {
    const updates: any = {};

    // Adicionar quantidades sugeridas
    if (textile.suggestedQuantities.length === 0) {
      const quantities = [1, 5, 10, 25, 50, 100];
      for (let i = 0; i < quantities.length; i++) {
        await prisma.productSuggestedQuantity.create({
          data: {
            productId: textile.id,
            quantity: quantities[i],
            order: i
          }
        });
      }
      console.log(`  ✅ Quantidades sugeridas adicionadas: ${textile.name}`);
      fixed++;
    }

    // Adicionar dimensões padrão (têxteis não têm dimensões fixas, mas podemos deixar null ou valores padrão)
    // Para têxteis, dimensões não são críticas, então vamos deixar como está
  }

  console.log(`\n✅ Têxteis corrigidos: ${fixed} produtos\n`);
}

async function main() {
  console.log("🔧 Corrigindo Novos Produtos Importados\n");
  console.log("=".repeat(120));

  try {
    await fixPastasA4();
    await fixCartoesPVC();
    await fixAlveolar();
    await fixTextiles();

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

