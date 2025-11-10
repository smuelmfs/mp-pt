import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";
import { Unit, PrintingTech, PricingStrategy, RoundingStrategy, SetupMode } from "@prisma/client";

const dec4 = (v: any) => (v == null ? null : Number(String(v).replace(",", ".")).toFixed(4));
const dec4s = (v: any) => (v == null ? null : Number(String(v).replace(",", ".")).toFixed(4));
const s = (v: any) => (v === null || v === undefined ? null : String(v));
const eqDec4 = (a: any, b: any) => {
  const normA = a == null ? null : (typeof a === "object" && a.toString ? Number(a.toString()).toFixed(4) : dec4s(a));
  return normA === dec4(b);
};
const eq = (a: any, b: any) => s(a) === s(b);

export async function runImportProductsFlex() {
  const dataPath = path.resolve(process.cwd(), "data/normalized/products.flex.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const summary = {
    categoryId: 0,
    productsCreated: 0,
    productsUpdated: 0,
    printingsCreated: 0,
    printingsUpdated: 0,
    materialsCreated: 0,
    materialsUpdated: 0,
    finishesCreated: 0,
    finishesUpdated: 0,
    linksPMCreated: 0,
    linksPFCreated: 0,
    suggestedCreated: 0,
  };

  const category = await prisma.productCategory.upsert({
    where: { name: "Grande Formato — Flex/Postes/Tendas" },
    update: {},
    create: {
      name: "Grande Formato — Flex/Postes/Tendas",
      roundingStep: "0.0500",
      roundingStrategy: RoundingStrategy.PER_STEP,
      pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
    },
  });
  summary.categoryId = category.id;

  // Printing base (FLEX_M2)
  let printing = await prisma.printing.findFirst({
    where: {
      technology: PrintingTech.GRANDE_FORMATO,
      formatLabel: { equals: "FLEX_M2", mode: "insensitive" },
      colors: null,
      sides: 1,
      isCurrent: true,
    },
  });

  if (!printing) {
    printing = await prisma.printing.create({
      data: {
        technology: PrintingTech.GRANDE_FORMATO,
        formatLabel: "FLEX_M2",
        colors: null,
        sides: 1,
        unitPrice: data[0]?.printing?.unitPrice || "25.0000",
        setupMode: SetupMode.FLAT,
        setupFlatFee: "0.00",
        minFee: "0.00",
        lossFactor: "0.0300",
        active: true,
        isCurrent: true,
      },
    });
    summary.printingsCreated++;
  } else {
    // Não atualizar printing se já existe - manter idempotência forte
    // Se o printing já existe, assumir que está correto
  }

  for (const item of data) {
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
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          roundingStep: "0.0500",
          roundingStrategy: RoundingStrategy.PER_STEP,
          pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
          markupDefault: "0.2000",
          marginDefault: "0.3000",
          sourcingMode: "INTERNAL",
          active: true,
        },
      });
      summary.productsCreated++;
    } else {
      const updates: any = {};
      if (product.printingId !== printing.id) updates.printingId = printing.id;
      if (product.widthMm !== item.widthMm) updates.widthMm = item.widthMm;
      if (product.heightMm !== item.heightMm) updates.heightMm = item.heightMm;
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
          where: { name: { equals: m.name, mode: "insensitive" }, unit: Unit.M2, isCurrent: true },
        });

        if (!material) {
          material = await prisma.material.create({
            data: {
              name: m.name,
              type: "lona",
              unit: Unit.M2,
              unitCost: dec4(m.unitCost) || "0.0000",
              active: true,
              isCurrent: true,
            },
          });
          summary.materialsCreated++;
        }
        // Não atualizar material se já existe (manter idempotência)

        // Área em m² por unidade do produto
        const areaM2 = ((item.widthMm || 0) * (item.heightMm || 0)) / 1e6;
        const qtyPerUnit = dec4(areaM2 || 1.0);

        const link = await prisma.productMaterial.findUnique({
          where: { productId_materialId: { productId: product.id, materialId: material.id } },
        });

        if (!link) {
          await prisma.productMaterial.create({
            data: {
              productId: product.id,
              materialId: material.id,
              qtyPerUnit: qtyPerUnit || "1.0000",
              wasteFactor: "0.0000",
            },
          });
          summary.linksPMCreated++;
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
              category: f.category || "OUTROS",
              unit: f.unit === "M2" ? Unit.M2 : f.unit === "LOT" ? Unit.LOT : f.unit === "HOUR" ? Unit.HOUR : Unit.UNIT,
              calcType: f.calcType || "PER_UNIT",
              baseCost: dec4(f.baseCost) || "0.0000",
              active: true,
              isCurrent: true,
            },
          });
          summary.finishesCreated++;
        }
        // Não atualizar finish se já existe (manter idempotência)

        const qtyPerUnit = f.qtyPerUnit ? dec4(f.qtyPerUnit) : "1.0000";

        const pfLink = await prisma.productFinish.findUnique({
          where: { productId_finishId: { productId: product.id, finishId: finish.id } },
        });

        if (!pfLink) {
          await prisma.productFinish.create({
            data: {
              productId: product.id,
              finishId: finish.id,
              qtyPerUnit: qtyPerUnit || "1.0000",
            },
          });
          summary.linksPFCreated++;
        } else {
          const updates: any = {};
          if (!eqDec4(pfLink.qtyPerUnit, qtyPerUnit)) {
            await prisma.productFinish.update({
              where: { productId_finishId: { productId: product.id, finishId: finish.id } },
              data: { qtyPerUnit: qtyPerUnit || "1.0000" },
            });
          }
        }
      }
    }

    // Suggested quantities
    if (item.suggested && item.suggested.length > 0) {
      for (const qty of item.suggested) {
        const exists = await prisma.productSuggestedQuantity.findFirst({
          where: { productId: product.id, quantity: qty },
        });
        if (!exists) {
          await prisma.productSuggestedQuantity.create({
            data: { productId: product.id, quantity: qty, active: true },
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
  runImportProductsFlex()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

