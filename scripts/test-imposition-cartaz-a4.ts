import { computeImposition } from "../lib/imposition";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(120));
  console.log("🧪 TESTE DE IMPOSIÇÃO: CARTAZ A4");
  console.log("=".repeat(120));
  console.log();

  // Buscar produto e material
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: "CARTAZ A4", mode: "insensitive" }
    },
    include: {
      materials: {
        include: {
          material: true,
          variant: true
        }
      }
    }
  });

  if (!product) {
    console.log("❌ Produto não encontrado");
    await prisma.$disconnect();
    return;
  }

  const pm = product.materials[0];
  if (!pm) {
    console.log("❌ Material não encontrado");
    await prisma.$disconnect();
    return;
  }

  console.log(`✅ Produto: ${product.name}`);
  console.log(`   Dimensões: ${product.widthMm}mm × ${product.heightMm}mm`);
  console.log();
  console.log(`✅ Material: ${pm.material.name}`);
  
  // Buscar variantes do material
  const variants = await prisma.materialVariant.findMany({
    where: { materialId: pm.material.id }
  });
  
  console.log(`   Variantes encontradas: ${variants.length}`);
  if (variants.length > 0) {
    variants.forEach(v => {
      console.log(`     - ${v.name || "N/A"} (${v.widthMm}mm × ${v.heightMm}mm)`);
    });
  }
  
  // Usar variante se disponível, senão usar dimensões padrão SRA3
  const sheetWidth = pm.variant?.widthMm || 320; // SRA3 padrão
  const sheetHeight = pm.variant?.heightMm || 450; // SRA3 padrão
  
  console.log();
  console.log(`   Dimensões da Folha: ${sheetWidth}mm × ${sheetHeight}mm`);
  console.log(`   Waste Factor: ${pm.wasteFactor || 0}`);
  console.log(`   Loss Factor: ${(pm as any).lossFactor || (pm.material as any).lossFactor || 0}`);
  console.log();

  // Calcular imposição
  const imposition = computeImposition({
    productWidthMm: product.widthMm,
    productHeightMm: product.heightMm,
    sheetWidthMm: sheetWidth,
    sheetHeightMm: sheetHeight,
    bleedMm: 3,
    gutterMm: 2,
  });

  console.log("📐 CÁLCULO DE IMPOSIÇÃO:");
  console.log(`   Peças por Folha: ${imposition.piecesPerSheet}`);
  console.log(`   Orientação: ${imposition.orientation}`);
  console.log();

  // Testar diferentes quantidades
  const quantities = [50, 100, 250, 500, 750];
  
  console.log("📊 CÁLCULO DE FOLHAS NECESSÁRIAS:");
  console.log();
  
  for (const qty of quantities) {
    // Cálculo do sistema (com waste e loss)
    const waste = pm.wasteFactor || 0;
    const loss = (pm as any).lossFactor || (pm.material as any).lossFactor || 0;
    
    if (imposition.piecesPerSheet > 0) {
      const baseSheets = Math.ceil(qty / imposition.piecesPerSheet);
      const sheetsWithLoss = Math.ceil(baseSheets * (1 + loss));
      const totalSheets = sheetsWithLoss;
      
      console.log(`   Quantidade: ${qty} unidades`);
      console.log(`     Peças por folha: ${imposition.piecesPerSheet}`);
      console.log(`     Folhas base (sem waste/loss): ${baseSheets}`);
      console.log(`     Folhas com loss (${(loss * 100).toFixed(0)}%): ${sheetsWithLoss}`);
      console.log(`     Folhas totais: ${totalSheets}`);
      console.log();
    }
  }

  // Comparar com planilha
  console.log("=".repeat(120));
  console.log("📊 COMPARAÇÃO COM PLANILHA:");
  console.log("=".repeat(120));
  console.log();
  console.log("Planilha Excel usa 2 folhas fixas para todas as quantidades (INCORRETO)");
  console.log("Sistema calcula baseado em imposição (CORRETO)");
  console.log();
  console.log("Para 50 unidades:");
  console.log(`  Planilha: 2 folhas (fixo)`);
  console.log(`  Sistema: ${Math.ceil(50 / imposition.piecesPerSheet)} folhas base`);
  console.log(`  Sistema (com loss): ${Math.ceil(Math.ceil(50 / imposition.piecesPerSheet) * (1 + ((pm as any).lossFactor || (pm.material as any).lossFactor || 0)))} folhas`);
  console.log();

  await prisma.$disconnect();
}

main().catch(console.error);

