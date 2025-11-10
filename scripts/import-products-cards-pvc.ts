import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { Unit, PrintingTech, PricingStrategy, RoundingStrategy, SetupMode } from "@prisma/client";

const s = (v: any) => (v === null || v === undefined ? null : String(v));
const dec4 = (v: any) => (v == null ? null : Number(String(v).replace(",", ".")).toFixed(4));
const dec2 = (v: any) => (v == null ? null : Number(String(v).replace(",", ".")).toFixed(2));
const eq = (a: any, b: any) => s(a) === s(b);
const eqDec4 = (a: any, b: any) => {
  const sa = a == null ? null : (typeof a === "object" && a.toString ? a.toString() : String(a));
  return s(sa == null ? null : Number(sa).toFixed(4)) === s(dec4(b));
};
const eqDec2 = (a: any, b: any) => {
  const sa = a == null ? null : (typeof a === "object" && a.toString ? a.toString() : String(a));
  return s(sa == null ? null : Number(sa).toFixed(2)) === s(dec2(b));
};

export async function runImportProductsCardsPVC() {
  const dataPath = path.resolve(process.cwd(), "data/normalized/products.cards-pvc.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const summary = {
    categoryId: 0,
    productsCreated: 0,
    productsUpdated: 0,
    printingsCreated: 0,
    printingsUpdated: 0,
    materialsCreated: 0,
    materialsUpdated: 0,
    linksPMCreated: 0,
    suggestedCreated: 0,
  };

  // Category
  const category = await prisma.productCategory.upsert({
    where: { name: "Cartões PVC" },
    update: {},
    create: {
      name: "Cartões PVC",
      roundingStep: "0.0500",
      roundingStrategy: RoundingStrategy.PER_STEP,
      pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
    },
  });
  summary.categoryId = category.id;

  // Printings
  for (const p of data.printings as any[]) {
    let printing = await prisma.printing.findFirst({
      where: {
        technology: PrintingTech.DIGITAL,
        formatLabel: { equals: p.formatLabel, mode: "insensitive" },
        colors: { equals: p.colors, mode: "insensitive" },
        sides: p.sides,
        isCurrent: true,
      },
    });

    if (!printing) {
      await prisma.printing.create({
        data: {
          technology: PrintingTech.DIGITAL,
          formatLabel: p.formatLabel,
          colors: p.colors,
          sides: p.sides,
          unitPrice: dec4(p.unitPrice) || "0.0000",
          setupMode: SetupMode.FLAT,
          setupFlatFee: dec2("0.00"),
          minFee: dec2("0.00"),
          lossFactor: dec4("0.0300"),
          active: true,
          isCurrent: true,
        },
      });
      summary.printingsCreated++;
    } else {
      const updates: any = {};
      if (!eqDec4(printing.unitPrice, p.unitPrice)) updates.unitPrice = dec4(p.unitPrice);
      if (!eq(printing.setupMode, SetupMode.FLAT)) updates.setupMode = SetupMode.FLAT;
      if (!eqDec2(printing.setupFlatFee, "0.00")) updates.setupFlatFee = dec2("0.00");
      if (!eqDec2(printing.minFee, "0.00")) updates.minFee = dec2("0.00");
      if (!eqDec4(printing.lossFactor, "0.0300")) updates.lossFactor = dec4("0.0300");
      if (Object.keys(updates).length) {
        await prisma.printing.update({ where: { id: printing.id }, data: updates });
        summary.printingsUpdated++;
      }
    }
  }

  // Materials
  const materialMap = new Map<string, number>();
  for (const m of data.materials as any[]) {
    let material = await prisma.material.findFirst({
      where: { name: { equals: m.name, mode: "insensitive" }, unit: Unit.UNIT, isCurrent: true },
    });

    if (!material) {
      material = await prisma.material.create({
        data: {
          name: m.name,
          type: "pvc",
          unit: Unit.UNIT,
          unitCost: dec4(m.unitCost) || "0.0000",
          active: m.active !== false,
          isCurrent: true,
        },
      });
      summary.materialsCreated++;
    } else {
      const updates: any = {};
      if (!eqDec4(material.unitCost, m.unitCost)) updates.unitCost = dec4(m.unitCost);
      if (Object.keys(updates).length) {
        await prisma.material.update({ where: { id: material.id }, data: updates });
        summary.materialsUpdated++;
      }
    }
    materialMap.set(m.name.toLowerCase(), (material as any).id);
  }

  // Products
  for (const pr of data.products as any[]) {
    const printing = await prisma.printing.findFirst({
      where: {
        technology: PrintingTech.DIGITAL,
        formatLabel: { equals: pr.printing.formatLabel, mode: "insensitive" },
        colors: { equals: pr.printing.colors, mode: "insensitive" },
        sides: pr.printing.sides,
        isCurrent: true,
      },
    });

    let product = await prisma.product.findFirst({
      where: { name: { equals: pr.name, mode: "insensitive" }, categoryId: category.id },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: pr.name,
          categoryId: category.id,
          printingId: printing!.id,
          widthMm: pr.widthMm,
          heightMm: pr.heightMm,
          roundingStep: "0.0500",
          roundingStrategy: RoundingStrategy.PER_STEP,
          pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
          markupDefault: "0.2000",
          marginDefault: "0.3000",
          minOrderQty: 1,
          minOrderValue: null,
          active: pr.active !== false,
        },
      });
      summary.productsCreated++;
    } else {
      const updates: any = {};
      if (product.printingId !== printing!.id) updates.printingId = printing!.id;
      if (product.widthMm !== pr.widthMm) updates.widthMm = pr.widthMm;
      if (product.heightMm !== pr.heightMm) updates.heightMm = pr.heightMm;
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

    // Link ProductMaterial (one material per product)
    const m0 = pr.materials[0];
    const materialId = materialMap.get(m0.name.toLowerCase());
    if (materialId) {
      const link = await prisma.productMaterial.findUnique({
        where: { productId_materialId: { productId: (product as any).id, materialId } },
      });
      if (!link) {
        await prisma.productMaterial.create({
          data: {
            productId: (product as any).id,
            materialId,
            qtyPerUnit: m0.qtyPerUnit || "1.0000",
            wasteFactor: null,
            lossFactor: null,
          },
        });
        summary.linksPMCreated++;
      }
    }

    // Suggested quantities
    if (Array.isArray(pr.suggested)) {
      for (const [idx, qty] of pr.suggested.entries()) {
        const exists = await prisma.productSuggestedQuantity.findFirst({
          where: { productId: (product as any).id, quantity: qty },
        });
        if (!exists) {
          await prisma.productSuggestedQuantity.create({ data: { productId: (product as any).id, quantity: qty, order: idx } });
          summary.suggestedCreated++;
        } else if (exists.order !== idx) {
          await prisma.productSuggestedQuantity.update({ where: { id: exists.id }, data: { order: idx } });
        }
      }
    }
  }

  console.log(JSON.stringify(summary));
  return summary;
}

if (require.main === module) {
  runImportProductsCardsPVC().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
