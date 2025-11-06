import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

type Row = {
  name: string;
  supplier: "INAPA" | "ANTALIS";
  unitPrice: number; // €/folha
};

function rowsFromPrompt(): Row[] {
  return [
    { name: "Papel Condat Gloss 150g", supplier: "INAPA", unitPrice: 0.0600 },
    { name: "Papel Condat Gloss 170g", supplier: "INAPA", unitPrice: 0.0730 },
    { name: "Papel Condat Gloss 250g", supplier: "INAPA", unitPrice: 0.0946 },
    { name: "Papel Condat Silk 300g", supplier: "INAPA", unitPrice: 0.0600 },
    { name: "Papel Condat Silk 350g", supplier: "INAPA", unitPrice: 0.1355 },
    { name: "Papel Gloss 400g", supplier: "INAPA", unitPrice: 0.1433 },
    { name: "Papel IOR 90g", supplier: "INAPA", unitPrice: 0.0571 },
    { name: "Papel IOR 90g (64x90 cortado)", supplier: "INAPA", unitPrice: 0.0275 },
    { name: "Papel Multiloft Adesivo 1 Face Branco", supplier: "INAPA", unitPrice: 0.6696 },
    { name: "Papel Multiloft Adesivo 2 Faces Verde Turquesa", supplier: "INAPA", unitPrice: 0.9339 },
    { name: "Papel Digilabel Com Cortes Silk Autocolante", supplier: "INAPA", unitPrice: 0.3800 },
    { name: "Papel Jac-Datapol White Gloss 32x45", supplier: "INAPA", unitPrice: 0.7600 },
    { name: "Papel Polylaser Branco Brilho", supplier: "ANTALIS", unitPrice: 0.7830 },
    { name: "Papel Novatech Digital Silk 350g", supplier: "ANTALIS", unitPrice: 0.1549 },
    { name: "Papel Print Speed Laser Jet IOR 90g", supplier: "ANTALIS", unitPrice: 0.03134 },
    { name: "Papel Invercote Creato 350g", supplier: "ANTALIS", unitPrice: 0.4369 },
  ];
}

async function ensureSupplier(name: string) {
  const s = await prisma.supplier.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (s) return s.id;
  const created = await prisma.supplier.create({ data: { name, active: true } });
  return created.id;
}

async function applyRow(r: Row) {
  const mat = await prisma.material.findFirst({ where: { name: { equals: r.name, mode: "insensitive" }, type: "papel" } });
  if (!mat) {
    console.warn(`❔ Material PAPEL não encontrado: ${r.name}`);
    return;
  }
  const supplierId = await ensureSupplier(r.supplier);
  // Conecta fornecedor (se ainda não conectado) e garante unidade SHEET
  await prisma.material.update({ where: { id: mat.id }, data: { unit: Unit.SHEET, supplier: { connect: { id: supplierId } }, isCurrent: true, active: true } });
  // Grava custo do fornecedor por folha em supplierUnitCost
  await prisma.$executeRawUnsafe(
    `UPDATE "Material" SET "supplierUnitCost" = $1::numeric WHERE "id" = $2`,
    r.unitPrice.toFixed(4),
    mat.id
  );
  console.log(`✔ ${r.name} → ${r.supplier}, supplierUnitCost=${r.unitPrice.toFixed(4)} €/folha`);
}

async function main() {
  console.log("🔧 Aplicando custos e fornecedores — PAPEL …");
  const rows = rowsFromPrompt();
  for (const r of rows) await applyRow(r);
  console.log("🏁 Concluído.");
}

main().then(()=>prisma.$disconnect()).catch(e=>{ console.error(e); prisma.$disconnect().finally(()=>process.exit(1)); });


