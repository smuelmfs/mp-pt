import { PrismaClient } from "@prisma/client";
import { calcQuote } from "../lib/calc-quote";

const prisma = new PrismaClient();

async function analyzeProduct(productId: number, quantity: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      printing: true,
      materials: {
        include: {
          material: true,
          variant: true
        }
      },
      finishes: {
        include: {
          finish: true
        }
      },
      dimensions: true
    }
  });

  if (!product) {
    console.log(`❌ Produto ${productId} não encontrado`);
    return;
  }

  console.log(`\n${"=".repeat(120)}`);
  console.log(`📦 PRODUTO: ${product.name}`);
  console.log(`   Categoria: ${product.category.name}`);
  console.log(`   Dimensões: ${product.widthMm}mm x ${product.heightMm}mm`);
  console.log(`   Área: ${((product.widthMm * product.heightMm) / 1000000).toFixed(4)} m²`);
  console.log("=".repeat(120));

  // Materiais
  console.log(`\n📄 MATERIAIS (${product.materials.length}):`);
  for (const pm of product.materials) {
    const mat = pm.material;
    const variant = pm.variant;
    const qtyPerUnit = Number(pm.qtyPerUnit || 1);
    const wasteFactor = Number(pm.wasteFactor || 0);
    const unitCost = Number(mat.unitCost);
    const area = (product.widthMm * product.heightMm) / 1000000; // m²
    
    let cost = 0;
    if (mat.unit === "M2") {
      cost = unitCost * area * qtyPerUnit * (1 + wasteFactor);
    } else if (mat.unit === "SHEET") {
      cost = unitCost * qtyPerUnit * (1 + wasteFactor);
    } else if (mat.unit === "UNIT") {
      cost = unitCost * qtyPerUnit;
    }

    console.log(`  - ${mat.name} (${mat.type})`);
    console.log(`    Unidade: ${mat.unit}`);
    console.log(`    Custo unitário: €${unitCost.toFixed(4)}`);
    console.log(`    Qtd por unidade: ${qtyPerUnit}`);
    console.log(`    Fator de perda: ${(wasteFactor * 100).toFixed(2)}%`);
    if (variant) {
      console.log(`    Variante: ${variant.label} (${variant.widthMm}mm x ${variant.heightMm}mm)`);
    }
    console.log(`    Custo por unidade: €${cost.toFixed(4)}`);
  }

  // Impressão
  if (product.printing) {
    console.log(`\n🖨️  IMPRESSÃO:`);
    console.log(`  - ${product.printing.formatLabel || product.printing.technology}`);
    console.log(`    Tecnologia: ${product.printing.technology}`);
    console.log(`    Cores: ${product.printing.colors || "N/A"}`);
    console.log(`    Preço unitário: €${Number(product.printing.unitPrice || 0).toFixed(4)}`);
    
    const area = (product.widthMm * product.heightMm) / 1000000; // m²
    let printCost = 0;
    if (product.printing.unitPrice) {
      if (product.printing.setupMode === "PER_M2") {
        printCost = Number(product.printing.unitPrice) * area;
      } else if (product.printing.setupMode === "PER_PIECE") {
        printCost = Number(product.printing.unitPrice);
      } else {
        printCost = Number(product.printing.unitPrice) * area;
      }
    }
    console.log(`    Custo por unidade: €${printCost.toFixed(4)}`);
  } else {
    console.log(`\n🖨️  IMPRESSÃO: Nenhuma`);
  }

  // Acabamentos
  console.log(`\n✨ ACABAMENTOS (${product.finishes.length}):`);
  for (const pf of product.finishes) {
    const finish = pf.finish;
    const qtyPerUnit = Number(pf.qtyPerUnit || 1);
    const costOverride = pf.costOverride ? Number(pf.costOverride) : null;
    const baseCost = costOverride || Number(finish.baseCost || 0);
    const cost = baseCost * qtyPerUnit;

    console.log(`  - ${finish.name} (${finish.category})`);
    console.log(`    Custo base: €${baseCost.toFixed(4)}`);
    console.log(`    Qtd por unidade: ${qtyPerUnit}`);
    console.log(`    Custo por unidade: €${cost.toFixed(4)}`);
  }

  // Calcular cotação
  console.log(`\n💰 CÁLCULO PARA ${quantity} UNIDADES:`);
  try {
    const result = await calcQuote(productId, quantity, {}, {});
    
    console.log(`  Subtotal produção: €${Number(result.subtotalProduction).toFixed(2)}`);
    console.log(`  Subtotal: €${Number(result.subtotal).toFixed(2)}`);
    console.log(`  Markup: ${(Number(result.markup) * 100).toFixed(2)}%`);
    console.log(`  Margem: ${(Number(result.margin) * 100).toFixed(2)}%`);
    console.log(`  Ajuste dinâmico: ${(Number(result.dynamic) * 100).toFixed(2)}%`);
    console.log(`  Preço final: €${Number(result.final).toFixed(2)}`);
    console.log(`  Preço unitário: €${(Number(result.final) / quantity).toFixed(2)}`);
    
    // Breakdown
    if (result.items && result.items.length > 0) {
      console.log(`\n  📋 BREAKDOWN:`);
      for (const item of result.items) {
        console.log(`    - ${item.name}: €${Number(item.totalCost).toFixed(4)}`);
      }
    }
  } catch (error: any) {
    console.log(`  ❌ Erro ao calcular: ${error.message}`);
  }
}

async function main() {
  console.log("=".repeat(120));
  console.log("🔍 ANÁLISE DE CONFIGURAÇÃO DE PRODUTOS");
  console.log("=".repeat(120));

  // Analisar Pastas A4
  const pastasA4 = await prisma.product.findMany({
    where: {
      category: { name: { equals: "Pastas A4", mode: "insensitive" } }
    },
    take: 3
  });

  for (const product of pastasA4) {
    await analyzeProduct(product.id, 50);
  }

  // Analisar Envelopes
  const envelopes = await prisma.product.findMany({
    where: {
      category: { name: { equals: "Papelaria", mode: "insensitive" } },
      name: { contains: "envelope", mode: "insensitive" }
    },
    take: 2
  });

  for (const product of envelopes) {
    await analyzeProduct(product.id, 50);
  }

  await prisma.$disconnect();
}

main().catch(console.error);

