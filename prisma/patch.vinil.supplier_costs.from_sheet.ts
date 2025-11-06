import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

type Row = {
  name: string;           // normalized material name
  variant: string;        // label like "615mm x 5m"
  widthM: number;
  lengthM: number;
  supplierRollCost: number; // EUR per roll
  costPerM2: number;      // EUR per m2
  brand: "SUPTAC"|"ECOTAC"|"LUXTAC"|"LT5510M"|"FLEX";
};

function rowsFromPrompt(): Row[] {
  // Parsed from user's table, decimal dots applied
  return [
    { name: "Suptac S5001B Polar White Gloss", variant: "615mm x 5m", widthM: 0.615, lengthM: 5, supplierRollCost: 19.12, costPerM2: 6.22, brand: "SUPTAC" },
    { name: "Suptac S5001B Polar White Gloss", variant: "615mm x 15m", widthM: 0.615, lengthM: 15, supplierRollCost: 64.59, costPerM2: 7.00, brand: "SUPTAC" },
    { name: "Suptac S5889B Coal Black Gloss", variant: "615mm x 5m", widthM: 0.615, lengthM: 5, supplierRollCost: 19.12, costPerM2: 6.22, brand: "SUPTAC" },
    { name: "Suptac S5001B Polar White Gloss", variant: "615mm x 5m", widthM: 0.615, lengthM: 5, supplierRollCost: 21.53, costPerM2: 7.00, brand: "SUPTAC" },
    { name: "Suptac S5001B Polar White Gloss", variant: "615mm x 10m", widthM: 0.615, lengthM: 10, supplierRollCost: 43.06, costPerM2: 7.00, brand: "SUPTAC" },
    { name: "Ecotac E3877B Silver Gloss", variant: "615mm x 5m", widthM: 0.615, lengthM: 5, supplierRollCost: 15.90, costPerM2: 5.17, brand: "ECOTAC" },
    { name: "Ecotac E3151B Orange Gloss", variant: "615mm x 5m", widthM: 0.615, lengthM: 5, supplierRollCost: 12.85, costPerM2: 4.18, brand: "ECOTAC" },
    { name: "FLEX BRANCO", variant: "0.5m x 2.5m", widthM: 0.5, lengthM: 2.5, supplierRollCost: 20.12, costPerM2: 16.10, brand: "FLEX" },
    { name: "Suptac S5165B Mandarin Orange Gloss", variant: "615mm x 5m", widthM: 0.615, lengthM: 5, supplierRollCost: 26.03, costPerM2: 8.47, brand: "SUPTAC" },
    { name: "LT5510M Etched Glass Deep Silver Matt", variant: "1220mm x 5m", widthM: 1.22, lengthM: 5, supplierRollCost: 35.70, costPerM2: 5.85, brand: "LT5510M" },
    { name: "Ecotac E3485M Fire Red Matt", variant: "615mm x 5m", widthM: 0.615, lengthM: 5, supplierRollCost: 13.50, costPerM2: 4.39, brand: "ECOTAC" },
    { name: "Ecotac Azul Matt", variant: "615mm x 5m", widthM: 0.615, lengthM: 5, supplierRollCost: 13.50, costPerM2: 4.39, brand: "ECOTAC" },
    { name: "Ecotac Preto Matt", variant: "615mm x 5m", widthM: 0.615, lengthM: 5, supplierRollCost: 13.50, costPerM2: 4.39, brand: "ECOTAC" },
    { name: "Luxtac S5ICEM Etched Glass ICE White Matt", variant: "1230mm x 5m", widthM: 1.23, lengthM: 5, supplierRollCost: 75.58, costPerM2: 12.29, brand: "LUXTAC" },
    { name: "Ecotac E3485B Fire Red Gloss", variant: "615mm x 10m", widthM: 0.615, lengthM: 10, supplierRollCost: 26.99, costPerM2: 4.39, brand: "ECOTAC" },
  ];
}

function pickGenericSupplierName(brand: Row["brand"]): string {
  switch (brand) {
    case "SUPTAC": return "Fornecedor Vinil A";
    case "ECOTAC": return "Fornecedor Vinil B";
    case "LUXTAC":
    case "LT5510M": return "Fornecedor Vinil C";
    case "FLEX": return "Fornecedor Vinil A";
  }
}

async function ensureSupplierByName(name: string) {
  const existing = await prisma.supplier.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) return existing.id;
  const created = await prisma.supplier.create({ data: { name, active: true } });
  return created.id;
}

function norm(s: string) {
  return s.replace(/\s+/g, " ").replace(/\s*€\s*$/g, "").trim();
}

async function upsertSupplierCostForVinyl(row: Row) {
  const name = norm(row.name);

  // Try exact; if not, try contains for key tokens
  let mat = await prisma.material.findFirst({ where: { type: "vinil", name: { equals: name, mode: "insensitive" } } });
  if (!mat) {
    const tokens = name.split(" ").filter(Boolean).slice(0, 3);
    mat = await prisma.material.findFirst({ where: { type: "vinil", AND: tokens.map(t => ({ name: { contains: t, mode: "insensitive" } })) } });
  }
  if (!mat) {
    console.warn(`❔ Material VINIL não encontrado: ${name}`);
    return;
  }

  // Ensure generic supplier
  const supplierName = pickGenericSupplierName(row.brand);
  const supplierId = await ensureSupplierByName(supplierName);

  // Update material: supplierId + supplierUnitCost (per m2)
  await prisma.material.update({
    where: { id: mat.id },
    data: {
      unit: Unit.M2,
      supplierId,
      supplierUnitCost: row.costPerM2.toFixed(4),
      isCurrent: true,
      active: true,
    },
  });
  console.log(`✔ Atualizado: ${mat.name} → supplier=${supplierName}, supplierUnitCost=${row.costPerM2.toFixed(4)} €/m²`);

  // Optionally update/create variant label if helpful (skip to avoid side effects)
}

async function main() {
  console.log("🔧 Aplicando custos de fornecedor (VINIL) e fornecedores genéricos…");
  const rows = rowsFromPrompt();
  for (const r of rows) {
    await upsertSupplierCostForVinyl(r);
  }
  console.log("🏁 Concluído.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect().finally(() => process.exit(1)); });


