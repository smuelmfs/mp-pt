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

export async function runImportProductsFoldersA4() {
  const dataPath = path.resolve(process.cwd(), "data/normalized/products.folders-a4.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const summary = {
    productsCreated: 0,
    productsUpdated: 0,
    materialsLinked: 0,
    finishesLinked: 0,
    suggestedCreated: 0,
    printingsCreated: 0,
  };

  const category = await prisma.productCategory.upsert({
    where: { name: "Pastas A4" },
    update: {},
    create: { name: "Pastas A4" },
  });

  for (const item of data) {
    // Printing
    let printing = await prisma.printing.findFirst({
      where: {
        technology: PrintingTech.DIGITAL,
        formatLabel: { equals: item.printing.formatLabel, mode: "insensitive" },
        colors: { equals: item.printing.colors, mode: "insensitive" },
        sides: item.printing.sides,
        isCurrent: true,
      },
    });

    if (!printing) {
      printing = await prisma.printing.create({
        data: {
          technology: PrintingTech.DIGITAL,
          formatLabel: item.printing.formatLabel,
          colors: item.printing.colors,
          sides: item.printing.sides,
          unitPrice: item.printing.unitPrice,
          active: true,
          isCurrent: true,
        },
      });
      summary.printingsCreated++;
    } else {
      const updates: any = {};
      if (!eqDec4(printing.unitPrice, item.printing.unitPrice)) updates.unitPrice = dec4(item.printing.unitPrice);
      if (Object.keys(updates).length) {
        await prisma.printing.update({ where: { id: printing.id }, data: updates });
      }
    }

    // Product
    let product = await prisma.product.findFirst({
      where: { name: { equals: item.name, mode: "insensitive" }, categoryId: category.id },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: item.name,
          categoryId: category.id,
          printingId: printing.id,
          roundingStep: "0.0500",
          roundingStrategy: RoundingStrategy.PER_STEP,
          pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
          markupDefault: "0.2000",
          marginDefault: "0.3000",
          active: true,
        },
      });
      summary.productsCreated++;
    } else {
      const updates: any = {};
      if (product.printingId !== printing.id) updates.printingId = printing.id;
      if (!eqDec4(product.roundingStep, "0.0500")) updates.roundingStep = "0.0500";
      if (product.roundingStrategy !== RoundingStrategy.PER_STEP) updates.roundingStrategy = RoundingStrategy.PER_STEP;
      if (product.pricingStrategy !== PricingStrategy.COST_MARKUP_MARGIN) updates.pricingStrategy = PricingStrategy.COST_MARKUP_MARGIN;
      if (!eqDec4(product.markupDefault, "0.2000")) updates.markupDefault = "0.2000";
      if (!eqDec4(product.marginDefault, "0.3000")) updates.marginDefault = "0.3000";
      if (Object.keys(updates).length) {
        await prisma.product.update({ where: { id: product.id }, data: updates });
        summary.productsUpdated++;
      }
    }

    // Materials
    if (item.materials && item.materials.length > 0) {
      for (const m of item.materials) {
        let material = await prisma.material.findFirst({
          where: { name: { equals: m.name, mode: "insensitive" }, unit: Unit.SHEET, isCurrent: true },
        });

        if (!material) {
          material = await prisma.material.create({
            data: {
              name: m.name,
              type: "papel",
              unit: Unit.SHEET,
              unitCost: dec4(m.unitCost) || "0.0000",
              active: true,
              isCurrent: true,
            },
          });
        } else {
          const updates: any = {};
          if (!eqDec4(material.unitCost, m.unitCost)) updates.unitCost = dec4(m.unitCost);
          if (Object.keys(updates).length) {
            await prisma.material.update({ where: { id: material.id }, data: updates });
          }
        }

        const link = await prisma.productMaterial.findUnique({
          where: { productId_materialId: { productId: product.id, materialId: material.id } },
        });

        if (!link) {
          await prisma.productMaterial.create({
            data: {
              productId: product.id,
              materialId: material.id,
              qtyPerUnit: "1.0000",
              wasteFactor: "0.0000",
            },
          });
          summary.materialsLinked++;
        }
      }
    }

    // Finishes
    if (item.finishes && item.finishes.length > 0) {
      for (const f of item.finishes) {
        let finish = await prisma.finish.findFirst({
          where: { name: { equals: f.name, mode: "insensitive" } },
        });

        if (!finish) {
          finish = await prisma.finish.create({
            data: {
              name: f.name,
              category: "OUTROS",
              unit: Unit.UNIT,
              calcType: "PER_UNIT",
              baseCost: dec4(f.baseCost) || "0.0000",
              active: true,
              isCurrent: true,
            },
          });
        } else {
          const updates: any = {};
          if (!eqDec4(finish.baseCost, f.baseCost)) updates.baseCost = dec4(f.baseCost);
          if (Object.keys(updates).length) {
            await prisma.finish.update({ where: { id: finish.id }, data: updates });
          }
        }

        const pfLink = await prisma.productFinish.findUnique({
          where: { productId_finishId: { productId: product.id, finishId: finish.id } },
        });

        if (!pfLink) {
          await prisma.productFinish.create({
            data: {
              productId: product.id,
              finishId: finish.id,
              qtyPerUnit: "1.0000",
            },
          });
          summary.finishesLinked++;
        }
      }
    }

    // Suggested quantities
    if (item.suggestedQuantities && Array.isArray(item.suggestedQuantities)) {
      for (let idx = 0; idx < item.suggestedQuantities.length; idx++) {
        const qty = item.suggestedQuantities[idx];
        const exists = await prisma.productSuggestedQuantity.findFirst({
          where: { productId: product.id, quantity: qty },
        });
        if (!exists) {
          await prisma.productSuggestedQuantity.create({
            data: { productId: product.id, quantity: qty, order: idx },
          });
          summary.suggestedCreated++;
        }
      }
    }
  }

  console.log(JSON.stringify(summary));
  return summary;
}

if (require.main === module) {
  runImportProductsFoldersA4()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

