import { PrismaClient, RoundingStrategy, PricingStrategy } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⚙️ Inicializando Configuração Global...\n");

  const config = await prisma.configGlobal.upsert({
    where: { id: 1 },
    update: {
      // Não atualiza se já existir - apenas cria se não existir
    },
    create: {
      id: 1,
      marginDefault: "0.30",        // 30% de margem padrão
      markupOperational: "0.20",    // 20% de markup operacional
      roundingStep: "0.05",         // Arredondamento em múltiplos de 5 centavos
      lossFactor: "0.03",           // 3% de fator de perda
      printingHourCost: "60.00",     // €60/hora para impressão
      vatPercent: "0.23",            // 23% de IVA
      setupTimeMin: 15,              // 15 minutos de setup padrão
      roundingStrategy: RoundingStrategy.PER_STEP,
      pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
    },
  });

  console.log("✅ Configuração Global criada/atualizada:");
  console.log(`  - Margem padrão: ${(Number(config.marginDefault) * 100).toFixed(2)}%`);
  console.log(`  - Markup operacional: ${(Number(config.markupOperational) * 100).toFixed(2)}%`);
  console.log(`  - Degrau de arredondamento: ${config.roundingStep || "Não configurado"}`);
  console.log(`  - Fator de perda: ${config.lossFactor ? (Number(config.lossFactor) * 100).toFixed(2) + "%" : "Não configurado"}`);
  console.log(`  - IVA: ${config.vatPercent ? (Number(config.vatPercent) * 100).toFixed(2) + "%" : "Não configurado"}`);
  console.log(`  - Custo por hora impressão: ${config.printingHourCost || "Não configurado"} €`);
  console.log();
  console.log("🏁 Concluído!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

