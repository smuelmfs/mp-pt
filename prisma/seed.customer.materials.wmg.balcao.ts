import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

const MATERIALS = [
  { name: "Estrutura Balcão Promocional A", type: "publicitario", unit: Unit.UNIT, unitCost: "0.0000" },
];

const CUSTOMER_PRICES = [
  { customer: "WMG", material: "Estrutura Balcão Promocional A", unitCost: 0.0 },
];

async function main() {
  console.log("🚀 Seed — Material Estrutura Balcão Promocional A + preço por cliente (WMG)");

  for (const m of MATERIALS) {
    let material = await prisma.material.findFirst({ where: { name: { equals: m.name, mode: "insensitive" } } });

    if (!material) {
      material = await prisma.material.create({
        data: { name: m.name, type: m.type, unit: m.unit, unitCost: m.unitCost as any, active: true, isCurrent: true },
      });
      console.log(`✔ Material criado: ${material.name} (id ${material.id})`);
    } else {
      console.log(`ℹ️ Material já existente: ${material.name} (id ${material.id})`);
    }

    for (const c of CUSTOMER_PRICES.filter(cp => cp.material === m.name)) {
      const customer = await prisma.customer.findFirst({ where: { name: { equals: c.customer, mode: "insensitive" } } });
      if (!customer) { console.warn(`❔ Cliente não encontrado: ${c.customer}`); continue; }

      const existing = await prisma.materialCustomerPrice.findFirst({
        where: { materialId: material.id, customerId: customer.id, isCurrent: true },
        select: { id: true },
      });

      if (!existing) {
        await prisma.materialCustomerPrice.create({ data: { materialId: material.id, customerId: customer.id, unitCost: c.unitCost, isCurrent: true, priority: 100 } });
      } else {
        await prisma.materialCustomerPrice.update({ where: { id: existing.id }, data: { unitCost: c.unitCost, isCurrent: true } });
      }
      console.log(`✔ Price aplicado: ${c.customer} → ${m.name} = ${c.unitCost.toFixed(2)} €`);
    }
  }

  console.log("🏁 Concluído.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
