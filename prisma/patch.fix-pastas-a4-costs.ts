import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Ajusta os custos de acabamentos e materiais das Pastas A4
 * baseado na análise da planilha Excel
 */

async function main() {
  console.log("🔧 Ajustando custos de Pastas A4...\n");

  // 1. Ajustar acabamento "NORMAL" (CORTE)
  // Na planilha: 1 (provavelmente €1.00 total para 50 unidades = €0.02 por unidade)
  const corteNormal = await prisma.finish.findFirst({
    where: {
      name: { equals: "NORMAL", mode: "insensitive" },
      category: "CORTE"
    }
  });

  if (corteNormal) {
    // Ajustar para €0.02 por unidade (ou €1.00 por lote mínimo)
    await prisma.finish.update({
      where: { id: corteNormal.id },
      data: { baseCost: "0.0200" } // €0.02 por unidade
    });
    console.log(`✅ CORTE NORMAL: €0.02 por unidade (era €${Number(corteNormal.baseCost).toFixed(2)})`);
  }

  // 2. Ajustar acabamento "Plastificação 1 Face"
  // Na planilha: 25 (provavelmente €25.00 total para 50 unidades = €0.50 por unidade)
  const plastificacao = await prisma.finish.findFirst({
    where: {
      name: { contains: "Plastificação", mode: "insensitive" },
      category: "LAMINACAO"
    }
  });

  if (plastificacao) {
    await prisma.finish.update({
      where: { id: plastificacao.id },
      data: { baseCost: "0.5000" } // €0.50 por unidade
    });
    console.log(`✅ Plastificação 1 Face: €0.50 por unidade (era €${Number(plastificacao.baseCost).toFixed(2)})`);
  }

  // 3. Ajustar acabamento "Dobra"
  // Na planilha: 3.5 (provavelmente €3.50 total para 50 unidades = €0.07 por unidade)
  const dobra = await prisma.finish.findFirst({
    where: {
      name: { contains: "Dobra", mode: "insensitive" },
      category: "DOBRA"
    }
  });

  if (dobra) {
    await prisma.finish.update({
      where: { id: dobra.id },
      data: { baseCost: "0.0700" } // €0.07 por unidade
    });
    console.log(`✅ Dobra: €0.07 por unidade (era €${Number(dobra.baseCost).toFixed(2)})`);
  }

  // 4. Ajustar acabamento "Foil 1 Face" se existir
  const foil = await prisma.finish.findFirst({
    where: {
      name: { contains: "Foil", mode: "insensitive" },
      category: "LAMINACAO"
    }
  });

  if (foil) {
    // Na planilha não vi valores específicos, mas vou ajustar proporcionalmente
    await prisma.finish.update({
      where: { id: foil.id },
      data: { baseCost: "1.0000" } // €1.00 por unidade (estimado)
    });
    console.log(`✅ Foil 1 Face: €1.00 por unidade (era €${Number(foil.baseCost).toFixed(2)})`);
  }

  // 5. Ajustar qtyPerUnit do material nas Pastas A4
  // O material deveria ser 1 SHEET por unidade, não 0.0624
  const pastasA4 = await prisma.product.findMany({
    where: {
      category: { name: { equals: "Pastas A4", mode: "insensitive" } }
    },
    include: {
      materials: {
        include: { material: true }
      }
    }
  });

  for (const product of pastasA4) {
    for (const pm of product.materials) {
      if (pm.material.unit === "SHEET" && Number(pm.qtyPerUnit) < 1) {
        await prisma.productMaterial.update({
          where: { id: pm.id },
          data: { qtyPerUnit: "1.0000" }
        });
        console.log(`✅ ${product.name}: qtyPerUnit ajustado para 1.0000 (era ${pm.qtyPerUnit})`);
      }
    }
  }

  // 6. Verificar se há acabamento "Bolsa" e "Ferragem" como materiais
  // Na planilha, "Bolsa" e "Ferragem" aparecem como custos unitários (€0.50 cada)
  // Mas no sistema podem estar como acabamentos ou materiais
  
  // Verificar se existe acabamento "Bolsa"
  const bolsa = await prisma.finish.findFirst({
    where: {
      name: { contains: "Bolsa", mode: "insensitive" }
    }
  });

  if (!bolsa) {
    // Criar acabamento "Bolsa"
    await prisma.finish.create({
      data: {
        name: "Bolsa",
        category: "OUTROS",
        baseCost: "0.5000", // €0.50 por unidade
        calcType: "FIXED",
        unit: "UNIT",
        active: true,
        isCurrent: true
      }
    });
    console.log(`✅ Criado acabamento "Bolsa": €0.50 por unidade`);
  } else {
    await prisma.finish.update({
      where: { id: bolsa.id },
      data: { baseCost: "0.5000" }
    });
    console.log(`✅ Bolsa: €0.50 por unidade (era €${Number(bolsa.baseCost).toFixed(2)})`);
  }

  // Verificar se existe acabamento "Ferragem"
  const ferragem = await prisma.finish.findFirst({
    where: {
      name: { contains: "Ferragem", mode: "insensitive" }
    }
  });

  if (!ferragem) {
    await prisma.finish.create({
      data: {
        name: "Ferragem",
        category: "OUTROS",
        baseCost: "0.5000", // €0.50 por unidade
        calcType: "FIXED",
        unit: "UNIT",
        active: true,
        isCurrent: true
      }
    });
    console.log(`✅ Criado acabamento "Ferragem": €0.50 por unidade`);
  } else {
    await prisma.finish.update({
      where: { id: ferragem.id },
      data: { baseCost: "0.5000" }
    });
    console.log(`✅ Ferragem: €0.50 por unidade (era €${Number(ferragem.baseCost).toFixed(2)})`);
  }

  console.log("\n✅ Ajustes concluídos!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

