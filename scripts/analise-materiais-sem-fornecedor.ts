import { prisma } from "../lib/prisma";

async function main() {
  console.log("=".repeat(120));
  console.log("📋 ANÁLISE DE MATERIAIS SEM FORNECEDOR");
  console.log("=".repeat(120));
  console.log();

  const materials = await prisma.material.findMany({
    where: { 
      isCurrent: true,
      supplierId: null 
    },
    include: {
      productMaterials: {
        include: {
          product: {
            select: { name: true, category: { select: { name: true } } }
          }
        }
      }
    },
    orderBy: [{ type: "asc" }, { name: "asc" }]
  });

  console.log(`Total de materiais sem fornecedor: ${materials.length}\n`);

  // Agrupar por tipo
  const byType = materials.reduce((acc, m) => {
    if (!acc[m.type]) acc[m.type] = [];
    acc[m.type].push(m);
    return acc;
  }, {} as Record<string, typeof materials>);

  for (const [type, mats] of Object.entries(byType)) {
    console.log(`\n📦 ${type.toUpperCase()} (${mats.length} materiais):`);
    console.log("-".repeat(120));
    
    for (const mat of mats) {
      const usedInProducts = mat.productMaterials.length;
      const categories = [...new Set(mat.productMaterials.map(pm => pm.product.category?.name).filter(Boolean))];
      
      console.log(`\n  • ${mat.name}`);
      console.log(`    - Custo unitário: €${Number(mat.unitCost).toFixed(4)}`);
      console.log(`    - Unidade: ${mat.unit}`);
      console.log(`    - Usado em ${usedInProducts} produto(s)`);
      if (categories.length > 0) {
        console.log(`    - Categorias: ${categories.join(", ")}`);
      }
      
      // Análise se precisa de fornecedor
      const needsSupplier = 
        mat.type === "papel" ||
        mat.type === "vinil" ||
        mat.type === "alveolar" ||
        mat.type === "pvc" ||
        mat.type === "envelope" ||
        mat.type === "textil";
      
      const probablyInternal = 
        mat.type === "suporte" ||
        mat.type === "publicitario" ||
        mat.name.toLowerCase().includes("estrutura") ||
        mat.name.toLowerCase().includes("base") ||
        mat.name.toLowerCase().includes("balcão");
      
      if (needsSupplier) {
        console.log(`    ⚠️  PRECISA DE FORNECEDOR (tipo: ${mat.type})`);
      } else if (probablyInternal) {
        console.log(`    ℹ️  Provavelmente interno/suporte (não precisa fornecedor)`);
      } else {
        console.log(`    ❓ Verificar se precisa fornecedor`);
      }
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log("📊 RESUMO POR TIPO:");
  console.log("=".repeat(120));
  
  for (const [type, mats] of Object.entries(byType)) {
    const needsSupplier = mats.filter(m => 
      m.type === "papel" ||
      m.type === "vinil" ||
      m.type === "alveolar" ||
      m.type === "pvc" ||
      m.type === "envelope" ||
      m.type === "textil"
    );
    const probablyInternal = mats.filter(m => 
      m.type === "suporte" ||
      m.type === "publicitario" ||
      m.name.toLowerCase().includes("estrutura") ||
      m.name.toLowerCase().includes("base") ||
      m.name.toLowerCase().includes("balcão")
    );
    
    console.log(`\n${type.toUpperCase()}:`);
    console.log(`  Total: ${mats.length}`);
    console.log(`  Precisam fornecedor: ${needsSupplier.length}`);
    console.log(`  Provavelmente internos: ${probablyInternal.length}`);
    if (needsSupplier.length > 0) {
      console.log(`  Exemplos que precisam: ${needsSupplier.slice(0, 3).map(m => m.name).join(", ")}`);
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log("✅ Análise concluída!");
  console.log("=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

