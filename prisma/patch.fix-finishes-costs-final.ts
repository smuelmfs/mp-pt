import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Ajusta FINALMENTE os custos de acabamentos baseado na planilha
 */

async function main() {
  console.log("🔧 Ajustando custos de acabamentos (versão final)...\n");

  // 1. Plastificação 1 Face - deve ser €0.50 por unidade
  const plastificacoes = await prisma.finish.findMany({
    where: {
      name: { contains: "Plastificação", mode: "insensitive" },
      category: "LAMINACAO"
    }
  });

  for (const finish of plastificacoes) {
    const currentCost = Number(finish.baseCost);
    if (currentCost > 1.0) {
      await prisma.finish.update({
        where: { id: finish.id },
        data: { baseCost: "0.5000" }
      });
      console.log(`✅ ${finish.name}: €0.50 por unidade (era €${currentCost.toFixed(2)})`);
    }
  }

  // 2. Foil 1 Face - deve ser €1.00 por unidade (ou proporcional)
  const foils = await prisma.finish.findMany({
    where: {
      name: { contains: "Foil", mode: "insensitive" },
      category: "LAMINACAO"
    }
  });

  for (const finish of foils) {
    const currentCost = Number(finish.baseCost);
    if (currentCost > 2.0) {
      await prisma.finish.update({
        where: { id: finish.id },
        data: { baseCost: "1.0000" }
      });
      console.log(`✅ ${finish.name}: €1.00 por unidade (era €${currentCost.toFixed(2)})`);
    }
  }

  // 3. Verificar se Bolsa e Ferragem existem e têm custo correto
  const bolsa = await prisma.finish.findFirst({
    where: { name: { contains: "Bolsa", mode: "insensitive" } }
  });

  if (bolsa) {
    await prisma.finish.update({
      where: { id: bolsa.id },
      data: { baseCost: "0.5000" }
    });
    console.log(`✅ Bolsa: €0.50 por unidade`);
  } else {
    // Criar com tipo correto
    const finishTypes = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT unnest(enum_range(NULL::"FinishCalcType"))::text as name
    `.catch(() => []);
    
    // Tentar PER_UNIT que é o padrão
    try {
      await prisma.finish.create({
        data: {
          name: "Bolsa",
          category: "OUTROS",
          baseCost: "0.5000",
          calcType: "PER_UNIT",
          unit: "UNIT",
          active: true,
          isCurrent: true
        }
      });
      console.log(`✅ Criado acabamento "Bolsa": €0.50 por unidade`);
    } catch (e: any) {
      console.log(`⚠️  Erro ao criar Bolsa: ${e.message}`);
    }
  }

  const ferragem = await prisma.finish.findFirst({
    where: { name: { contains: "Ferragem", mode: "insensitive" } }
  });

  if (ferragem) {
    await prisma.finish.update({
      where: { id: ferragem.id },
      data: { baseCost: "0.5000" }
    });
    console.log(`✅ Ferragem: €0.50 por unidade`);
  } else {
    try {
      await prisma.finish.create({
        data: {
          name: "Ferragem",
          category: "OUTROS",
          baseCost: "0.5000",
          calcType: "PER_UNIT",
          unit: "UNIT",
          active: true,
          isCurrent: true
        }
      });
      console.log(`✅ Criado acabamento "Ferragem": €0.50 por unidade`);
    } catch (e: any) {
      console.log(`⚠️  Erro ao criar Ferragem: ${e.message}`);
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

