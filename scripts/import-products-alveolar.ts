import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { Unit, PrintingTech, PricingStrategy, RoundingStrategy } from "@prisma/client";

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

export async function runImportProductsAlveolar() {
  const dataPath = path.resolve(process.cwd(), "data/normalized/products.alveolar.json");
  const items: any[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const summary = {
    categoryId: 0,
    productsCreated: 0,
    productsUpdated: 0,
    materialsCreated: 0,
    materialsUpdated: 0,
    linksPMCreated: 0,
    suggestedCreated: 0,
    printingsLinked: 0,
  };

  // Category
  const category = await prisma.productCategory.upsert({
    where: { name: "Placas rígidas" },
    update: {},
    create: {
      name: "Placas rígidas",
      roundingStep: "0.0500",
      roundingStrategy: RoundingStrategy.PER_STEP,
      pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
    },
  });
  summary.categoryId = category.id;

  // Printing UV PLANO_M2 - find existing
  const printing = await prisma.printing.findFirst({
    where: {
      technology: PrintingTech.UV,
      formatLabel: { equals: "PLANO_M2", mode: "insensitive" },
      colors: null,
      sides: 1,
      isCurrent: true,
    },
  });

  for (const it of items) {
    // Material
    const m = it.material;
    let material = await prisma.material.findFirst({
      where: { name: { equals: m.name, mode: "insensitive" }, unit: Unit.M2, isCurrent: true },
    });
    if (!material) {
      material = await prisma.material.create({
        data: {
          name: m.name,
          type: "alveolar",
          unit: Unit.M2,
          unitCost: dec4(m.unitCostM2) || "0.0000",
          active: true,
          isCurrent: true,
        },
      });
      summary.materialsCreated++;
    } else {
      const updates: any = {};
      if (!eqDec4(material.unitCost, m.unitCostM2)) updates.unitCost = dec4(m.unitCostM2);
      if (Object.keys(updates).length) {
        await prisma.material.update({ where: { id: material.id }, data: updates });
        summary.materialsUpdated++;
      }
    }

    // Product
    const p = it.product;
    const areaM2 = (p.widthMm && p.heightMm) ? (p.widthMm * p.heightMm) / 1_000_000 : 1.0;
    const qtyPerUnit = dec4(areaM2);

    // Try to find existing product by name first
    let product = await prisma.product.findFirst({
      where: { name: { equals: p.name, mode: "insensitive" } },
    });

    // If not found, try by existing ProductMaterial link (materialId + qtyPerUnit)
    if (!product) {
      const pm = await prisma.productMaterial.findFirst({
        where: { materialId: (material as any).id, qtyPerUnit },
        include: { product: true },
      });
      if (pm?.product) product = pm.product as any;
    }

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          categoryId: category.id,
          printingId: printing ? printing.id : null,
          widthMm: p.widthMm ?? null,
          heightMm: p.heightMm ?? null,
          roundingStep: "0.0500",
          roundingStrategy: RoundingStrategy.PER_STEP,
          pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
          markupDefault: "0.2000",
          marginDefault: "0.3000",
          active: true,
        },
      });
      if (printing) summary.printingsLinked++;
      summary.productsCreated++;
    } else {
      const updates: any = {};
      if (product.categoryId !== category.id) updates.categoryId = category.id;
      if (printing && product.printingId !== printing.id) updates.printingId = printing.id;
      if ((p.widthMm ?? null) !== (product.widthMm ?? null)) updates.widthMm = p.widthMm ?? null;
      if ((p.heightMm ?? null) !== (product.heightMm ?? null)) updates.heightMm = p.heightMm ?? null;
      if (!eqDec4(product.roundingStep, "0.0500")) updates.roundingStep = "0.0500";
      if (product.roundingStrategy !== RoundingStrategy.PER_STEP) updates.roundingStrategy = RoundingStrategy.PER_STEP;
      if (product.pricingStrategy !== PricingStrategy.COST_MARKUP_MARGIN) updates.pricingStrategy = PricingStrategy.COST_MARKUP_MARGIN;
      if (!eqDec4(product.markupDefault, "0.2000")) updates.markupDefault = "0.2000";
      if (!eqDec4(product.marginDefault, "0.3000")) updates.marginDefault = "0.3000";
      if (Object.keys(updates).length) {
        await prisma.product.update({ where: { id: product.id }, data: updates });
        if (updates.printingId) summary.printingsLinked++;
        summary.productsUpdated++;
      }
    }

    // ProductMaterial
    const link = await prisma.productMaterial.findUnique({
      where: { productId_materialId: { productId: (product as any).id, materialId: (material as any).id } },
    });
    if (!link) {
      await prisma.productMaterial.create({
        data: {
          productId: (product as any).id,
          materialId: (material as any).id,
          qtyPerUnit,
          wasteFactor: "0.0000",
          lossFactor: null,
        },
      });
      summary.linksPMCreated++;
    }

    // Suggested quantities
    if (p.widthMm && p.heightMm) {
      for (const [idx, q] of [1, 2, 5, 10, 20].entries()) {
        const exists = await prisma.productSuggestedQuantity.findFirst({ where: { productId: (product as any).id, quantity: q } });
        if (!exists) {
          await prisma.productSuggestedQuantity.create({ data: { productId: (product as any).id, quantity: q, order: idx } });
          summary.suggestedCreated++;
        }
      }
    }
  }

  console.log(JSON.stringify(summary));
  return summary;
}

if (require.main === module) {
  runImportProductsAlveolar().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
