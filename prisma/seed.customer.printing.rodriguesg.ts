import { PrismaClient, PrintingTech } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seed — Impressão NHM (Rodrigues & Gonçalves)");

  const formatLabel = "Impressão NHM – Balcão Panel Track";
  let printing = await prisma.printing.findFirst({ where: { formatLabel: { equals: formatLabel, mode: "insensitive" } } });

  if (!printing) {
    printing = await prisma.printing.create({
      data: { technology: PrintingTech.GRANDE_FORMATO, formatLabel, unitPrice: 0, active: true, isCurrent: true, setupMinutes: 0 },
    });
    console.log(`✔ Impressão criada: ${formatLabel} (id ${printing.id})`);
  } else {
    console.log(`ℹ️ Impressão já existente: ${formatLabel} (id ${printing.id})`);
  }

  const customer = await prisma.customer.findFirst({ where: { name: { equals: "RODRIGUES & GONÇALVES", mode: "insensitive" } } });
  if (!customer) { console.warn("❔ Cliente não encontrado: RODRIGUES & GONÇALVES"); return; }

  const existing = await prisma.printingCustomerPrice.findFirst({ where: { printingId: printing.id, customerId: customer.id, isCurrent: true }, select: { id: true } });
  if (!existing) {
    await prisma.printingCustomerPrice.create({ data: { printingId: printing.id, customerId: customer.id, unitPrice: 45.0, isCurrent: true, priority: 100 } });
  } else {
    await prisma.printingCustomerPrice.update({ where: { id: existing.id }, data: { unitPrice: 45.0, isCurrent: true } });
  }

  console.log(`✔ Price aplicado: RODRIGUES & GONÇALVES → ${formatLabel} = 45.00 €`);
  console.log("🏁 Concluído.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
