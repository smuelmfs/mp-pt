import { prisma } from "../lib/prisma";

async function main() {
  console.log("=".repeat(120));
  console.log("📊 ANÁLISE COMPLETA DO SISTEMA ADMIN");
  console.log("=".repeat(120));
  console.log();

  // 1. MATERIAIS
  console.log("📋 MATERIAIS");
  console.log("-".repeat(120));
  const materials = await prisma.material.findMany({
    where: { isCurrent: true },
    include: { supplier: true, variants: { where: { isCurrent: true } } },
  });
  const materialsByType = materials.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`Total: ${materials.length} materiais ativos`);
  console.log(`Por tipo: ${Object.entries(materialsByType).map(([t, c]) => `${t}: ${c}`).join(", ")}`);
  const materialsWithoutSupplier = materials.filter(m => !m.supplierId);
  console.log(`Sem fornecedor: ${materialsWithoutSupplier.length}`);
  if (materialsWithoutSupplier.length > 0) {
    console.log(`  Exemplos: ${materialsWithoutSupplier.slice(0, 5).map(m => m.name).join(", ")}`);
  }
  const materialsWithoutVariants = materials.filter(m => m.variants.length === 0);
  console.log(`Sem variantes: ${materialsWithoutVariants.length}`);
  console.log();

  // 2. IMPRESSÕES
  console.log("🖨️ IMPRESSÕES");
  console.log("-".repeat(120));
  const printings = await prisma.printing.findMany({
    where: { isCurrent: true },
  });
  const printingsByTech = printings.reduce((acc, p) => {
    acc[p.technology] = (acc[p.technology] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`Total: ${printings.length} impressões ativas`);
  console.log(`Por tecnologia: ${Object.entries(printingsByTech).map(([t, c]) => `${t}: ${c}`).join(", ")}`);
  const printingsWithoutPrice = printings.filter(p => !p.unitPrice || Number(p.unitPrice) === 0);
  console.log(`Sem preço ou preço zero: ${printingsWithoutPrice.length}`);
  console.log();

  // 3. ACABAMENTOS
  console.log("✨ ACABAMENTOS");
  console.log("-".repeat(120));
  const finishes = await prisma.finish.findMany({
    where: { isCurrent: true },
  });
  const finishesByCategory = finishes.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`Total: ${finishes.length} acabamentos ativos`);
  console.log(`Por categoria: ${Object.entries(finishesByCategory).map(([t, c]) => `${t}: ${c}`).join(", ")}`);
  const finishesWithoutPrice = finishes.filter(f => !f.baseCost || Number(f.baseCost) === 0);
  console.log(`Sem preço ou preço zero: ${finishesWithoutPrice.length}`);
  console.log();

  // 4. PRODUTOS
  console.log("📦 PRODUTOS");
  console.log("-".repeat(120));
  const products = await prisma.product.findMany({
    include: {
      category: true,
      materials: { include: { material: true } },
      finishes: { include: { finish: true } },
      printing: true,
    },
  });
  console.log(`Total: ${products.length} produtos`);
  console.log(`Ativos: ${products.filter(p => p.active).length}`);
  console.log(`Inativos: ${products.filter(p => !p.active).length}`);
  const productsByCategory = products.reduce((acc, p) => {
    const catName = p.category?.name || "Sem categoria";
    acc[catName] = (acc[catName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`Por categoria: ${Object.entries(productsByCategory).map(([t, c]) => `${t}: ${c}`).join(", ")}`);
  const productsWithoutMaterials = products.filter(p => p.materials.length === 0);
  console.log(`Sem materiais: ${productsWithoutMaterials.length}`);
  if (productsWithoutMaterials.length > 0) {
    console.log(`  Exemplos: ${productsWithoutMaterials.slice(0, 5).map(p => p.name).join(", ")}`);
  }
  const productsWithoutPrinting = products.filter(p => !p.printingId);
  console.log(`Sem impressão: ${productsWithoutPrinting.length}`);
  console.log();

  // 5. CLIENTES
  console.log("👥 CLIENTES");
  console.log("-".repeat(120));
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    include: {
      materialPrices: { where: { isCurrent: true } },
      printingPrices: { where: { isCurrent: true } },
      finishPrices: { where: { isCurrent: true } },
    },
  });
  console.log(`Total: ${customers.length} clientes ativos`);
  const customersWithoutPrices = customers.filter(c => 
    c.materialPrices.length === 0 && 
    c.printingPrices.length === 0 && 
    c.finishPrices.length === 0
  );
  console.log(`Sem preços específicos: ${customersWithoutPrices.length}`);
  if (customersWithoutPrices.length > 0) {
    console.log(`  Exemplos: ${customersWithoutPrices.slice(0, 5).map(c => c.name).join(", ")}`);
  }
  const totalMaterialPrices = customers.reduce((sum, c) => sum + c.materialPrices.length, 0);
  const totalPrintingPrices = customers.reduce((sum, c) => sum + c.printingPrices.length, 0);
  const totalFinishPrices = customers.reduce((sum, c) => sum + c.finishPrices.length, 0);
  console.log(`Preços de materiais: ${totalMaterialPrices}`);
  console.log(`Preços de impressões: ${totalPrintingPrices}`);
  console.log(`Preços de acabamentos: ${totalFinishPrices}`);
  console.log();

  // 6. FORNECEDORES
  console.log("🏭 FORNECEDORES");
  console.log("-".repeat(120));
  const suppliers = await prisma.supplier.findMany({
    where: { active: true },
    include: {
      materials: { where: { isCurrent: true } },
    },
  });
  console.log(`Total: ${suppliers.length} fornecedores ativos`);
  console.log(`Lista: ${suppliers.map(s => s.name).join(", ")}`);
  const suppliersWithoutMaterials = suppliers.filter(s => s.materials.length === 0);
  console.log(`Sem materiais associados: ${suppliersWithoutMaterials.length}`);
  if (suppliersWithoutMaterials.length > 0) {
    console.log(`  Exemplos: ${suppliersWithoutMaterials.map(s => s.name).join(", ")}`);
  }
  console.log();

  // 7. CATEGORIAS
  console.log("📁 CATEGORIAS");
  console.log("-".repeat(120));
  const categories = await prisma.productCategory.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
  console.log(`Total: ${categories.length} categorias`);
  const categoriesWithoutProducts = categories.filter(c => c._count.products === 0);
  console.log(`Sem produtos: ${categoriesWithoutProducts.length}`);
  if (categoriesWithoutProducts.length > 0) {
    console.log(`  Exemplos: ${categoriesWithoutProducts.map(c => c.name).join(", ")}`);
  }
  console.log();

  // 8. MARGENS
  console.log("📈 REGRAS DE MARGEM");
  console.log("-".repeat(120));
  const [marginRules, marginRulesDyn] = await Promise.all([
    prisma.marginRule.findMany({ where: { active: true } }),
    prisma.marginRuleDynamic.findMany({ where: { active: true } }),
  ]);
  console.log(`Regras fixas ativas: ${marginRules.length}`);
  console.log(`Regras dinâmicas ativas: ${marginRulesDyn.length}`);
  const globalMargins = marginRules.filter(m => m.scope === "GLOBAL");
  console.log(`Margens globais: ${globalMargins.length}`);
  console.log();

  // 9. CONFIGURAÇÕES
  console.log("⚙️ CONFIGURAÇÕES GLOBAIS");
  console.log("-".repeat(120));
  const config = await prisma.configGlobal.findFirst({ where: { id: 1 } });
  if (config) {
    console.log(`Margem padrão: ${config.marginDefault ? (Number(config.marginDefault) * 100).toFixed(2) + "%" : "Não configurada"}`);
    console.log(`Markup operacional: ${config.markupOperational ? (Number(config.markupOperational) * 100).toFixed(2) + "%" : "Não configurado"}`);
    console.log(`Degrau de arredondamento: ${config.roundingStep || "Não configurado"}`);
    console.log(`Fator de perda: ${config.lossFactor ? (Number(config.lossFactor) * 100).toFixed(2) + "%" : "Não configurado"}`);
    console.log(`IVA: ${config.vatPercent ? (Number(config.vatPercent) * 100).toFixed(2) + "%" : "Não configurado"}`);
    console.log(`Custo por hora impressão: ${config.printingHourCost || "Não configurado"}`);
  } else {
    console.log("⚠️ Configuração global não encontrada!");
  }
  console.log();

  // 10. RESUMO DE PROBLEMAS
  console.log("=".repeat(120));
  console.log("⚠️ RESUMO DE PROBLEMAS ENCONTRADOS");
  console.log("=".repeat(120));
  
  const problems: string[] = [];
  
  if (materialsWithoutSupplier.length > 0) {
    problems.push(`❌ ${materialsWithoutSupplier.length} materiais sem fornecedor`);
  }
  if (materialsWithoutVariants.length > 0 && materialsWithoutVariants.length < materials.length * 0.5) {
    problems.push(`⚠️ ${materialsWithoutVariants.length} materiais sem variantes (pode ser normal)`);
  }
  if (productsWithoutMaterials.length > 0) {
    problems.push(`❌ ${productsWithoutMaterials.length} produtos sem materiais`);
  }
  if (productsWithoutPrinting.length > 0) {
    problems.push(`⚠️ ${productsWithoutPrinting.length} produtos sem impressão (pode ser normal)`);
  }
  if (customersWithoutPrices.length > 0) {
    problems.push(`⚠️ ${customersWithoutPrices.length} clientes sem preços específicos`);
  }
  if (suppliersWithoutMaterials.length > 0) {
    problems.push(`⚠️ ${suppliersWithoutMaterials.length} fornecedores sem materiais associados`);
  }
  if (categoriesWithoutProducts.length > 0) {
    problems.push(`⚠️ ${categoriesWithoutProducts.length} categorias sem produtos (já foram excluídas as vazias)`);
  }
  if (globalMargins.length === 0) {
    problems.push(`⚠️ Nenhuma margem global configurada`);
  }
  if (!config || !config.marginDefault) {
    problems.push(`⚠️ Margem padrão não configurada`);
  }
  if (!config || !config.vatPercent) {
    problems.push(`⚠️ IVA não configurado`);
  }

  if (problems.length === 0) {
    console.log("✅ Nenhum problema crítico encontrado!");
  } else {
    problems.forEach(p => console.log(p));
  }

  console.log();
  console.log("=".repeat(120));
  console.log("✅ Análise concluída!");
  console.log("=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

