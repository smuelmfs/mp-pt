import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Verificando preços de impressão por cliente\n');
  console.log('='.repeat(120));

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    include: {
      printingPrices: {
        where: { isCurrent: true },
        include: {
          printing: { select: { formatLabel: true, technology: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  for (const customer of customers) {
    if (customer.printingPrices.length > 0) {
      console.log(`\n👤 ${customer.name} (id ${customer.id}):`);
      customer.printingPrices.forEach(pp => {
        console.log(`  🖨️  ${pp.printing.formatLabel || pp.printing.technology}: €${Number(pp.unitPrice).toFixed(2)}${pp.sides ? ` (${pp.sides} lados)` : ''} (id ${pp.id}, isCurrent: ${pp.isCurrent})`);
      });
    }
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n📊 Total de preços de impressão (isCurrent: true):');
  const total = await prisma.printingCustomerPrice.count({
    where: { isCurrent: true },
  });
  console.log(`  Total: ${total}\n`);

  await prisma.$disconnect();
}

main().catch(console.error);

