import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(120));
  console.log("🔍 Verificação Completa do Sistema para Demonstração");
  console.log("=".repeat(120));
  console.log();

  const issues: string[] = [];
  const warnings: string[] = [];
  const successes: string[] = [];

  // 1. Verificar dados básicos
  console.log("📊 VERIFICAÇÃO DE DADOS BÁSICOS:");
  console.log("-".repeat(120));

  const products = await prisma.product.findMany({ where: { active: true } });
  const materials = await prisma.material.findMany({ where: { isCurrent: true } });
  const printings = await prisma.printing.findMany({ where: { isCurrent: true } });
  const finishes = await prisma.finish.findMany({ where: { isCurrent: true } });
  const customers = await prisma.customer.findMany({ where: { isActive: true } });
  const categories = await prisma.productCategory.findMany();

  console.log(`✅ Produtos: ${products.length}`);
  console.log(`✅ Materiais: ${materials.length}`);
  console.log(`✅ Impressões: ${printings.length}`);
  console.log(`✅ Acabamentos: ${finishes.length}`);
  console.log(`✅ Clientes: ${customers.length}`);
  console.log(`✅ Categorias: ${categories.length}`);
  console.log();

  if (products.length === 0) {
    issues.push("❌ Nenhum produto cadastrado - sistema não pode fazer cotações");
  } else {
    successes.push(`✅ ${products.length} produtos disponíveis para cotações`);
  }

  if (materials.length === 0) {
    issues.push("❌ Nenhum material cadastrado");
  }

  if (printings.length === 0) {
    issues.push("❌ Nenhuma impressão cadastrada");
  }

  if (customers.length === 0) {
    warnings.push("⚠️  Nenhum cliente cadastrado - pode criar durante a demo");
  }

  // 2. Verificar produtos completos
  console.log("📦 VERIFICAÇÃO DE PRODUTOS:");
  console.log("-".repeat(120));

  const productsWithMaterials = await Promise.all(
    products.map(async p => {
      const count = await prisma.productMaterial.count({ where: { productId: p.id } });
      return { product: p, hasMaterials: count > 0 };
    })
  );
  
  const productsWithoutMaterials = productsWithMaterials.filter(p => !p.hasMaterials);

  const productsWithoutPrinting = products.filter(p => !p.printingId);

  const productsWithoutDimensions = products.filter(p => !p.widthMm || !p.heightMm);

  const productsWithoutQuantities = await Promise.all(
    products.map(async p => {
      const count = await prisma.productSuggestedQuantity.count({ where: { productId: p.id } });
      return { product: p, hasQuantities: count > 0 };
    })
  );

  const productsMissingQuantities = productsWithoutQuantities.filter(p => !p.hasQuantities);

  console.log(`✅ Produtos com materiais: ${products.length - productsWithoutMaterials.length}/${products.length}`);
  console.log(`✅ Produtos com impressão: ${products.length - productsWithoutPrinting.length}/${products.length}`);
  console.log(`✅ Produtos com dimensões: ${products.length - productsWithoutDimensions.length}/${products.length}`);
  console.log(`✅ Produtos com quantidades sugeridas: ${products.length - productsMissingQuantities.length}/${products.length}`);
  console.log();

  if (productsWithoutMaterials.length > 0) {
    issues.push(`❌ ${productsWithoutMaterials.length} produtos sem materiais`);
  }

  if (productsWithoutPrinting.length > 0) {
    issues.push(`❌ ${productsWithoutPrinting.length} produtos sem impressão`);
  }

  if (productsWithoutDimensions.length > 0) {
    warnings.push(`⚠️  ${productsWithoutDimensions.length} produtos sem dimensões`);
  }

  if (productsMissingQuantities.length > 0) {
    warnings.push(`⚠️  ${productsMissingQuantities.length} produtos sem quantidades sugeridas`);
  }

  // 3. Verificar impressões
  console.log("🖨️  VERIFICAÇÃO DE IMPRESSÕES:");
  console.log("-".repeat(120));

  const printingsWithoutPrice = printings.filter(p => !p.unitPrice || Number(p.unitPrice) === 0);
  
  console.log(`✅ Impressões com preço: ${printings.length - printingsWithoutPrice.length}/${printings.length}`);
  console.log();

  if (printingsWithoutPrice.length > 0) {
    issues.push(`❌ ${printingsWithoutPrice.length} impressões sem preço`);
  } else {
    successes.push("✅ Todas as impressões têm preços definidos");
  }

  // 4. Verificar acabamentos
  console.log("✨ VERIFICAÇÃO DE ACABAMENTOS:");
  console.log("-".repeat(120));

  const finishesWithoutPrice = finishes.filter(f => !f.baseCost || Number(f.baseCost) === 0);
  
  console.log(`✅ Acabamentos com preço: ${finishes.length - finishesWithoutPrice.length}/${finishes.length}`);
  console.log();

  if (finishesWithoutPrice.length > 0) {
    warnings.push(`⚠️  ${finishesWithoutPrice.length} acabamentos sem preço`);
  } else {
    successes.push("✅ Todos os acabamentos têm preços definidos");
  }

  // 5. Verificar configurações globais
  console.log("⚙️  VERIFICAÇÃO DE CONFIGURAÇÕES:");
  console.log("-".repeat(120));

  const config = await prisma.configGlobal.findUnique({ where: { id: 1 } });
  
  if (!config) {
    issues.push("❌ Configuração global não encontrada");
  } else {
    console.log(`✅ Margem padrão: ${(Number(config.marginDefault) * 100).toFixed(2)}%`);
    console.log(`✅ Markup operacional: ${(Number(config.markupOperational) * 100).toFixed(2)}%`);
    console.log(`✅ IVA: ${(Number(config.vatPercent) * 100).toFixed(2)}%`);
    successes.push("✅ Configurações globais definidas");
  }
  console.log();

  // 6. Verificar margens
  console.log("📈 VERIFICAÇÃO DE MARGENS:");
  console.log("-".repeat(120));

  const marginRules = await prisma.marginRule.findMany({ where: { active: true } });
  const dynamicMargins = await prisma.marginRuleDynamic.findMany({ where: { active: true } });

  console.log(`✅ Regras de margem fixas: ${marginRules.length}`);
  console.log(`✅ Regras de margem dinâmicas: ${dynamicMargins.length}`);
  console.log();

  if (marginRules.length === 0 && dynamicMargins.length === 0) {
    warnings.push("⚠️  Nenhuma regra de margem configurada - sistema usará margem padrão");
  } else {
    successes.push(`✅ ${marginRules.length + dynamicMargins.length} regras de margem configuradas`);
  }

  // 7. Verificar exemplos de cotações
  console.log("💼 VERIFICAÇÃO DE EXEMPLOS:");
  console.log("-".repeat(120));

  // Pegar alguns produtos de exemplo
  const exampleProducts = products.slice(0, 5);
  console.log(`📦 Produtos de exemplo disponíveis:`);
  for (const p of exampleProducts) {
    const category = categories.find(c => c.id === p.categoryId);
    console.log(`   - ${p.name} (${category?.name || "Sem categoria"})`);
  }
  console.log();

  // 8. Resumo final
  console.log("=".repeat(120));
  console.log("📋 RESUMO DA VERIFICAÇÃO:");
  console.log("=".repeat(120));
  console.log();

  if (issues.length === 0) {
    console.log("✅ NENHUM PROBLEMA CRÍTICO ENCONTRADO");
    console.log("   Sistema está pronto para demonstração!");
  } else {
    console.log("❌ PROBLEMAS CRÍTICOS ENCONTRADOS:");
    for (const issue of issues) {
      console.log(`   ${issue}`);
    }
  }

  console.log();
  if (warnings.length > 0) {
    console.log("⚠️  AVISOS (não bloqueiam a demo):");
    for (const warning of warnings) {
      console.log(`   ${warning}`);
    }
  }

  console.log();
  if (successes.length > 0) {
    console.log("✅ PONTOS POSITIVOS:");
    for (const success of successes) {
      console.log(`   ${success}`);
    }
  }

  console.log();
  console.log("=".repeat(120));
  console.log("💡 RECOMENDAÇÃO PARA DEMONSTRAÇÃO:");
  console.log("=".repeat(120));
  console.log();

  if (issues.length === 0) {
    console.log("✅ SISTEMA PRONTO PARA DEMONSTRAÇÃO!");
    console.log();
    console.log("📝 SUGESTÕES PARA A DEMO:");
    console.log("   1. Mostrar criação de cotação com um produto de exemplo");
    console.log("   2. Demonstrar diferentes quantidades e ver variação de preço");
    console.log("   3. Mostrar produtos por categoria");
    console.log("   4. Demonstrar preços específicos de clientes (se houver)");
    console.log("   5. Mostrar cálculo de margens e IVA");
  } else {
    console.log("⚠️  CORRIGIR PROBLEMAS ANTES DA DEMONSTRAÇÃO:");
    for (const issue of issues) {
      console.log(`   ${issue}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

