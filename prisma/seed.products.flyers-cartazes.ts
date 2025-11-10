import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Cria produtos de Flyers e Cartazes baseados nos dados extraídos
 */

interface ProductDef {
  name: string;
  category: string;
  widthMm: number;
  heightMm: number;
  printing: string;
  material: string;
  finishes?: string[];
}

const PRODUCTS: ProductDef[] = [
  // FLYERS
  {
    name: "Flyer A6 - Frente",
    category: "Papelaria",
    widthMm: 105,
    heightMm: 148,
    printing: "SRA3 CMYK FRENTE",
    material: "Papel Condat Gloss 150g"
  },
  {
    name: "Flyer A6 - Frente / Verso",
    category: "Papelaria",
    widthMm: 105,
    heightMm: 148,
    printing: "SRA3 CMYK FRENTE / VERSO",
    material: "Papel Condat Gloss 150g"
  },
  {
    name: "Flyer A5 - Frente",
    category: "Papelaria",
    widthMm: 148,
    heightMm: 210,
    printing: "SRA3 CMYK FRENTE",
    material: "Papel Condat Gloss 150g"
  },
  {
    name: "Flyer A5 - Frente / Verso",
    category: "Papelaria",
    widthMm: 148,
    heightMm: 210,
    printing: "SRA3 CMYK FRENTE / VERSO",
    material: "Papel Condat Gloss 150g"
  },
  {
    name: "Flyer A4 - Frente / Verso",
    category: "Papelaria",
    widthMm: 210,
    heightMm: 297,
    printing: "SRA3 CMYK FRENTE / VERSO",
    material: "Papel Condat Gloss 150g"
  },
  // CARTAZES
  {
    name: "Cartaz A4 - Frente",
    category: "Papelaria",
    widthMm: 210,
    heightMm: 297,
    printing: "SRA3 CMYK FRENTE",
    material: "Papel Condat Gloss 250g"
  },
  {
    name: "Cartaz A3 - Frente",
    category: "Papelaria",
    widthMm: 297,
    heightMm: 420,
    printing: "SRA3 CMYK FRENTE",
    material: "Papel Condat Gloss 250g"
  },
  {
    name: "Cartaz A2 - Frente",
    category: "Papelaria",
    widthMm: 420,
    heightMm: 594,
    printing: "BANNER CMYK FRENTE",
    material: "Papel Condat Gloss 250g"
  }
];

async function main() {
  console.log("📦 Criando produtos de Flyers e Cartazes...\n");

  const category = await prisma.productCategory.findFirst({
    where: { name: { equals: "Papelaria", mode: "insensitive" } }
  });

  if (!category) {
    console.error("❌ Categoria 'Papelaria' não encontrada");
    return;
  }

  let created = 0;
  let updated = 0;

  for (const prodDef of PRODUCTS) {
    // Buscar impressão
    const printing = await prisma.printing.findFirst({
      where: {
        formatLabel: { contains: prodDef.printing, mode: "insensitive" }
      }
    });

    if (!printing) {
      console.warn(`  ⚠️  Impressão não encontrada: ${prodDef.printing}`);
      continue;
    }

    // Buscar material
    const material = await prisma.material.findFirst({
      where: {
        name: { contains: prodDef.material, mode: "insensitive" },
        isCurrent: true
      }
    });

    if (!material) {
      console.warn(`  ⚠️  Material não encontrado: ${prodDef.material}`);
      continue;
    }

    // Criar ou atualizar produto
    const existing = await prisma.product.findFirst({
      where: {
        name: { equals: prodDef.name, mode: "insensitive" }
      }
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          categoryId: category.id,
          printingId: printing.id,
          widthMm: prodDef.widthMm,
          heightMm: prodDef.heightMm,
          active: true
        }
      });
      updated++;
      console.log(`  ✅ ${prodDef.name} (atualizado)`);
    } else {
      const product = await prisma.product.create({
        data: {
          name: prodDef.name,
          categoryId: category.id,
          printingId: printing.id,
          widthMm: prodDef.widthMm,
          heightMm: prodDef.heightMm,
          active: true
        }
      });

      // Associar material
      await prisma.productMaterial.create({
        data: {
          productId: product.id,
          materialId: material.id,
          qtyPerUnit: "1.0000",
          wasteFactor: "0.1000"
        }
      });

      created++;
      console.log(`  ✅ ${prodDef.name} (criado)`);
    }
  }

  console.log(`\n${"=".repeat(120)}`);
  console.log(`✅ RESUMO:`);
  console.log(`  - Criados: ${created}`);
  console.log(`  - Atualizados: ${updated}`);
  console.log("=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

