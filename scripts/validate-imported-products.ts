import { prisma } from "../lib/prisma";

interface ValidationResult {
  productId: number;
  productName: string;
  category: string;
  issues: string[];
  warnings: string[];
}

async function validateProducts() {
  console.log("🔍 Validando Produtos Importados\n");
  console.log("=".repeat(120));

  const products = await prisma.product.findMany({
    include: {
      category: { select: { name: true } },
      materials: {
        include: { material: { select: { name: true, unitCost: true, active: true } } }
      },
      finishes: {
        include: { finish: { select: { name: true, baseCost: true, active: true } } }
      },
      printing: { select: { formatLabel: true, technology: true, unitPrice: true, active: true } },
      suggestedQuantities: { select: { quantity: true } },
      dimensions: { select: { widthMm: true, heightMm: true, description: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const results: ValidationResult[] = [];
  let totalIssues = 0;
  let totalWarnings = 0;

  for (const product of products) {
    const issues: string[] = [];
    const warnings: string[] = [];

    // 1. Verificar se tem categoria
    if (!product.category) {
      issues.push("❌ Sem categoria");
    }

    // 2. Verificar se tem materiais
    if (product.materials.length === 0) {
      issues.push("❌ Sem materiais associados");
    } else {
      // Verificar se materiais estão ativos
      const inactiveMaterials = product.materials.filter(pm => !pm.material?.active);
      if (inactiveMaterials.length > 0) {
        warnings.push(`⚠️ ${inactiveMaterials.length} material(is) inativo(s)`);
      }
      // Verificar se materiais têm custo (mas custo zero pode ser válido para alguns produtos)
      const materialsWithoutCost = product.materials.filter(
        pm => !pm.material?.unitCost
      );
      if (materialsWithoutCost.length > 0) {
        warnings.push(`⚠️ ${materialsWithoutCost.length} material(is) sem custo definido`);
      }
      // Custo zero é aceitável (pode ser que o custo venha de outra fonte)
    }

    // 3. Verificar se tem impressão (quando necessário)
    if (!product.printing) {
      warnings.push("⚠️ Sem impressão associada");
    } else if (!product.printing.active) {
      warnings.push("⚠️ Impressão inativa");
    }

    // 4. Verificar se tem quantidades sugeridas
    if (product.suggestedQuantities.length === 0) {
      warnings.push("⚠️ Sem quantidades sugeridas");
    }

    // 5. Verificar se tem dimensões (widthMm e heightMm diretamente no produto OU na tabela dimensions)
    // Têxteis não precisam de dimensões fixas
    if (!product.widthMm || !product.heightMm) {
      if (product.dimensions.length === 0) {
        const isTextile = product.category?.name?.toLowerCase().includes("têxteis") || 
                         product.category?.name?.toLowerCase().includes("textiles");
        if (!isTextile) {
          warnings.push("⚠️ Sem dimensões configuradas (widthMm/heightMm)");
        }
      }
    }

    // 6. Verificar se tem acabamentos (opcional, mas pode ser necessário)
    if (product.finishes.length === 0) {
      // Só avisar se for um produto que normalmente precisa de acabamento
      if (product.name.toLowerCase().includes("plastificação") || 
          product.name.toLowerCase().includes("foil")) {
        warnings.push("⚠️ Produto parece precisar de acabamento mas não tem");
      }
    } else {
      // Verificar se acabamentos estão ativos
      const inactiveFinishes = product.finishes.filter(pf => !pf.finish?.active);
      if (inactiveFinishes.length > 0) {
        warnings.push(`⚠️ ${inactiveFinishes.length} acabamento(s) inativo(s)`);
      }
    }

    // 7. Verificar nome do produto
    if (!product.name || product.name.trim().length === 0) {
      issues.push("❌ Nome vazio ou inválido");
    }

    if (issues.length > 0 || warnings.length > 0) {
      results.push({
        productId: product.id,
        productName: product.name,
        category: product.category?.name || "Sem categoria",
        issues,
        warnings
      });
      totalIssues += issues.length;
      totalWarnings += warnings.length;
    }
  }

  // Mostrar resultados
  console.log(`\n📊 Total de produtos: ${products.length}`);
  console.log(`📋 Produtos com problemas: ${results.length}\n`);

  if (results.length === 0) {
    console.log("✅ Todos os produtos estão válidos!\n");
  } else {
    console.log("⚠️ Produtos com problemas:\n");
    for (const result of results) {
      console.log(`\n📦 ${result.productName} (ID: ${result.productId})`);
      console.log(`   Categoria: ${result.category}`);
      
      if (result.issues.length > 0) {
        console.log("   Problemas:");
        result.issues.forEach(issue => console.log(`     ${issue}`));
      }
      
      if (result.warnings.length > 0) {
        console.log("   Avisos:");
        result.warnings.forEach(warning => console.log(`     ${warning}`));
      }
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log(`\n📊 Resumo:`);
  console.log(`   Total de problemas: ${totalIssues}`);
  console.log(`   Total de avisos: ${totalWarnings}`);
  console.log(`   Produtos OK: ${products.length - results.length}\n`);

  // Estatísticas por categoria
  const byCategory = new Map<string, { total: number; withIssues: number }>();
  for (const product of products) {
    const catName = product.category?.name || "Sem categoria";
    const current = byCategory.get(catName) || { total: 0, withIssues: 0 };
    current.total++;
    if (results.some(r => r.productId === product.id)) {
      current.withIssues++;
    }
    byCategory.set(catName, current);
  }

  console.log("📊 Por categoria:");
  for (const [cat, stats] of byCategory.entries()) {
    const ok = stats.total - stats.withIssues;
    console.log(`   ${cat}: ${ok}/${stats.total} OK (${stats.withIssues} com problemas)`);
  }

  console.log("\n" + "=".repeat(120));
}

async function validateMaterials() {
  console.log("\n🔍 Validando Materiais\n");
  console.log("=".repeat(120));

  const materials = await prisma.material.findMany({
    where: { isCurrent: true, active: true },
    include: {
      _count: {
        select: {
          productMaterials: true,
          variants: true
        }
      }
    }
  });

  let materialsWithoutProducts = 0;
  let materialsWithoutVariants = 0;
  let materialsWithoutCost = 0;

  for (const material of materials) {
    if (material._count.productMaterials === 0) {
      materialsWithoutProducts++;
    }
    if (material._count.variants === 0 && material.type !== "papel") {
      // Papel pode não ter variantes
      materialsWithoutVariants++;
    }
    if (!material.unitCost || Number(material.unitCost) === 0) {
      materialsWithoutCost++;
    }
  }

  console.log(`\n📊 Total de materiais: ${materials.length}`);
  console.log(`   Materiais sem produtos: ${materialsWithoutProducts}`);
  console.log(`   Materiais sem variantes: ${materialsWithoutVariants}`);
  console.log(`   Materiais sem custo: ${materialsWithoutCost}\n`);
}

async function main() {
  try {
    await validateProducts();
    await validateMaterials();
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

