import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

// Materiais de suporte que devem existir para aparecer na combo de "Clientes > Preços > Materiais"
const MATERIALS: Array<{ name: string; type: string; unit: Unit; unitCost: number; active?: boolean }> = [
  { name: "Base Roll Up Weddt", type: "suporte", unit: Unit.UNIT, unitCost: 15.54, active: true },
  { name: "Conjunto Estrutura Bandeira Gota 2,2 m (Weddt)", type: "suporte", unit: Unit.UNIT, unitCost: 44.75, active: true },
  { name: "Base Roll Up Dimatur", type: "suporte", unit: Unit.UNIT, unitCost: 16.91, active: true },
  { name: "Balcão WEDDT", type: "suporte", unit: Unit.UNIT, unitCost: 100.42, active: true },
];

// Preços por cliente (MaterialCustomerPrice)
const CUSTOMER_MAT_PRICES: Array<{ customer: string; material: string; unitCost: number; priority?: number }> = [
  // TECOFIX
  { customer: "TECOFIX", material: "Base Roll Up Weddt", unitCost: 15.54 },
  { customer: "TECOFIX", material: "Conjunto Estrutura Bandeira Gota 2,2 m (Weddt)", unitCost: 44.75 },

  // ISCF
  { customer: "ISCF", material: "Base Roll Up Dimatur", unitCost: 16.91 },

  // Abbott
  { customer: "Abbott", material: "Base Roll Up Dimatur", unitCost: 16.91 },

  // RODRIGUES & GONÇALVES
  { customer: "RODRIGUES & GONÇALVES", material: "Balcão WEDDT", unitCost: 100.42 },
];

async function upsertMaterials() {
  for (const m of MATERIALS) {
    const existing = await prisma.material.findFirst({ where: { name: m.name } });
    const row = existing
      ? await prisma.material.update({
          where: { id: existing.id },
          data: { type: m.type, unit: m.unit, unitCost: m.unitCost, active: m.active ?? true, isCurrent: true },
        })
      : await prisma.material.create({
          data: { name: m.name, type: m.type, unit: m.unit, unitCost: m.unitCost, active: m.active ?? true, isCurrent: true },
        });
    console.log(`✔ Material garantido: ${row.name} (id ${row.id})`);
  }
}

async function upsertMaterialCustomerPrice(materialId: number, customerId: number, unitCost: number, priority = 100) {
  const existing = await prisma.materialCustomerPrice.findFirst({
    where: { materialId, customerId, isCurrent: true },
    orderBy: [{ priority: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  if (!existing) {
    await prisma.materialCustomerPrice.create({
      data: { materialId, customerId, unitCost, priority, isCurrent: true },
    });
  } else {
    await prisma.materialCustomerPrice.update({
      where: { id: existing.id },
      data: { unitCost, isCurrent: true, priority },
    });
  }
}

async function main() {
  console.log("🚀 Seed — Materiais de suporte + preços por cliente");
  await upsertMaterials();

  for (const row of CUSTOMER_MAT_PRICES) {
    const customer = await prisma.customer.findFirst({
      where: { name: { equals: row.customer, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (!customer) {
      console.warn(`❔ Cliente não encontrado: "${row.customer}" — pulando`);
      continue;
    }

    const material = await prisma.material.findFirst({
      where: { name: { equals: row.material, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (!material) {
      console.warn(`❔ Material não encontrado: "${row.material}" — pulando`);
      continue;
    }

    await upsertMaterialCustomerPrice(material.id, customer.id, row.unitCost, row.priority ?? 100);
    console.log(`✔ Price aplicado: ${customer.name} → ${material.name} = ${row.unitCost.toFixed(2)} €`);
  }

  console.log("🏁 Concluído.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => prisma.$disconnect().finally(() => { console.error(e); process.exit(1); }));
