import { PrismaClient, RoundingStrategy, PricingStrategy, PrintingTech } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DATA_PATH = path.resolve(process.cwd(), "data", "products-impressoes-singulares.json");

interface SingularProduct {
  customer?: string;
  description: string;
  quantity: number;
  quantityPerPlano?: number;
  paperQuantity?: number;
  printingUnitCost: number;
  printingCost: number;
  paperUnitCost: number;
  paperCost: number;
  cutCost?: number;
  plastCost?: number;
  foilCost?: number;
  totalCost: number;
  marginPercent: number;
  finalTotal?: number;
  finalUnit?: number;
}

function extractDimensions(description: string): { widthMm: number; heightMm: number } | null {
  const desc = description.toUpperCase().trim();
  
  // Padrões conhecidos primeiro
  if (desc.includes("A5")) {
    // Verificar se é A5 com dobra (vira A6)
    if (desc.includes("DOBRA")) {
      return { widthMm: 105, heightMm: 148 };
    }
    return { widthMm: 148, heightMm: 210 };
  }
  if (desc.includes("A6")) {
    return { widthMm: 105, heightMm: 148 };
  }
  if (desc.includes("A4")) {
    return { widthMm: 210, heightMm: 297 };
  }
  if (desc.includes("A3")) {
    return { widthMm: 297, heightMm: 420 };
  }
  if (desc.includes("A2")) {
    return { widthMm: 420, heightMm: 594 };
  }

  // Padrões com unidades: "110x215mm", "65x110mm", "21,5x21cm"
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*mm/i,
    /(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*cm/i,
    /(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*m\b/i,
    /(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)/i
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = description.match(pattern);
    if (match) {
      let width = parseFloat(match[1].replace(",", "."));
      let height = parseFloat(match[2].replace(",", "."));
      
      // Se tem "cm", converter para mm
      if (i === 1 || (i === 3 && description.toLowerCase().includes("cm"))) {
        width *= 10;
        height *= 10;
      }
      // Se tem "m" (mas não "mm" ou "cm"), converter para mm
      else if (i === 2 || (i === 3 && description.toLowerCase().includes("m") && 
                           !description.toLowerCase().includes("mm") && 
                           !description.toLowerCase().includes("cm"))) {
        // Só converter se o número for pequeno (provavelmente metros)
        if (width < 10 && height < 10) {
          width *= 1000;
          height *= 1000;
        }
      }
      
      // Validação: se as dimensões são muito grandes, provavelmente está errado
      if (width > 2000 || height > 2000) {
        // Tentar interpretar como cm se for muito grande
        if (width > 100 || height > 100) {
          width /= 10;
          height /= 10;
        }
      }
      
      return { widthMm: Math.round(width), heightMm: Math.round(height) };
    }
  }

  // Padrões específicos conhecidos
  if (desc.includes("CARTÃO") && desc.includes("80X80")) {
    return { widthMm: 80, heightMm: 80 };
  }
  if (desc.includes("CARTÃO") && desc.includes("120X120")) {
    return { widthMm: 120, heightMm: 120 };
  }
  if (desc.includes("VOUCHER") && desc.includes("110X215")) {
    return { widthMm: 110, heightMm: 215 };
  }
  if (desc.includes("PAGELA") && desc.includes("65X110")) {
    return { widthMm: 65, heightMm: 110 };
  }
  if (desc.includes("PAGELA") && desc.includes("75X220")) {
    return { widthMm: 75, heightMm: 220 };
  }
  if (desc.includes("PAGELA") && desc.includes("87X120")) {
    return { widthMm: 87, heightMm: 120 };
  }
  if (desc.includes("CARTAZ CEIA") && desc.includes("453X224")) {
    return { widthMm: 453, heightMm: 224 };
  }
  if (desc.includes("FLYER") && desc.includes("95X188")) {
    return { widthMm: 95, heightMm: 188 };
  }
  if (desc.includes("FLYER") && desc.includes("25X25")) {
    return { widthMm: 25, heightMm: 25 };
  }
  if (desc.includes("PAPEL VINIL") && desc.includes("220X90")) {
    return { widthMm: 220, heightMm: 90 };
  }
  if (desc.includes("DIPTICO A5")) {
    return { widthMm: 148, heightMm: 210 };
  }
  if (desc.includes("CONVITE") && desc.includes("21,5X21")) {
    return { widthMm: 215, heightMm: 210 };
  }
  if (desc.includes("FOLHETO A5")) {
    return { widthMm: 148, heightMm: 210 };
  }
  if (desc.includes("BLOCO A5")) {
    return { widthMm: 148, heightMm: 210 };
  }

  return null;
}

function determinePrinting(printingUnitCost: number): { technology: PrintingTech; formatLabel: string; colors: string } {
  // Baseado no custo unitário, determinar impressão
  if (printingUnitCost >= 0.15 && printingUnitCost <= 0.17) {
    return {
      technology: PrintingTech.DIGITAL,
      formatLabel: "SRA3 CMYK FRENTE / VERSO",
      colors: "CMYK"
    };
  }
  if (printingUnitCost >= 0.08 && printingUnitCost <= 0.10) {
    return {
      technology: PrintingTech.DIGITAL,
      formatLabel: "SRA3 CMYK FRENTE",
      colors: "CMYK"
    };
  }
  // Padrão
  return {
    technology: PrintingTech.DIGITAL,
    formatLabel: "SRA3 CMYK FRENTE",
    colors: "CMYK"
  };
}

function determineMaterial(paperUnitCost: number, description: string): string {
  // Baseado no custo unitário do papel
  if (paperUnitCost >= 0.35 && paperUnitCost <= 0.40) {
    return "Papel Digilabel Com Cortes Silk Autocolante";
  }
  if (paperUnitCost >= 0.15 && paperUnitCost <= 0.20) {
    return "Papel Condat Gloss 250g";
  }
  if (paperUnitCost >= 0.06 && paperUnitCost <= 0.08) {
    return "Papel Condat Gloss 150g";
  }
  if (paperUnitCost >= 0.10 && paperUnitCost <= 0.12) {
    return "Papel Condat Gloss 170g";
  }
  // Padrão
  return "Papel Condat Gloss 150g";
}

async function main() {
  console.log("=".repeat(120));
  console.log("📦 Importando Produtos de Impressões Singulares");
  console.log("=".repeat(120));
  console.log();

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${DATA_PATH}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as SingularProduct[];

  // Agrupar por descrição (produtos únicos)
  const productsMap = new Map<string, SingularProduct[]>();
  for (const item of data) {
    const key = item.description.toUpperCase().trim();
    if (!productsMap.has(key)) {
      productsMap.set(key, []);
    }
    productsMap.get(key)!.push(item);
  }

  console.log(`📋 Total de produtos únicos: ${productsMap.size}`);
  console.log();

  // Buscar categoria
  const category = await prisma.productCategory.findFirst({
    where: { name: { equals: "Papelaria", mode: "insensitive" } }
  });

  if (!category) {
    console.error("❌ Categoria 'Papelaria' não encontrada");
    return;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [description, items] of productsMap.entries()) {
    // Usar o primeiro item como base
    const baseItem = items[0];

    // Extrair dimensões
    const dims = extractDimensions(baseItem.description);
    if (!dims) {
      console.warn(`  ⚠️  ${description}: Dimensões não encontradas, pulando`);
      skipped++;
      continue;
    }

    // Determinar impressão
    const printingInfo = determinePrinting(baseItem.printingUnitCost);
    let printing = await prisma.printing.findFirst({
      where: {
        formatLabel: { contains: printingInfo.formatLabel, mode: "insensitive" },
        technology: printingInfo.technology,
        isCurrent: true
      }
    });

    if (!printing) {
      // Criar impressão se não existir
      printing = await prisma.printing.create({
        data: {
          technology: printingInfo.technology,
          formatLabel: printingInfo.formatLabel,
          colors: printingInfo.colors,
          unitPrice: baseItem.printingUnitCost.toFixed(4),
          active: true,
          isCurrent: true
        }
      });
    }

    // Determinar material
    const materialName = determineMaterial(baseItem.paperUnitCost, baseItem.description);
    const material = await prisma.material.findFirst({
      where: {
        name: { contains: materialName, mode: "insensitive" },
        isCurrent: true
      }
    });

    if (!material) {
      console.warn(`  ⚠️  ${description}: Material não encontrado (${materialName}), pulando`);
      skipped++;
      continue;
    }

    // Criar ou atualizar produto
    const productName = description;
    const existing = await prisma.product.findFirst({
      where: {
        name: { equals: productName, mode: "insensitive" },
        categoryId: category.id
      }
    });

    let productId: number;
    if (!existing) {
      const product = await prisma.product.create({
        data: {
          name: productName,
          categoryId: category.id,
          printingId: printing.id,
          widthMm: dims.widthMm,
          heightMm: dims.heightMm,
          roundingStep: "0.0500",
          roundingStrategy: RoundingStrategy.PER_STEP,
          pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
          markupDefault: "0.2000",
          marginDefault: "0.3000",
          active: true
        }
      });
      productId = product.id;
      created++;
      console.log(`  ✅ ${productName} (${dims.widthMm}x${dims.heightMm}mm)`);
    } else {
      productId = existing.id;
      // Atualizar dimensões se necessário
      if (existing.widthMm !== dims.widthMm || existing.heightMm !== dims.heightMm) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { widthMm: dims.widthMm, heightMm: dims.heightMm }
        });
        updated++;
        console.log(`  ✅ ${productName} (atualizado: ${dims.widthMm}x${dims.heightMm}mm)`);
      } else {
        skipped++;
      }
    }

    // Associar material
    const existingMat = await prisma.productMaterial.findFirst({
      where: { productId, materialId: material.id }
    });

    if (!existingMat) {
      await prisma.productMaterial.create({
        data: {
          productId,
          materialId: material.id,
          qtyPerUnit: "1.0000",
          wasteFactor: "0.1000"
        }
      });
    }

    // Associar acabamentos
    if (baseItem.cutCost && baseItem.cutCost > 0) {
      const cutFinish = await prisma.finish.findFirst({
        where: { name: { contains: "NORMAL", mode: "insensitive" }, category: "CORTE" }
      });
      if (cutFinish) {
        const existingCut = await prisma.productFinish.findFirst({
          where: { productId, finishId: cutFinish.id }
        });
        if (!existingCut) {
          await prisma.productFinish.create({
            data: { productId, finishId: cutFinish.id, qtyPerUnit: "1.0000" }
          });
        }
      }
    }

    if (baseItem.plastCost && baseItem.plastCost > 0) {
      const plastFinish = await prisma.finish.findFirst({
        where: { name: { contains: "Plastificação", mode: "insensitive" }, category: "LAMINACAO" }
      });
      if (plastFinish) {
        const existingPlast = await prisma.productFinish.findFirst({
          where: { productId, finishId: plastFinish.id }
        });
        if (!existingPlast) {
          await prisma.productFinish.create({
            data: { productId, finishId: plastFinish.id, qtyPerUnit: "1.0000" }
          });
        }
      }
    }

    if (baseItem.foilCost && baseItem.foilCost > 0) {
      const foilFinish = await prisma.finish.findFirst({
        where: { name: { contains: "Foil", mode: "insensitive" }, category: "LAMINACAO" }
      });
      if (foilFinish) {
        const existingFoil = await prisma.productFinish.findFirst({
          where: { productId, finishId: foilFinish.id }
        });
        if (!existingFoil) {
          await prisma.productFinish.create({
            data: { productId, finishId: foilFinish.id, qtyPerUnit: "1.0000" }
          });
        }
      }
    }

    // Adicionar quantidades sugeridas
    const quantities = items.map(i => i.quantity).filter((q, i, arr) => arr.indexOf(q) === i).sort((a, b) => a - b);
    if (quantities.length > 0) {
      // Limpar quantidades existentes
      await prisma.productSuggestedQuantity.deleteMany({ where: { productId } });
      
      // Criar novas
      for (let i = 0; i < Math.min(quantities.length, 10); i++) {
        await prisma.productSuggestedQuantity.create({
          data: {
            productId,
            quantity: quantities[i],
            order: i + 1
          }
        });
      }
    }
  }

  console.log(`\n${"=".repeat(120)}`);
  console.log(`✅ RESUMO:`);
  console.log(`  - Criados: ${created}`);
  console.log(`  - Atualizados: ${updated}`);
  console.log(`  - Pulados: ${skipped}`);
  console.log(`  - Total processado: ${productsMap.size}`);
  console.log("=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

