import { readFileSync } from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { Unit, PrintingTech, SetupMode, PricingStrategy, RoundingStrategy } from "@prisma/client";

// =========================
// Normalization Helpers
// =========================
const s = (v:any) => (v === null || v === undefined ? null : String(v));
const dec4 = (v:any) => (v == null ? null : Number(String(v).replace(",", ".")).toFixed(4));
const dec2 = (v:any) => (v == null ? null : Number(String(v).replace(",", ".")).toFixed(2));
const normalizeDec = (v:any) => {
  if (v == null) return null;
  const str = typeof v === "object" && v.toString ? v.toString() : String(v);
  const num = Number(str.replace(",", "."));
  return isFinite(num) ? num.toFixed(4) : null;
};
const eq     = (a:any,b:any) => s(a) === s(b);
const eqDec4 = (a:any,b:any) => normalizeDec(a) === dec4(b);
const eqDec2 = (a:any,b:any) => {
  const normA = a == null ? null : (typeof a === "object" && a.toString ? Number(a.toString()).toFixed(2) : dec2(a));
  return normA === dec2(b);
};
const eqNull = (a:any,b:any) => (a==null && b==null) || s(a)===s(b);

export async function runImportEnvelopes() {
  const p = path.resolve(process.cwd(),"data","normalized","envelopes.json");
  const norm = JSON.parse(readFileSync(p,"utf-8"));

  // Categoria
  const cat = await prisma.productCategory.upsert({
    where: { name: "Papelaria" },
    update: {},
    create: {
      name: "Papelaria",
      roundingStep: "0.0500",
      roundingStrategy: RoundingStrategy.PER_STEP,
      pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
    }
  });

  // Printing DL
  const basePrint = norm.printing || {};
  let printingsUpdated = 0;
  let printing = await prisma.printing.findFirst({
    where: {
      isCurrent: true,
      technology: PrintingTech.DIGITAL,
      formatLabel: "DL",
      colors: null,
      sides: 1
    }
  });

  if (!printing) {
    printing = await prisma.printing.create({
      data: {
        technology: PrintingTech.DIGITAL,
        formatLabel: "DL",
        colors: null,
        sides: 1,
        unitPrice: dec4(basePrint.unitPrice) || "0.0000",
        setupMode: SetupMode.FLAT,
        setupFlatFee: dec2("0.00"),
        minFee: dec2("0.00"),
        lossFactor: dec4("0.0300"),
        isCurrent: true,
        active: true
      }
    });
  } else {
    const updates:any = {};
    if (!eqDec4(printing.unitPrice, basePrint.unitPrice)) updates.unitPrice = dec4(basePrint.unitPrice);
    if (!eq(printing.setupMode, SetupMode.FLAT)) updates.setupMode = SetupMode.FLAT;
    if (!eqDec2(printing.setupFlatFee, "0.00")) updates.setupFlatFee = dec2("0.00");
    if (!eqDec2(printing.minFee, "0.00")) updates.minFee = dec2("0.00");
    if (!eqDec4(printing.lossFactor, "0.0300")) updates.lossFactor = dec4("0.0300");
    if (Object.keys(updates).length) {
      printing = await prisma.printing.update({ where: { id: printing.id }, data: updates });
      printingsUpdated++;
    }
  }

  let productsCreated=0, productsUpdated=0, materialsCreated=0, materialsUpdated=0, linksPMCreated=0, suggestedCreated=0;

  for (const it of norm.items as any[]) {
    const matName = `Envelope ${it.format} ${it.type==="JANELA"?"Janela":"Sem Janela"}`;

    // Material (UNIT)
    let material = await prisma.material.findFirst({
      where: { isCurrent: true, name: matName, unit: Unit.UNIT }
    });

    if (!material) {
      material = await prisma.material.create({
        data: {
          name: matName,
          type: "envelope",
          unit: Unit.UNIT,
          unitCost: dec4(it.unitCost) || "0.0000",
          isCurrent: true,
          active: true
        }
      });
      materialsCreated++;
    } else {
      const updates:any = {};
      const nextUnitCost = dec4(it.unitCost);
      const prevUnitCost = material.unitCost?.toString();
      if (!eqDec4(prevUnitCost, nextUnitCost)) {
        if (process.env.DEBUG_ENVELOPES === "1") {
          console.log(JSON.stringify({
            kind: "material-unitCost-diff",
            name: material.name,
            prev: prevUnitCost,
            next: nextUnitCost
          }));
        }
        updates.unitCost = nextUnitCost;
      }
      if (Object.keys(updates).length) {
        await prisma.material.update({ where: { id: material.id }, data: updates });
        materialsUpdated++;
      }
    }

    // Product
    let product = await prisma.product.findFirst({
      where: { name: it.name, categoryId: cat.id }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: it.name,
          categoryId: cat.id,
          printingId: printing.id,
          roundingStep: "0.0500",
          roundingStrategy: RoundingStrategy.PER_STEP,
          pricingStrategy: PricingStrategy.COST_MARKUP_MARGIN,
          markupDefault: "0.2000",
          marginDefault: "0.3000",
          active: true
        }
      });
      productsCreated++;
    } else {
      const updates:any = {};
      if (product.printingId !== printing.id) updates.printingId = printing.id;
      if (!eqDec4(product.roundingStep, "0.0500")) updates.roundingStep = "0.0500";
      if (product.roundingStrategy !== RoundingStrategy.PER_STEP) updates.roundingStrategy = RoundingStrategy.PER_STEP;
      if (product.pricingStrategy !== PricingStrategy.COST_MARKUP_MARGIN) updates.pricingStrategy = PricingStrategy.COST_MARKUP_MARGIN;
      if (!eqDec4(product.markupDefault, "0.2000")) updates.markupDefault = "0.2000";
      if (!eqDec4(product.marginDefault, "0.3000")) updates.marginDefault = "0.3000";
      if (Object.keys(updates).length) {
        await prisma.product.update({ where: { id: product.id }, data: updates });
        productsUpdated++;
      }
    }

    // ProductMaterial (1 un)
    const link = await prisma.productMaterial.findUnique({
      where: { productId_materialId: { productId: product.id, materialId: material.id } }
    });

    if (!link) {
      await prisma.productMaterial.create({
        data: {
          productId: product.id,
          materialId: material.id,
          qtyPerUnit: "1.0000",
          wasteFactor: "0.0000"
        }
      });
      linksPMCreated++;
    }

    // Suggested quantities
    for (const [idx, q] of (norm.suggestedQuantities as number[]).entries()) {
      const exists = await prisma.productSuggestedQuantity.findFirst({
        where: { productId: product.id, quantity: q }
      });
      if (!exists) {
        await prisma.productSuggestedQuantity.create({
          data: { productId: product.id, quantity: q, order: idx }
        });
        suggestedCreated++;
      }
    }
  }

  const out = {
    categoryId: cat.id,
    productsCreated, productsUpdated,
    materialsCreated, materialsUpdated,
    linksPMCreated, suggestedCreated,
    printingsUpdated
  };
  console.log(JSON.stringify(out));
  return out;
}

if (require.main === module) {
  runImportEnvelopes().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
}

