import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Preços baseados em dados extraídos e preços de clientes
const DEFAULT_PRICES: Record<string, number> = {
  "Tela 85×200 – Leiripantone": 35.00,
  "Tela / lona 85×200 – NHM": 30.00,
  "Impressão e Acabamento – Publifast": 32.39,
  "Impressão NHM – Peça 1": 12.00,
  "Impressão NHM – Peça 2": 60.00,
  "Impressão NHM – Balcão Panel Track": 45.00,
  "FLEX_M2": 2.50, // Preço médio baseado em preços de clientes
  "PLANO_M2": 15.00, // Preço estimado para UV plano
  "PVC CMYK F/V": 0.16, // Preço padrão para PVC digital
};

async function main() {
  console.log("=".repeat(120));
  console.log("🔧 Corrigindo Impressões sem Preço");
  console.log("=".repeat(120));
  console.log();

  const printings = await prisma.printing.findMany({
    where: { isCurrent: true }
  });

  const withoutPrice = printings.filter(p => !p.unitPrice || Number(p.unitPrice) === 0);

  console.log(`📋 Total de impressões: ${printings.length}`);
  console.log(`⚠️  Sem preço ou preço zero: ${withoutPrice.length}`);
  console.log();

  let updated = 0;
  let skipped = 0;

  for (const printing of withoutPrice) {
    const name = printing.formatLabel || printing.technology;
    
    // Tentar encontrar preço padrão
    let price: number | null = null;
    
    // 1. Buscar em DEFAULT_PRICES por nome exato ou parcial
    for (const [key, value] of Object.entries(DEFAULT_PRICES)) {
      if (printing.formatLabel && printing.formatLabel.includes(key.split(" –")[0])) {
        price = value;
        break;
      }
      if (name && name.includes(key.split(" –")[0])) {
        price = value;
        break;
      }
    }

    // 2. Se não encontrou, buscar preço médio de clientes
    if (!price) {
      const customerPrices = await prisma.printingCustomerPrice.findMany({
        where: {
          printingId: printing.id,
          isCurrent: true
        },
        select: { unitPrice: true }
      });

      if (customerPrices.length > 0) {
        const prices = customerPrices.map(cp => Number(cp.unitPrice));
        price = prices.reduce((a, b) => a + b, 0) / prices.length;
        console.log(`  📊 ${name}: Usando preço médio de clientes (${customerPrices.length} clientes): €${price.toFixed(2)}`);
      }
    }

    // 3. Se ainda não encontrou, usar preço padrão baseado em tecnologia
    if (!price) {
      switch (printing.technology) {
        case "GRANDE_FORMATO":
          price = 30.00; // Preço médio estimado
          break;
        case "DIGITAL":
          price = 0.16; // Preço padrão digital
          break;
        case "UV":
          price = 15.00; // Preço estimado UV
          break;
        default:
          price = 10.00; // Preço genérico
      }
      console.log(`  ⚠️  ${name}: Usando preço padrão por tecnologia: €${price.toFixed(2)}`);
    }

    // Atualizar impressão
    if (price) {
      await prisma.printing.update({
        where: { id: printing.id },
        data: { unitPrice: price.toFixed(4) }
      });
      updated++;
      console.log(`  ✅ ${name}: Preço definido como €${price.toFixed(2)}`);
    } else {
      skipped++;
      console.log(`  ⚠️  ${name}: Não foi possível determinar preço`);
    }
    console.log();
  }

  console.log("=".repeat(120));
  console.log(`✅ RESUMO:`);
  console.log(`  - Atualizadas: ${updated}`);
  console.log(`  - Puladas: ${skipped}`);
  console.log("=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

