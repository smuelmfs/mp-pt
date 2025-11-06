import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

type Row = {
  name: string;          // normalized material name
  sheetWidthM: number;   // full sheet width
  sheetLengthM: number;  // full sheet length
  supplierSheetCost: number; // EUR per sheet
  costPerM2: number;     // EUR per m2 (from sheet)
};

function rowsFromPrompt(): Row[] {
  // Alinhados com os nomes existentes no banco
  return [
    { name: "Alveolar Dipac 5mm – chapa 2000×2000", sheetWidthM: 2.00, sheetLengthM: 2.00, supplierSheetCost: 16.34, costPerM2: 4.09 },
    { name: "Alveolar Dipac 5mm – chapa 2500×2000", sheetWidthM: 2.50, sheetLengthM: 2.00, supplierSheetCost: 20.42, costPerM2: 4.08 },
    { name: "Dipac High Perform 3.5mm – chapa 3040×2020", sheetWidthM: 3.04, sheetLengthM: 2.02, supplierSheetCost: 16.33, costPerM2: 2.66 },
    { name: "Foam Light 5mm – chapa 3050×2050", sheetWidthM: 3.05, sheetLengthM: 2.05, supplierSheetCost: 65.22, costPerM2: 10.43 },
    { name: "Foam Light 4mm – chapa 3050×2050", sheetWidthM: 3.05, sheetLengthM: 2.05, supplierSheetCost: 55.83, costPerM2: 8.93 },
    { name: "ACM 3mm – chapa 1500×1000", sheetWidthM: 1.50, sheetLengthM: 1.00, supplierSheetCost: 35.56, costPerM2: 23.71 },
  ];
}

function pickGenericSupplier(name: string): string {
  const s = name.toLowerCase();
  if (s.includes("dipac")) return "Fornecedor Alveolar A";
  if (s.includes("foam")) return "Fornecedor Alveolar B";
  if (s.includes("acm")) return "Fornecedor Alveolar C";
  return "Fornecedor Alveolar A";
}

async function ensureSupplier(name: string) {
  const existing = await prisma.supplier.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) return existing.id;
  const created = await prisma.supplier.create({ data: { name, active: true } });
  return created.id;
}

function norm(s: string) { return s.replace(/\s+/g, " ").trim(); }

async function updateMaterial(row: Row) {
  const targetName = norm(row.name);
  // Try exact by type rigid/others
  let mat = await prisma.material.findFirst({ where: { name: { equals: targetName, mode: "insensitive" } } as any });
  if (!mat) {
    // try contains tokens
    const tokens = targetName.split(" ").filter(Boolean).slice(0, 4);
    mat = await prisma.material.findFirst({ where: { AND: [ { type: { in: ["rigido","alveolar"] as any } }, ...tokens.map(t => ({ name: { contains: t, mode: "insensitive" } })) ] } as any });
  }
  if (!mat) {
    console.warn(`❔ Material ALVEOLAR não encontrado: ${targetName}`);
    return;
  }

  const supplierName = pickGenericSupplier(targetName);
  const supplierId = await ensureSupplier(supplierName);

  // Connect supplier and set unit M2 via Prisma client
  await prisma.material.update({ where: { id: mat.id }, data: { unit: Unit.M2, supplier: { connect: { id: supplierId } }, isCurrent: true, active: true } });

  // Set supplierUnitCost via raw SQL for compatibility
  await prisma.$executeRawUnsafe(
    `UPDATE "Material" SET "supplierUnitCost" = $1::numeric WHERE "id" = $2`,
    row.costPerM2.toFixed(4),
    mat.id
  );

  console.log(`✔ Atualizado: ${mat.name} → ${supplierName}, supplierUnitCost=${row.costPerM2.toFixed(4)} €/m²`);
}

async function main() {
  console.log("🔧 Aplicando custos e fornecedores genéricos — ALVEOLAR/rigidos …");
  // ensure generic suppliers exist
  for (const n of ["Fornecedor Alveolar A","Fornecedor Alveolar B","Fornecedor Alveolar C"]) {
    await ensureSupplier(n);
  }
  const rows = rowsFromPrompt();
  for (const r of rows) {
    await updateMaterial(r);
  }
  console.log("🏁 Concluído.");
}

main().then(()=>prisma.$disconnect()).catch(e=>{ console.error(e); prisma.$disconnect().finally(()=>process.exit(1)); });


