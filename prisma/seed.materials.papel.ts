import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seed — Materiais tipo PAPEL");

  const materials: Array<{ name: string; type: string; unit: Unit; unitCost: number }> = [
    { name: "Papel Condat Gloss 150g", type: "papel", unit: Unit.SHEET, unitCost: 0.06 },
    { name: "Papel Condat Gloss 170g", type: "papel", unit: Unit.SHEET, unitCost: 0.073 },
    { name: "Papel Condat Gloss 250g", type: "papel", unit: Unit.SHEET, unitCost: 0.0946 },
    { name: "Papel Condat Silk 300g", type: "papel", unit: Unit.SHEET, unitCost: 0.06 },
    { name: "Papel Condat Silk 350g", type: "papel", unit: Unit.SHEET, unitCost: 0.1355 },
    { name: "Papel Gloss 400g", type: "papel", unit: Unit.SHEET, unitCost: 0.1433 },
    { name: "Papel IOR 90g", type: "papel", unit: Unit.SHEET, unitCost: 0.0571 },
    { name: "Papel Multiloft Adesivo 1 Face Branco", type: "papel", unit: Unit.SHEET, unitCost: 0.6696 },
    { name: "Papel Multiloft Adesivo 2 Faces Verde Turquesa", type: "papel", unit: Unit.SHEET, unitCost: 0.9339 },
    { name: "Papel Digilabel Com Cortes Silk Autocolante", type: "papel", unit: Unit.SHEET, unitCost: 0.38 },
    { name: "Papel Jac-Datapol White Gloss 32x45", type: "papel", unit: Unit.SHEET, unitCost: 0.76 },
    { name: "Papel Polylaser Branco Brilho", type: "papel", unit: Unit.SHEET, unitCost: 0.783 },
    { name: "Papel Novatech Digital Silk 350g", type: "papel", unit: Unit.SHEET, unitCost: 0.1549 },
    { name: "Papel Invercote Creato 350g", type: "papel", unit: Unit.SHEET, unitCost: 0.4369 },
  ];

  for (const mat of materials) {
    const existing = await prisma.material.findFirst({ where: { name: mat.name } });
    if (existing) {
      await prisma.material.update({ where: { id: existing.id }, data: { unitCost: String(mat.unitCost), type: mat.type, unit: mat.unit, isCurrent: true, active: true } });
      console.log(`✔ Material atualizado: ${mat.name}`);
    } else {
      await prisma.material.create({ data: { name: mat.name, type: mat.type, unit: mat.unit, unitCost: String(mat.unitCost), isCurrent: true, active: true } });
      console.log(`✔ Material criado: ${mat.name}`);
    }
  }

  console.log("🏁 Concluído.");
}

main().finally(() => prisma.$disconnect());
