import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";

type Row = {
  name: string;
  format: string;
  widthMm: number;
  heightMm: number;
  printing: {
    technology: "DIGITAL";
    colors: string;
    unitPrice: string;
    sides: number;
    yield: null;
  };
  finishes: Array<{ name: string; active?: boolean; baseCost: string }>;
  suggested: number[];
  totals: { qty: number; total: string; unit: string };
};

function readRows(): Row[] {
  const p = path.join(process.cwd(), "data/normalized/products.businesscards.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function dec4s(n: any) { return (Number(n ?? 0)).toFixed(4); }

export async function runImportProductsBusinessCards() {
  const rows = readRows();
  let productsCreated = 0, productsUpdated = 0, printingsCreated = 0, finishesLinked = 0, suggestedCreated = 0;

  // Ensure category
  const category = await prisma.productCategory.upsert({
    where: { name: "Papelaria" },
    create: { name: "Papelaria" },
    update: {},
  });

  for (const r of rows) {
    // Upsert Printing
    let printing = await prisma.printing.findFirst({
      where: {
        technology: "DIGITAL",
        colors: { equals: r.printing.colors, mode: "insensitive" },
        sides: r.printing.sides,
        isCurrent: true,
      },
    });

    if (!printing) {
      printing = await prisma.printing.create({
        data: {
          technology: "DIGITAL",
          colors: r.printing.colors,
          sides: r.printing.sides,
          unitPrice: r.printing.unitPrice,
          yield: null,
          active: true,
          isCurrent: true,
        },
      });
      printingsCreated++;
    }

    // Upsert Product
    const existing = await prisma.product.findFirst({
      where: { name: { equals: r.name, mode: "insensitive" }, categoryId: category.id },
    });

    let productId: number;
    if (!existing) {
      const created = await prisma.product.create({
        data: {
          name: r.name,
          categoryId: category.id,
          printingId: printing.id,
          widthMm: r.widthMm,
          heightMm: r.heightMm,
          roundingStep: "0.0500",
          roundingStrategy: "PER_STEP",
          pricingStrategy: "COST_MARKUP_MARGIN",
          markupDefault: "0.2000",
          marginDefault: "0.3000",
          sourcingMode: "INTERNAL",
          active: true,
        },
      });
      productId = created.id;
      productsCreated++;
    } else {
      productId = existing.id;
      const needUpdate = (
        existing.widthMm !== r.widthMm ||
        existing.heightMm !== r.heightMm ||
        existing.printingId !== printing.id ||
        dec4s(existing.roundingStep) !== "0.0500" ||
        existing.roundingStrategy !== "PER_STEP" ||
        existing.pricingStrategy !== "COST_MARKUP_MARGIN" ||
        dec4s(existing.markupDefault) !== "0.2000" ||
        dec4s(existing.marginDefault) !== "0.3000"
      );
      if (needUpdate) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            printingId: printing.id,
            widthMm: r.widthMm,
            heightMm: r.heightMm,
            roundingStep: "0.0500",
            roundingStrategy: "PER_STEP",
            pricingStrategy: "COST_MARKUP_MARGIN",
            markupDefault: "0.2000",
            marginDefault: "0.3000",
          },
        });
        productsUpdated++;
      }
    }

    // Link Finishes
    for (const fin of r.finishes) {
      let finish = await prisma.finish.findFirst({
        where: { name: { equals: fin.name, mode: "insensitive" } },
      });
      // Create finish if it doesn't exist
      if (!finish) {
        finish = await prisma.finish.create({
          data: {
            name: fin.name,
            category: fin.name.includes("Foil") ? "OUTROS" : "LAMINACAO",
            unit: "UNIT",
            calcType: "PER_UNIT",
            baseCost: fin.baseCost,
            active: fin.active ?? true,
            isCurrent: true,
          },
        });
      }
      const existingPf = await prisma.productFinish.findUnique({
        where: { productId_finishId: { productId, finishId: finish.id } },
      });
      if (!existingPf) {
        await prisma.productFinish.create({
          data: {
            productId,
            finishId: finish.id,
            qtyPerUnit: "1.0000",
          },
        });
        finishesLinked++;
      }
    }

    // Suggested Quantities
    for (const qty of r.suggested) {
      const existing = await prisma.productSuggestedQuantity.findFirst({
        where: { productId, quantity: qty },
      });
      if (!existing) {
        await prisma.productSuggestedQuantity.create({
          data: {
            productId,
            quantity: qty,
            active: true,
          },
        });
        suggestedCreated++;
      }
    }
  }

  const out = { productsCreated, productsUpdated, printingsCreated, finishesLinked, suggestedCreated };
  console.log(JSON.stringify(out));
  return out;
}

if (require.main === module) {
  runImportProductsBusinessCards().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

