import { PrismaClient, RoundingStrategy, PricingStrategy, PrintingTech } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DATA_PATH = path.resolve(process.cwd(), "data", "products-catalogos.json");

interface CatalogoProduct {
  customer?: string;
  description: string;
  quantity: number;
  pages: number;
  printedFaces: number;
  printingCost: number;
  paperSheets: number;
  paperUnitCost: number;
  paperCost: number;
  cutCost?: number;
  plastCost?: number;
  foilCost?: number;
  agrafoCost?: number;
  totalCost: number;
  unitCost?: number;
  marginPercent: number;
  finalTotal?: number;
  finalUnit?: number;
}

function extractDimensions(description: string): { widthMm: number; heightMm: number } | null {
  const desc = description.toUpperCase().trim();
  
  // Padrões conhecidos
  if (desc.includes("A5")) {
    return { widthMm: 148, heightMm: 210 };
  }
  if (desc.includes("A4")) {
    return { widthMm: 210, heightMm: 297 };
  }
  if (desc.includes("A3")) {
    return { widthMm: 297, heightMm: 420 };
  }

  // Padrões com dimensões: "100x210"
  const pattern = /(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)/i;
  const match = description.match(pattern);
  if (match) {
    let width = parseFloat(match[1].replace(",", "."));
    let height = parseFloat(match[2].replace(",", "."));
    
    // Se os números são pequenos, provavelmente são em cm
    if (width < 30 && height < 30) {
      width *= 10;
      height *= 10;
    }
    
    return { widthMm: Math.round(width), heightMm: Math.round(height) };
  }

  // Padrão padrão para catálogos (A4)
  return { widthMm: 210, heightMm: 297 };
}

function determinePrinting(printingCost: number, printedFaces: number): { technology: PrintingTech; formatLabel: string; colors: string } {
  const unitCost = printingCost / printedFaces;
  
  // Baseado no custo unitário
  if (unitCost >= 0.04 && unitCost <= 0.06) {
    return {
      technology: PrintingTech.DIGITAL,
      formatLabel: "SRA3 CMYK FRENTE",
      colors: "CMYK"
    };
  }
  
  // Padrão
  return {
    technology: PrintingTech.DIGITAL,
    formatLabel: "SRA3 CMYK FRENTE / VERSO",
    colors: "CMYK"
  };
}

function determineMaterial(paperUnitCost: number, description: string): string {
  const desc = description.toUpperCase();
  
  // Baseado na gramagem mencionada
  if (desc.includes("150 GRS") || desc.includes("150GRS") || desc.includes("150G")) {
    return "Papel Condat Gloss 150g";
  }
  if (desc.includes("170 GRS") || desc.includes("170GRS") || desc.includes("170G")) {
    return "Papel Condat Gloss 170g";
  }
  if (desc.includes("250 GRS") || desc.includes("250GRS") || desc.includes("250G")) {
    return "Papel Condat Gloss 250g";
  }
  if (desc.includes("350 GRS") || desc.includes("350GRS") || desc.includes("350G")) {
    return "Papel Condat Gloss 350g";
  }
  
  // Baseado no custo unitário
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

function normalizeProductName(description: string): string {
  // Remover nome do cliente e normalizar
  let name = description
    .replace(/^(CAPA|MIOLO)\s+/i, "")
    .replace(/\s+(PAV\.|EST\.|FACHADA)\s+/gi, " ")
    .replace(/\s+PAPEL\s+\d+\s*GRS?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  
  // Adicionar prefixo se necessário
  if (description.toUpperCase().includes("CAPA")) {
    name = `Capa ${name}`;
  } else if (description.toUpperCase().includes("MIOLO")) {
    name = `Miolo ${name}`;
  }
  
  // Capitalizar primeira letra
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

async function main() {
  console.log("=".repeat(120));
  console.log("📦 Importando Produtos de Catálogos");
  console.log("=".repeat(120));
  console.log();

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${DATA_PATH}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as CatalogoProduct[];

  // Agrupar por descrição normalizada (produtos únicos)
  const productsMap = new Map<string, CatalogoProduct[]>();
  for (const item of data) {
    const key = normalizeProductName(item.description).toUpperCase().trim();
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

  for (const [normalizedName, items] of productsMap.entries()) {
    const baseItem = items[0];
    
    // Extrair dimensões
    const dims = extractDimensions(baseItem.description);
    if (!dims) {
      console.warn(`  ⚠️  ${normalizedName}: Dimensões não encontradas, pulando`);
      skipped++;
      continue;
    }

    // Determinar impressão
    const printingInfo = determinePrinting(baseItem.printingCost, baseItem.printedFaces);
    let printing = await prisma.printing.findFirst({
      where: {
        formatLabel: { contains: printingInfo.formatLabel, mode: "insensitive" },
        technology: printingInfo.technology,
        isCurrent: true
      }
    });

    if (!printing) {
      // Criar impressão se não existir
      const unitPrice = baseItem.printingCost / baseItem.printedFaces;
      printing = await prisma.printing.create({
        data: {
          technology: printingInfo.technology,
          formatLabel: printingInfo.formatLabel,
          colors: printingInfo.colors,
          unitPrice: unitPrice.toFixed(4),
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
      console.warn(`  ⚠️  ${normalizedName}: Material não encontrado (${materialName}), pulando`);
      skipped++;
      continue;
    }

    // Criar nome do produto
    const productName = normalizeProductName(baseItem.description);

    // Criar ou atualizar produto
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
      console.log(`  ✅ ${productName} (${dims.widthMm}x${dims.heightMm}mm, ${baseItem.pages} páginas)`);
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
      // Calcular qtyPerUnit baseado em páginas
      const qtyPerUnit = baseItem.pages > 0 ? (baseItem.paperSheets / baseItem.quantity / baseItem.pages).toFixed(4) : "1.0000";
      await prisma.productMaterial.create({
        data: {
          productId,
          materialId: material.id,
          qtyPerUnit,
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

    // Agrafo (criar acabamento se não existir)
    if (baseItem.agrafoCost && baseItem.agrafoCost > 0) {
      let agrafoFinish = await prisma.finish.findFirst({
        where: { name: { contains: "Agrafo", mode: "insensitive" }, category: "OUTROS" }
      });
      
      if (!agrafoFinish) {
        agrafoFinish = await prisma.finish.create({
          data: {
            name: "Agrafo",
            category: "OUTROS",
            unit: "UNIT",
            calcType: "PER_UNIT",
            baseCost: "0.0100",
            active: true,
            isCurrent: true
          }
        });
      }
      
      const existingAgrafo = await prisma.productFinish.findFirst({
        where: { productId, finishId: agrafoFinish.id }
      });
      if (!existingAgrafo) {
        await prisma.productFinish.create({
          data: { productId, finishId: agrafoFinish.id, qtyPerUnit: "1.0000" }
        });
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

