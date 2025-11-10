import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Ajusta os custos de Envelopes baseado na análise da planilha
 * 
 * Na planilha (linha 12):
 * - Custo Unit. Impressão: 0.12
 * - Custo Unit. Papel: 0.05
 * - Custo Total Prod. (50 unidades): 8.5
 * - Total Unitário: 0.68
 */

async function main() {
  console.log("🔧 Ajustando custos de Envelopes...\n");

  // 1. Verificar material "Envelope DL 90 Janela"
  // Na planilha: custo unitário do papel = 0.05 para 50 unidades
  // Mas o material está com custo 0.0000
  const envelopeJanela = await prisma.material.findFirst({
    where: {
      name: { contains: "Envelope DL 90 Janela", mode: "insensitive" }
    }
  });

  if (envelopeJanela) {
    // Custo unitário na planilha: 0.05 para 50 unidades
    // Mas isso pode variar por quantidade, então vou usar 0.05 como base
    await prisma.material.update({
      where: { id: envelopeJanela.id },
      data: { unitCost: "0.0500" }
    });
    console.log(`✅ Envelope DL 90 Janela: €0.05 por unidade (era €${Number(envelopeJanela.unitCost).toFixed(4)})`);
  }

  // 2. Verificar impressão "DL"
  // Na planilha: custo unitário impressão = 0.12
  const impressaoDL = await prisma.printing.findFirst({
    where: {
      formatLabel: { contains: "DL", mode: "insensitive" }
    }
  });

  if (impressaoDL) {
    // Verificar se o preço está correto
    const currentPrice = Number(impressaoDL.unitPrice || 0);
    if (currentPrice !== 0.12) {
      await prisma.printing.update({
        where: { id: impressaoDL.id },
        data: { unitPrice: "0.1200" }
      });
      console.log(`✅ Impressão DL: €0.12 por unidade (era €${currentPrice.toFixed(4)})`);
    } else {
      console.log(`ℹ️  Impressão DL: já está correta (€0.12)`);
    }
  }

  // 3. Verificar se a impressão está configurada corretamente
  // Na planilha, a impressão parece ser por unidade, não por m²
  // Nota: setupMode não existe no schema, a impressão é calculada por área ou peça baseado no unitPrice
  // Se unitPrice está correto (0.12), o cálculo deve estar correto

  console.log("\n✅ Ajustes concluídos!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

