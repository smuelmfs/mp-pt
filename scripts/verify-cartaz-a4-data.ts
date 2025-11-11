import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(120));
  console.log("🔍 VERIFICAÇÃO DE DADOS: CARTAZ A4");
  console.log("=".repeat(120));
  console.log();

  // Buscar produto
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: "CARTAZ A4", mode: "insensitive" },
      category: { name: { equals: "Papelaria", mode: "insensitive" } }
    },
    include: {
      category: true,
      printing: true,
      materials: {
        include: {
          material: {
            include: {
              variants: true,
              supplier: true
            }
          },
          variant: true
        }
      },
      finishes: {
        include: {
          finish: true
        }
      }
    }
  });

  if (!product) {
    console.log("❌ Produto não encontrado");
    await prisma.$disconnect();
    return;
  }

  console.log(`✅ Produto: ${product.name} (ID: ${product.id})`);
  console.log(`   Categoria: ${product.category.name}`);
  console.log(`   Dimensões: ${product.widthMm}mm × ${product.heightMm}mm`);
  console.log(`   Markup Default: ${product.markupDefault ? Number(product.markupDefault) * 100 + "%" : "N/A"}`);
  console.log(`   Margin Default: ${product.marginDefault ? Number(product.marginDefault) * 100 + "%" : "N/A"}`);
  console.log(`   Pricing Strategy: ${product.pricingStrategy || "N/A"}`);
  console.log();

  // Impressão
  if (product.printing) {
    console.log("🖨️  IMPRESSÃO:");
    console.log(`   ID: ${product.printing.id}`);
    console.log(`   Tecnologia: ${product.printing.technology}`);
    console.log(`   Formato: ${product.printing.formatLabel || "N/A"}`);
    console.log(`   Cores: ${product.printing.colors || "N/A"}`);
    console.log(`   Lados: ${product.printing.sides || "N/A"}`);
    console.log(`   Preço Unitário: €${product.printing.unitPrice ? Number(product.printing.unitPrice).toFixed(4) : "N/A"}`);
    console.log();
  }

  // Materiais
  console.log("📦 MATERIAIS:");
  for (const pm of product.materials) {
    console.log(`   Material: ${pm.material.name} (ID: ${pm.material.id})`);
    console.log(`   Tipo: ${pm.material.type}`);
    console.log(`   Unidade: ${pm.material.unit}`);
    console.log(`   Preço Unitário: €${pm.material.unitCost ? Number(pm.material.unitCost).toFixed(4) : "N/A"}`);
    console.log(`   Preço Fornecedor: €${pm.material.supplierUnitCost ? Number(pm.material.supplierUnitCost).toFixed(4) : "N/A"}`);
    console.log(`   Fornecedor: ${pm.material.supplier?.name || "N/A"}`);
    console.log(`   Qty por Unidade: ${pm.qtyPerUnit || 1}`);
    console.log(`   Waste Factor: ${pm.wasteFactor || 0}`);
    console.log(`   Loss Factor: ${(pm as any).lossFactor || (pm.material as any).lossFactor || 0}`);
    
    if (pm.variant) {
      console.log(`   Variante: ${pm.variant.name || "N/A"} (${pm.variant.widthMm}mm × ${pm.variant.heightMm}mm)`);
      console.log(`   Preço Variante: €${pm.variant.unitPrice ? Number(pm.variant.unitPrice).toFixed(4) : "N/A"}`);
    }
    console.log();
  }

  // Acabamentos
  console.log("✨ ACABAMENTOS:");
  if (product.finishes.length === 0) {
    console.log("   Nenhum acabamento configurado");
  } else {
    for (const pf of product.finishes) {
      console.log(`   ${pf.finish.name} (ID: ${pf.finish.id})`);
      console.log(`   Categoria: ${pf.finish.category}`);
      console.log(`   Custo Base: €${pf.finish.baseCost ? Number(pf.finish.baseCost).toFixed(4) : "N/A"}`);
      console.log(`   Qty por Unidade: ${pf.qtyPerUnit || 1}`);
    }
  }
  console.log();

  // Verificar regras de margem
  console.log("📊 REGRAS DE MARGEM:");
  
  // Margem do produto
  if (product.marginDefault) {
    console.log(`   Produto: ${Number(product.marginDefault) * 100}%`);
  }
  
  // Margem da categoria
  const catMargin = await prisma.marginRule.findFirst({
    where: {
      scope: "CATEGORY",
      categoryId: product.categoryId,
      active: true
    },
    orderBy: { startsAt: "desc" }
  });
  if (catMargin) {
    console.log(`   Categoria: ${Number(catMargin.margin) * 100}%`);
  }
  
  // Margem global
  const globalMargin = await prisma.marginRule.findFirst({
    where: {
      scope: "GLOBAL",
      active: true
    },
    orderBy: { startsAt: "desc" }
  });
  if (globalMargin) {
    console.log(`   Global: ${Number(globalMargin.margin) * 100}%`);
  }
  
  console.log();

  // Verificar ajustes dinâmicos
  console.log("🔄 AJUSTES DINÂMICOS:");
  
  const dynProd = await prisma.marginRuleDynamic.findFirst({
    where: {
      scope: "PRODUCT",
      productId: product.id,
      active: true
    },
    orderBy: { priority: "asc" }
  });
  
  const dynCat = await prisma.marginRuleDynamic.findFirst({
    where: {
      scope: "CATEGORY",
      categoryId: product.categoryId,
      active: true
    },
    orderBy: { priority: "asc" }
  });
  
  const dynGlob = await prisma.marginRuleDynamic.findFirst({
    where: {
      scope: "GLOBAL",
      active: true
    },
    orderBy: { priority: "asc" }
  });
  
  if (dynProd) {
    console.log(`   Produto: ${Number(dynProd.adjustPercent) * 100}%`);
  }
  if (dynCat) {
    console.log(`   Categoria: ${Number(dynCat.adjustPercent) * 100}%`);
  }
  if (dynGlob) {
    console.log(`   Global: ${Number(dynGlob.adjustPercent) * 100}%`);
  }
  if (!dynProd && !dynCat && !dynGlob) {
    console.log("   Nenhum ajuste dinâmico configurado");
  }
  
  console.log();

  // Verificar configuração global
  const config = await prisma.configGlobal.findFirst({ where: { id: 1 } });
  if (config) {
    console.log("⚙️  CONFIGURAÇÃO GLOBAL:");
    console.log(`   Markup Operacional: ${config.markupOperational ? Number(config.markupOperational) * 100 + "%" : "N/A"}`);
    console.log(`   Margem Default: ${config.marginDefault ? Number(config.marginDefault) * 100 + "%" : "N/A"}`);
    console.log(`   IVA: ${config.vatPercent ? Number(config.vatPercent) * 100 + "%" : "N/A"}`);
    console.log();
  }

  console.log("=".repeat(120));
  console.log("📝 RESUMO:");
  console.log("=".repeat(120));
  console.log();
  console.log("1. Verificar se o preço do material está correto (€0.0946 vs €0.060 da planilha)");
  console.log("2. Verificar se produto é frente/verso (explica divisão por 2 na planilha)");
  console.log("3. Verificar se acabamentos devem ser aplicados (planilha inclui €5.00-€15.00)");
  console.log("4. Verificar fórmula de margem (planilha usa 300% fixo, sistema usa Markup+Margem)");
  console.log();

  await prisma.$disconnect();
}

main().catch(console.error);

