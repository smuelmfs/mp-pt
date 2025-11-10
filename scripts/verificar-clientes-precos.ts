import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(120));
  console.log("🔍 Verificação Completa: Clientes e Preços Linkados");
  console.log("=".repeat(120));
  console.log();

  // 1. Buscar todos os clientes ativos
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  console.log(`📊 Total de clientes ativos: ${customers.length}`);
  console.log();

  // 2. Verificar preços de materiais
  const materialPrices = await prisma.materialCustomerPrice.findMany({
    where: { isCurrent: true },
    select: { customerId: true },
    distinct: ["customerId"],
  });
  const customersWithMaterialPrices = new Set(materialPrices.map(p => p.customerId));

  // 3. Verificar preços de impressões
  const printingPrices = await prisma.printingCustomerPrice.findMany({
    where: { isCurrent: true },
    select: { customerId: true },
    distinct: ["customerId"],
  });
  const customersWithPrintingPrices = new Set(printingPrices.map(p => p.customerId));

  // 4. Verificar preços de acabamentos
  const finishPrices = await prisma.finishCustomerPrice.findMany({
    where: { isCurrent: true },
    select: { customerId: true },
    distinct: ["customerId"],
  });
  const customersWithFinishPrices = new Set(finishPrices.map(p => p.customerId));

  // 5. Estatísticas gerais
  console.log("📈 ESTATÍSTICAS DE PREÇOS:");
  console.log("-".repeat(120));
  console.log(`✅ Clientes com preços de materiais: ${customersWithMaterialPrices.size}/${customers.length} (${((customersWithMaterialPrices.size / customers.length) * 100).toFixed(1)}%)`);
  console.log(`✅ Clientes com preços de impressões: ${customersWithPrintingPrices.size}/${customers.length} (${((customersWithPrintingPrices.size / customers.length) * 100).toFixed(1)}%)`);
  console.log(`✅ Clientes com preços de acabamentos: ${customersWithFinishPrices.size}/${customers.length} (${((customersWithFinishPrices.size / customers.length) * 100).toFixed(1)}%)`);
  console.log();

  // 6. Contar preços totais
  const totalMaterialPrices = await prisma.materialCustomerPrice.count({ where: { isCurrent: true } });
  const totalPrintingPrices = await prisma.printingCustomerPrice.count({ where: { isCurrent: true } });
  const totalFinishPrices = await prisma.finishCustomerPrice.count({ where: { isCurrent: true } });

  console.log("📦 TOTAL DE PREÇOS CONFIGURADOS:");
  console.log("-".repeat(120));
  console.log(`  - Preços de materiais: ${totalMaterialPrices}`);
  console.log(`  - Preços de impressões: ${totalPrintingPrices}`);
  console.log(`  - Preços de acabamentos: ${totalFinishPrices}`);
  console.log(`  - TOTAL: ${totalMaterialPrices + totalPrintingPrices + totalFinishPrices}`);
  console.log();

  // 7. Clientes sem preços
  const customersWithoutAnyPrice = customers.filter(c => 
    !customersWithMaterialPrices.has(c.id) &&
    !customersWithPrintingPrices.has(c.id) &&
    !customersWithFinishPrices.has(c.id)
  );

  const customersWithAllPrices = customers.filter(c =>
    customersWithMaterialPrices.has(c.id) &&
    customersWithPrintingPrices.has(c.id) &&
    customersWithFinishPrices.has(c.id)
  );

  const customersWithSomePrices = customers.filter(c => {
    const hasMaterial = customersWithMaterialPrices.has(c.id);
    const hasPrinting = customersWithPrintingPrices.has(c.id);
    const hasFinish = customersWithFinishPrices.has(c.id);
    return (hasMaterial || hasPrinting || hasFinish) && !(hasMaterial && hasPrinting && hasFinish);
  });

  console.log("👥 DISTRIBUIÇÃO DE CLIENTES:");
  console.log("-".repeat(120));
  console.log(`✅ Clientes com TODOS os tipos de preços: ${customersWithAllPrices.length} (${((customersWithAllPrices.length / customers.length) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Clientes com ALGUNS preços: ${customersWithSomePrices.length} (${((customersWithSomePrices.length / customers.length) * 100).toFixed(1)}%)`);
  console.log(`❌ Clientes SEM preços: ${customersWithoutAnyPrice.length} (${((customersWithoutAnyPrice.length / customers.length) * 100).toFixed(1)}%)`);
  console.log();

  // 8. Detalhar clientes sem preços
  if (customersWithoutAnyPrice.length > 0) {
    console.log("❌ CLIENTES SEM PREÇOS CONFIGURADOS:");
    console.log("-".repeat(120));
    customersWithoutAnyPrice.slice(0, 20).forEach(c => {
      console.log(`  - ${c.name} (ID: ${c.id})`);
    });
    if (customersWithoutAnyPrice.length > 20) {
      console.log(`  ... e mais ${customersWithoutAnyPrice.length - 20} clientes`);
    }
    console.log();
  }

  // 9. Detalhar clientes com alguns preços
  if (customersWithSomePrices.length > 0) {
    console.log("⚠️  CLIENTES COM ALGUNS PREÇOS (primeiros 10):");
    console.log("-".repeat(120));
    customersWithSomePrices.slice(0, 10).forEach(c => {
      const hasMaterial = customersWithMaterialPrices.has(c.id);
      const hasPrinting = customersWithPrintingPrices.has(c.id);
      const hasFinish = customersWithFinishPrices.has(c.id);
      const missing = [];
      if (!hasMaterial) missing.push("Materiais");
      if (!hasPrinting) missing.push("Impressões");
      if (!hasFinish) missing.push("Acabamentos");
      console.log(`  - ${c.name}: Faltam ${missing.join(", ")}`);
    });
    if (customersWithSomePrices.length > 10) {
      console.log(`  ... e mais ${customersWithSomePrices.length - 10} clientes`);
    }
    console.log();
  }

  // 10. Verificar materiais, impressões e acabamentos disponíveis
  const totalMaterials = await prisma.material.count({ where: { isCurrent: true } });
  const totalPrintings = await prisma.printing.count({ where: { isCurrent: true } });
  const totalFinishes = await prisma.finish.count({ where: { isCurrent: true } });

  console.log("📋 ITENS DISPONÍVEIS NO SISTEMA:");
  console.log("-".repeat(120));
  console.log(`  - Materiais: ${totalMaterials}`);
  console.log(`  - Impressões: ${totalPrintings}`);
  console.log(`  - Acabamentos: ${totalFinishes}`);
  console.log();

  // 11. Resumo final
  console.log("=".repeat(120));
  console.log("📋 RESUMO FINAL:");
  console.log("=".repeat(120));
  console.log();

  if (customersWithoutAnyPrice.length === 0 && customersWithSomePrices.length === 0) {
    console.log("✅ PERFEITO! Todos os clientes têm preços configurados!");
  } else if (customersWithoutAnyPrice.length === 0) {
    console.log("✅ BOM! Todos os clientes têm pelo menos alguns preços.");
    console.log(`⚠️  ${customersWithSomePrices.length} clientes têm preços parciais (podem precisar de ajustes).`);
  } else {
    console.log(`⚠️  ATENÇÃO: ${customersWithoutAnyPrice.length} clientes não têm preços configurados.`);
    console.log(`⚠️  ${customersWithSomePrices.length} clientes têm preços parciais.`);
  }

  console.log();
  console.log(`📊 Cobertura geral: ${((customersWithAllPrices.length / customers.length) * 100).toFixed(1)}% dos clientes têm todos os tipos de preços.`);

  await prisma.$disconnect();
}

main().catch(console.error);

