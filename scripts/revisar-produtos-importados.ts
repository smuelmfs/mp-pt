import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(120));
  console.log("🔍 Revisão de Produtos Importados");
  console.log("=".repeat(120));
  console.log();

  // Buscar produtos recentes (últimos 30 dias ou todos se não houver data)
  const allProducts = await prisma.product.findMany({
    where: { active: true },
    include: {
      category: { select: { name: true } },
      printing: { select: { formatLabel: true, technology: true, colors: true } },
      materials: {
        include: {
          material: { select: { name: true, type: true, unitCost: true } }
        }
      },
      finishes: {
        include: {
          finish: { select: { name: true, category: true, baseCost: true } }
        }
      },
      suggestedQuantities: {
        orderBy: { order: "asc" },
        select: { quantity: true }
      },
      dimensions: {
        select: { widthMm: true, heightMm: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  console.log(`📦 Total de produtos no sistema: ${allProducts.length}`);
  console.log();

  // Categorias
  const byCategory = new Map<string, number>();
  for (const p of allProducts) {
    const cat = p.category.name;
    byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
  }

  console.log("📁 PRODUTOS POR CATEGORIA:");
  for (const [cat, count] of Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${cat}: ${count}`);
  }
  console.log();

  // Verificar problemas
  const problems: Array<{ product: string; issue: string }> = [];
  const warnings: Array<{ product: string; issue: string }> = [];

  for (const p of allProducts) {
    // Sem impressão
    if (!p.printingId) {
      problems.push({ product: p.name, issue: "Sem impressão associada" });
    }

    // Sem materiais
    if (!p.materials || p.materials.length === 0) {
      problems.push({ product: p.name, issue: "Sem materiais associados" });
    }

    // Sem dimensões
    const hasDimensions = p.widthMm && p.heightMm;
    const hasDimensionsTable = p.dimensions && p.dimensions.length > 0;
    if (!hasDimensions && !hasDimensionsTable) {
      warnings.push({ product: p.name, issue: "Sem dimensões definidas" });
    }

    // Sem quantidades sugeridas
    if (!p.suggestedQuantities || p.suggestedQuantities.length === 0) {
      warnings.push({ product: p.name, issue: "Sem quantidades sugeridas" });
    }

    // Dimensões muito grandes ou muito pequenas
    if (p.widthMm && p.heightMm) {
      const area = (p.widthMm * p.heightMm) / 1000000; // m²
      if (area > 1) {
        warnings.push({ product: p.name, issue: `Área muito grande: ${area.toFixed(2)} m² (${p.widthMm}x${p.heightMm}mm)` });
      }
      if (area < 0.001) {
        warnings.push({ product: p.name, issue: `Área muito pequena: ${area.toFixed(4)} m² (${p.widthMm}x${p.heightMm}mm)` });
      }
    }
  }

  // Produtos de Impressões Singulares (últimos importados)
  console.log("=".repeat(120));
  console.log("📋 PRODUTOS DE IMPRESSÕES SINGULARES (Últimos Importados):");
  console.log("=".repeat(120));
  console.log();

  const singularProducts = allProducts.filter(p => 
    p.name.toUpperCase().includes("CARTAZ") ||
    p.name.toUpperCase().includes("CARTÃO") ||
    p.name.toUpperCase().includes("VOUCHER") ||
    p.name.toUpperCase().includes("PAGELA") ||
    p.name.toUpperCase().includes("FLYER") ||
    p.name.toUpperCase().includes("FOLHETO") ||
    p.name.toUpperCase().includes("BLOCO") ||
    p.name.toUpperCase().includes("DIPTICO") ||
    p.name.toUpperCase().includes("CONVITE")
  ).slice(0, 20);

  for (const p of singularProducts) {
    console.log(`\n📦 ${p.name}`);
    console.log(`   Categoria: ${p.category.name}`);
    if (p.widthMm && p.heightMm) {
      console.log(`   Dimensões: ${p.widthMm}x${p.heightMm}mm (${((p.widthMm * p.heightMm) / 1000000).toFixed(4)} m²)`);
    } else {
      console.log(`   Dimensões: Não definidas`);
    }
    if (p.printing) {
      console.log(`   Impressão: ${p.printing.formatLabel || p.printing.technology} ${p.printing.colors || ""}`);
    }
    if (p.materials && p.materials.length > 0) {
      console.log(`   Materiais (${p.materials.length}):`);
      for (const m of p.materials) {
        console.log(`     - ${m.material.name} (${m.qtyPerUnit} un/unidade)`);
      }
    }
    if (p.finishes && p.finishes.length > 0) {
      console.log(`   Acabamentos (${p.finishes.length}):`);
      for (const f of p.finishes) {
        console.log(`     - ${f.finish.name} (${f.finish.category})`);
      }
    }
    if (p.suggestedQuantities && p.suggestedQuantities.length > 0) {
      const qty = p.suggestedQuantities.map(sq => sq.quantity).join(", ");
      console.log(`   Quantidades sugeridas: ${qty}`);
    }
  }

  // Produtos de Catálogos
  console.log("\n" + "=".repeat(120));
  console.log("📋 PRODUTOS DE CATÁLOGOS:");
  console.log("=".repeat(120));
  console.log();

  const catalogoProducts = allProducts.filter(p => 
    p.name.toUpperCase().includes("CAPA") ||
    p.name.toUpperCase().includes("MIOLO") ||
    p.name.toUpperCase().includes("REVISTA") ||
    p.name.toUpperCase().includes("DIPTICO") ||
    p.name.toUpperCase().includes("MISSAL") ||
    p.name.toUpperCase().includes("CURRICULO")
  );

  for (const p of catalogoProducts) {
    console.log(`\n📦 ${p.name}`);
    console.log(`   Categoria: ${p.category.name}`);
    if (p.widthMm && p.heightMm) {
      console.log(`   Dimensões: ${p.widthMm}x${p.heightMm}mm (${((p.widthMm * p.heightMm) / 1000000).toFixed(4)} m²)`);
    }
    if (p.printing) {
      console.log(`   Impressão: ${p.printing.formatLabel || p.printing.technology} ${p.printing.colors || ""}`);
    }
    if (p.materials && p.materials.length > 0) {
      console.log(`   Materiais (${p.materials.length}):`);
      for (const m of p.materials) {
        console.log(`     - ${m.material.name} (${m.qtyPerUnit} un/unidade)`);
      }
    }
    if (p.finishes && p.finishes.length > 0) {
      console.log(`   Acabamentos (${p.finishes.length}):`);
      for (const f of p.finishes) {
        console.log(`     - ${f.finish.name} (${f.finish.category})`);
      }
    }
    if (p.suggestedQuantities && p.suggestedQuantities.length > 0) {
      const qty = p.suggestedQuantities.map(sq => sq.quantity).join(", ");
      console.log(`   Quantidades sugeridas: ${qty}`);
    }
  }

  // Resumo de problemas
  console.log("\n" + "=".repeat(120));
  console.log("⚠️  PROBLEMAS ENCONTRADOS:");
  console.log("=".repeat(120));
  console.log();

  if (problems.length === 0) {
    console.log("✅ Nenhum problema crítico encontrado!");
  } else {
    console.log(`❌ ${problems.length} problema(s) crítico(s):`);
    for (const prob of problems) {
      console.log(`   - ${prob.product}: ${prob.issue}`);
    }
  }

  console.log();
  if (warnings.length === 0) {
    console.log("✅ Nenhum aviso encontrado!");
  } else {
    console.log(`⚠️  ${warnings.length} aviso(s):`);
    for (const warn of warnings.slice(0, 20)) {
      console.log(`   - ${warn.product}: ${warn.issue}`);
    }
    if (warnings.length > 20) {
      console.log(`   ... e mais ${warnings.length - 20} avisos`);
    }
  }

  // Estatísticas
  console.log("\n" + "=".repeat(120));
  console.log("📊 ESTATÍSTICAS:");
  console.log("=".repeat(120));
  console.log();
  console.log(`Total de produtos: ${allProducts.length}`);
  console.log(`Com impressão: ${allProducts.filter(p => p.printingId).length}`);
  console.log(`Com materiais: ${allProducts.filter(p => p.materials && p.materials.length > 0).length}`);
  console.log(`Com acabamentos: ${allProducts.filter(p => p.finishes && p.finishes.length > 0).length}`);
  console.log(`Com dimensões: ${allProducts.filter(p => p.widthMm && p.heightMm).length}`);
  console.log(`Com quantidades sugeridas: ${allProducts.filter(p => p.suggestedQuantities && p.suggestedQuantities.length > 0).length}`);
  console.log();

  await prisma.$disconnect();
}

main().catch(console.error);

