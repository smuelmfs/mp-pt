import { PrismaClient, Unit, PrintingTech, FinishCategory, FinishCalcType, MarginScope } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.configGlobal.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, marginDefault: "0.30", markupOperational: "0.20", roundingStep: "0.05", lossFactor: "0.02" },
  });

  const cat = await prisma.productCategory.upsert({
    where: { name: "Papelaria" },
    update: {},
    create: { name: "Papelaria", roundingStep: "0.05" },
  });

  const papel = await prisma.material.create({
    data: {
      name: "Couché",
      type: "papel",
      unit: Unit.SHEET,
      unitCost: "0.0400",
      variants: {
        create: {
          label: "Couché 300g 66x96",
          gramagem: 300,
          widthMm: 660,
          heightMm: 960,
          sheetsPerPack: 500,
          packPrice: "20.00",
          unitPrice: "0.0400",
        },
      },
    },
  });

  const imp = await prisma.printing.create({
    data: {
      technology: PrintingTech.OFFSET,
      formatLabel: "SRA3",
      colors: "4x4",
      sides: 2,
      unitPrice: "50.0000",
      yield: 250,
      setupMinutes: 15,
      minFee: "15.00",
    },
  });

  const lam = await prisma.finish.create({
    data: {
      name: "Laminação Fosca",
      category: FinishCategory.LAMINACAO,
      unit: Unit.M2,
      baseCost: "2.0000",
      marginDefault: "0.1500",
      calcType: FinishCalcType.PER_M2,
      minFee: "5.00",
      areaStepM2: "0.10",
    },
  });

  const product = await prisma.product.create({
    data: {
      name: "Cartão de Visita 9x5",
      categoryId: cat.id,
      printingId: imp.id,
      marginDefault: "0.30",
      markupDefault: "0.20",
      roundingStep: "0.05",
      attributesSchema: { largura_mm: 90, altura_mm: 50 },
      materials: {
        create: [{
          materialId: papel.id,
          qtyPerUnit: "0.0200", // 1 folha ~50 cartões -> 0.02 folha/cartão
          wasteFactor: "0.02",
        }],
      },
      finishes: {
        create: [{
          finishId: lam.id,
          calcTypeOverride: FinishCalcType.PER_M2,
          qtyPerUnit: "0.0050", // ~área em m² por cartão
        }],
      },
    },
  });

  await prisma.marginRule.create({
    data: { scope: MarginScope.GLOBAL, margin: "0.30", active: true },
  });

  await prisma.marginRuleDynamic.create({
    data: {
      scope: MarginScope.PRODUCT,
      productId: product.id,
      minSubtotal: "500.00",
      adjustPercent: "-0.0500",
      priority: 10,
      stackable: false,
      active: true,
    },
  });

  console.log("Seed concluído.");
}

main().finally(async () => { await prisma.$disconnect(); });
