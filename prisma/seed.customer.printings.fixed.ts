import { PrismaClient, PrintingTech } from "@prisma/client";

const prisma = new PrismaClient();

// Impressões necessárias (GRANDE_FORMATO). unitPrice 0: preço vem do cliente.
const PRINTINGS = [
  { formatLabel: "Tela 85×200 – Leiripantone", technology: PrintingTech.GRANDE_FORMATO, unitPrice: 0, minFee: null as number | null, setupMinutes: 0 },
  { formatLabel: "Tela / lona 85×200 – NHM",   technology: PrintingTech.GRANDE_FORMATO, unitPrice: 0, minFee: null as number | null, setupMinutes: 0 },
  { formatLabel: "Impressão e Acabamento – Publifast", technology: PrintingTech.GRANDE_FORMATO, unitPrice: 0, minFee: null as number | null, setupMinutes: 0 },
  { formatLabel: "Impressão NHM – Peça 1", technology: PrintingTech.GRANDE_FORMATO, unitPrice: 0, minFee: null as number | null, setupMinutes: 0 },
  { formatLabel: "Impressão NHM – Peça 2", technology: PrintingTech.GRANDE_FORMATO, unitPrice: 0, minFee: null as number | null, setupMinutes: 0 },
];

// Preços por cliente (PrintingCustomerPrice)
const CUSTOMER_PRINTING_PRICES = [
  // TECOFIX
  { customer: "TECOFIX", printing: "Tela 85×200 – Leiripantone", unitPrice: 35.00 },
  { customer: "TECOFIX", printing: "Impressão e Acabamento – Publifast", unitPrice: 32.39 },

  // ISCF
  { customer: "ISCF", printing: "Tela 85×200 – Leiripantone", unitPrice: 35.00 },
  { customer: "ISCF", printing: "Tela / lona 85×200 – NHM", unitPrice: 30.00 },

  // Abbott
  { customer: "Abbott", printing: "Tela / lona 85×200 – NHM", unitPrice: 30.00 },

  // WMG
  { customer: "WMG", printing: "Impressão NHM – Peça 1", unitPrice: 12.00 },
  { customer: "WMG", printing: "Impressão NHM – Peça 2", unitPrice: 60.00 },
];

async function upsertPrintings() {
  for (const p of PRINTINGS) {
    const exists = await prisma.printing.findFirst({ where: { formatLabel: { equals: p.formatLabel, mode: "insensitive" } } });
    if (exists) {
      await prisma.printing.update({ where: { id: exists.id }, data: { technology: p.technology, unitPrice: p.unitPrice, minFee: p.minFee, setupMinutes: p.setupMinutes, isCurrent: true, active: true } });
    } else {
      await prisma.printing.create({ data: { technology: p.technology, formatLabel: p.formatLabel, unitPrice: p.unitPrice, minFee: p.minFee, setupMinutes: p.setupMinutes, isCurrent: true, active: true } });
    }
    console.log(`✔ Impressão garantida: ${p.formatLabel}`);
  }
}

async function upsertPrintingCustomerPrice(printingId: number, customerId: number, unitPrice: number) {
  const existing = await prisma.printingCustomerPrice.findFirst({
    where: { printingId, customerId, isCurrent: true },
    select: { id: true },
  });
  if (!existing) {
    await prisma.printingCustomerPrice.create({ data: { printingId, customerId, unitPrice, isCurrent: true, priority: 100 } });
  } else {
    await prisma.printingCustomerPrice.update({ where: { id: existing.id }, data: { unitPrice, isCurrent: true } });
  }
}

async function main() {
  console.log("🚀 Seed — Impressões + preços específicos por cliente");
  await upsertPrintings();

  for (const row of CUSTOMER_PRINTING_PRICES) {
    const customer = await prisma.customer.findFirst({ where: { name: { equals: row.customer, mode: "insensitive" } }, select: { id: true, name: true } });
    if (!customer) { console.warn(`❔ Cliente não encontrado: ${row.customer}`); continue; }

    const printing = await prisma.printing.findFirst({ where: { formatLabel: { equals: row.printing, mode: "insensitive" } }, select: { id: true, formatLabel: true } });
    if (!printing) { console.warn(`❔ Impressão não encontrada: ${row.printing}`); continue; }

    await upsertPrintingCustomerPrice(printing.id, customer.id, row.unitPrice);
    console.log(`✔ Price aplicado: ${customer.name} → ${row.printing} = ${row.unitPrice.toFixed(2)} €`);
  }

  console.log("🏁 Concluído.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => prisma.$disconnect().finally(() => { console.error(e); process.exit(1); }));
