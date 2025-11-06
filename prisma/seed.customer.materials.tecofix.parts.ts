import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

// Novos materiais de suporte individuais (Bandeira Gota)
const MATERIALS = [
  { name: "Estrutura Weddt Bandeira Gota 2,2 m – Suporte", type: "suporte", unit: Unit.UNIT, unitCost: 15.61 },
  { name: "Estrutura Weddt Bandeira Gota 2,2 m – Boia", type: "suporte", unit: Unit.UNIT, unitCost: 5.08 },
  { name: "Estrutura Weddt Bandeira Gota 2,2 m – Pé", type: "suporte", unit: Unit.UNIT, unitCost: 24.06 },
];

// Preços específicos do cliente TECOFIX
const CUSTOMER_MAT_PRICES = [
  { customer: "TECOFIX", material: "Estrutura Weddt Bandeira Gota 2,2 m – Suporte", unitCost: 15.61 },
  { customer: "TECOFIX", material: "Estrutura Weddt Bandeira Gota 2,2 m – Boia", unitCost: 5.08 },
  { customer: "TECOFIX", material: "Estrutura Weddt Bandeira Gota 2,2 m – Pé", unitCost: 24.06 },
];

async function upsertMaterials() {
  for (const m of MATERIALS) {
    const existing = await prisma.material.findFirst({ where: { name: m.name } });
    const row = existing
      ? await prisma.material.update({ where: { id: existing.id }, data: { type: "suporte", unit: Unit.UNIT, unitCost: m.unitCost, active: true, isCurrent: true } })
      : await prisma.material.create({ data: { name: m.name, type: "suporte", unit: Unit.UNIT, unitCost: m.unitCost, active: true, isCurrent: true } });
    console.log(`✔ Material garantido: ${row.name} (id ${row.id})`);
  }
}

async function upsertMaterialCustomerPrice(materialId: number, customerId: number, unitCost: number) {
  const existing = await prisma.materialCustomerPrice.findFirst({
    where: { materialId, customerId, isCurrent: true },
    select: { id: true },
  });

  if (!existing) {
    await prisma.materialCustomerPrice.create({ data: { materialId, customerId, unitCost, isCurrent: true } });
  } else {
    await prisma.materialCustomerPrice.update({ where: { id: existing.id }, data: { unitCost, isCurrent: true } });
  }
}

async function main() {
  console.log("🚀 Seed — Materiais TECOFIX (partes da Bandeira Gota)");
  await upsertMaterials();

  const tecofix = await prisma.customer.findFirst({ where: { name: { equals: "TECOFIX", mode: "insensitive" } }, select: { id: true } });

  if (!tecofix) {
    console.warn("❌ Cliente TECOFIX não encontrado. Crie o cliente antes de rodar este seed.");
    return;
  }

  for (const row of CUSTOMER_MAT_PRICES) {
    const mat = await prisma.material.findFirst({ where: { name: { equals: row.material, mode: "insensitive" } }, select: { id: true, name: true } });

    if (!mat) {
      console.warn(`❔ Material não encontrado: ${row.material}`);
      continue;
    }

    await upsertMaterialCustomerPrice(mat.id, tecofix.id, row.unitCost);
    console.log(`✔ Price aplicado: TECOFIX → ${row.material} = ${row.unitCost.toFixed(2)} €`);
  }

  console.log("🏁 Concluído.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => prisma.$disconnect().finally(() => { console.error(e); process.exit(1); }));
