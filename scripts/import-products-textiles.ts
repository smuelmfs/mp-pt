import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";
import { Unit, PrintingTech, PricingStrategy, RoundingStrategy } from "@prisma/client";

const dec4 = (v: any) => (v == null ? null : Number(String(v).replace(",", ".")).toFixed(4));
const dec4s = (v: any) => (v == null ? null : Number(String(v).replace(",", ".")).toFixed(4));
const s = (v: any) => (v === null || v === undefined ? null : String(v));
const eqDec4 = (a: any, b: any) => {
  const normA = a == null ? null : (typeof a === "object" && a.toString ? Number(a.toString()).toFixed(4) : dec4s(a));
  return normA === dec4(b);
};
const eq = (a: any, b: any) => s(a) === s(b);

export async function runImportProductsTextiles() {
  const dataPath = path.resolve(process.cwd(), "data/normalized/textiles.customer.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const summary = {
    categoryId: 0,
    customersUpserted: 0,
    productsBaseCreated: 0,
    printingsCreated: 0,
    printingsUpdated: 0,
    materialsCreated: 0,
    materialsUpdated: 0,
    finishesCreated: 0,
    finishesUpdated: 0,
    printingCustomerPrices: 0,
    materialCustomerPrices: 0,
    finishCustomerPrices: 0,
    productOverrides: 0,
  };

  // Category
  const category = await prisma.productCategory.upsert({
    where: { name: "Têxteis Personalizados" },
    update: {},
    create: {
      name: "Têxteis Personalizados",
      roundingStep: "0.0500",
      roundingStrategy: RoundingStrategy.PER_STEP,
      pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
    },
  });
  summary.categoryId = category.id;

  // CustomerGroup
  const group = await prisma.customerGroup.upsert({
    where: { name: "Textiles" },
    update: {},
    create: { name: "Textiles" },
  });

  // Collect unique productKeys and printing formatLabels
  const productKeys = new Set<string>();
  const printingLabels = new Set<string>();

  for (const item of data) {
    productKeys.add(item.productKey);
    printingLabels.add(item.printing.formatLabel);
  }

  // Create base Printings (one per formatLabel)
  const printingMap = new Map<string, any>();
  for (const label of printingLabels) {
    let printing = await prisma.printing.findFirst({
      where: {
        technology: PrintingTech.DIGITAL,
        formatLabel: { equals: label, mode: "insensitive" },
        colors: null,
        sides: 1,
        isCurrent: true,
      },
    });

    if (!printing) {
      printing = await prisma.printing.create({
        data: {
          technology: PrintingTech.DIGITAL,
          formatLabel: label,
          colors: null,
          sides: 1,
          unitPrice: "0.1000", // Preço base baixo, será sobreposto por CustomerPrice
          active: true,
          isCurrent: true,
        },
      });
      summary.printingsCreated++;
    } else {
      const updates: any = {};
      if (!eqDec4(printing.unitPrice, "0.1000")) {
        updates.unitPrice = "0.1000";
        await prisma.printing.update({ where: { id: printing.id }, data: updates });
        summary.printingsUpdated++;
      }
    }
    printingMap.set(label, printing);
  }

  // Create base Products (one per productKey)
  const productMap = new Map<string, any>();
  for (const productKey of productKeys) {
    let product = await prisma.product.findFirst({
      where: { name: { equals: productKey, mode: "insensitive" }, categoryId: category.id },
    });

    // Get first printing for this product type (use DTF_UNIT as default)
    const defaultPrinting = printingMap.get("DTF_UNIT") || Array.from(printingMap.values())[0];

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: productKey,
          categoryId: category.id,
          printingId: defaultPrinting.id,
          roundingStep: "0.0500",
          roundingStrategy: RoundingStrategy.PER_STEP,
          pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
          markupDefault: "0.2000",
          marginDefault: "0.3000",
          active: true,
        },
      });
      summary.productsBaseCreated++;
    }
    productMap.set(productKey, product);
  }

  // Process each customer line
  for (const item of data) {
    // Customer
    let customer = await prisma.customer.findFirst({
      where: { name: { equals: item.customer.name, mode: "insensitive" } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: item.customer.name,
          groupId: group.id,
          isActive: true,
        },
      });
      summary.customersUpserted++;
    }

    const product = productMap.get(item.productKey);
    const printing = printingMap.get(item.printing.formatLabel);

    // Material base (global)
    let material = await prisma.material.findFirst({
      where: { name: { equals: item.material.name, mode: "insensitive" }, unit: Unit.UNIT, isCurrent: true },
    });

    if (!material) {
      material = await prisma.material.create({
        data: {
          name: item.material.name,
          type: "textil",
          unit: Unit.UNIT,
          unitCost: dec4(item.material.unitCost) || "0.0000",
          active: true,
          isCurrent: true,
        },
      });
      summary.materialsCreated++;
    }
    // Não atualizar material se já existe (manter idempotência)
    
    // Vincular material ao produto base se ainda não estiver vinculado
    const existingLink = await prisma.productMaterial.findUnique({
      where: { productId_materialId: { productId: product.id, materialId: material.id } },
    });
    
    if (!existingLink) {
      await prisma.productMaterial.create({
        data: {
          productId: product.id,
          materialId: material.id,
          qtyPerUnit: "1.0000",
          wasteFactor: "0.0000",
        },
      });
    }

    // MaterialCustomerPrice (se diferente do base)
    const existingMatPrice = await prisma.materialCustomerPrice.findFirst({
      where: {
        materialId: material.id,
        customerId: customer.id,
        isCurrent: true,
      },
    });

    if (!existingMatPrice) {
      await prisma.materialCustomerPrice.create({
        data: {
          materialId: material.id,
          customerId: customer.id,
          unitCost: dec4(item.material.unitCost) || "0.0000",
          isCurrent: true,
          priority: 100,
        },
      });
      summary.materialCustomerPrices++;
    } else {
      if (!eqDec4(existingMatPrice.unitCost, item.material.unitCost)) {
        await prisma.materialCustomerPrice.update({
          where: { id: existingMatPrice.id },
          data: { unitCost: dec4(item.material.unitCost) || "0.0000" },
        });
      }
    }

    // PrintingCustomerPrice
    const existingPrintPrice = await prisma.printingCustomerPrice.findFirst({
      where: {
        printingId: printing.id,
        customerId: customer.id,
        sides: 1,
        isCurrent: true,
      },
    });

    if (!existingPrintPrice) {
      await prisma.printingCustomerPrice.create({
        data: {
          printingId: printing.id,
          customerId: customer.id,
          sides: 1,
          unitPrice: dec4(item.printing.unitPrice) || "0.0000",
          isCurrent: true,
          priority: 100,
        },
      });
      summary.printingCustomerPrices++;
    } else {
      if (!eqDec4(existingPrintPrice.unitPrice, item.printing.unitPrice)) {
        await prisma.printingCustomerPrice.update({
          where: { id: existingPrintPrice.id },
          data: { unitPrice: dec4(item.printing.unitPrice) || "0.0000" },
        });
      }
    }

    // Finish (if exists)
    if (item.finish) {
      let finish = await prisma.finish.findFirst({
        where: { name: { equals: item.finish.name, mode: "insensitive" } },
      });

      if (!finish) {
        finish = await prisma.finish.create({
          data: {
            name: item.finish.name,
            category: item.finish.category || "OUTROS",
            unit: Unit.UNIT,
            calcType: item.finish.calcType || "PER_UNIT",
            baseCost: dec4(item.finish.baseCost) || "0.0000",
            active: true,
            isCurrent: true,
          },
        });
        summary.finishesCreated++;
      }
      // Não atualizar finish se já existe (manter idempotência)

      // FinishCustomerPrice
      const existingFinishPrice = await prisma.finishCustomerPrice.findFirst({
        where: {
          finishId: finish.id,
          customerId: customer.id,
          isCurrent: true,
        },
      });

      if (!existingFinishPrice) {
        await prisma.finishCustomerPrice.create({
          data: {
            finishId: finish.id,
            customerId: customer.id,
            baseCost: dec4(item.finish.baseCost) || "0.0000",
            isCurrent: true,
            priority: 100,
          },
        });
        summary.finishCustomerPrices++;
      } else {
        if (!eqDec4(existingFinishPrice.baseCost, item.finish.baseCost)) {
          await prisma.finishCustomerPrice.update({
            where: { id: existingFinishPrice.id },
            data: { baseCost: dec4(item.finish.baseCost) || "0.0000" },
          });
        }
      }
    }

    // ProductCustomerOverride
    if (item.productOverride) {
      const existingOverride = await prisma.productCustomerOverride.findFirst({
        where: {
          productId: product.id,
          customerId: customer.id,
          isCurrent: true,
        },
      });

      const overrideData: any = {
        productId: product.id,
        customerId: customer.id,
        isCurrent: true,
        priority: 100,
      };

      if (item.productOverride.minPricePerPiece) overrideData.minPricePerPiece = dec4(item.productOverride.minPricePerPiece);
      if (item.productOverride.roundingStep) overrideData.roundingStep = dec4(item.productOverride.roundingStep);
      if (item.productOverride.roundingStrategy) overrideData.roundingStrategy = item.productOverride.roundingStrategy;
      if (item.productOverride.marginDefault) overrideData.marginDefault = dec4(item.productOverride.marginDefault);
      if (item.productOverride.markupDefault) overrideData.markupDefault = dec4(item.productOverride.markupDefault);

      if (!existingOverride) {
        await prisma.productCustomerOverride.create({ data: overrideData });
        summary.productOverrides++;
      } else {
        const updates: any = {};
        if (item.productOverride.minPricePerPiece && !eqDec4(existingOverride.minPricePerPiece, item.productOverride.minPricePerPiece)) {
          updates.minPricePerPiece = dec4(item.productOverride.minPricePerPiece);
        }
        if (item.productOverride.marginDefault && !eqDec4(existingOverride.marginDefault, item.productOverride.marginDefault)) {
          updates.marginDefault = dec4(item.productOverride.marginDefault);
        }
        if (Object.keys(updates).length) {
          await prisma.productCustomerOverride.update({ where: { id: existingOverride.id }, data: updates });
        }
      }
    }
  }

  console.log(JSON.stringify(summary));
  return summary;
}

if (require.main === module) {
  runImportProductsTextiles()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

