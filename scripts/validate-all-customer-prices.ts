import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 VALIDAÇÃO: Preços por Cliente (Todos os Clientes)\n');
  console.log('='.repeat(120));

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      materialPrices: { 
        where: { isCurrent: true },
        include: { material: { select: { name: true } } },
      },
      printingPrices: { 
        where: { isCurrent: true },
        include: { printing: { select: { formatLabel: true, technology: true } } },
      },
      finishPrices: { 
        where: { isCurrent: true },
        include: { finish: { select: { name: true, category: true } } },
      },
    },
  });

  console.log(`\n📋 Total de clientes ativos: ${customers.length}\n`);

  let totalMatPrices = 0;
  let totalPrnPrices = 0;
  let totalFinPrices = 0;

  for (const customer of customers) {
    const matCount = customer.materialPrices.length;
    const prnCount = customer.printingPrices.length;
    const finCount = customer.finishPrices.length;
    const total = matCount + prnCount + finCount;

    totalMatPrices += matCount;
    totalPrnPrices += prnCount;
    totalFinPrices += finCount;

    if (total > 0) {
      console.log(`\n👤 ${customer.name} (id ${customer.id}):`);
      console.log(`   📦 Materiais: ${matCount}`);
      if (matCount > 0) {
        customer.materialPrices.forEach(mp => {
          console.log(`      - ${mp.material.name}: €${Number(mp.unitCost).toFixed(4)}`);
        });
      }
      console.log(`   🖨️  Impressões: ${prnCount}`);
      if (prnCount > 0) {
        customer.printingPrices.forEach(pp => {
          const label = pp.printing.formatLabel || `${pp.printing.technology}`;
          console.log(`      - ${label}: €${Number(pp.unitPrice).toFixed(4)}${pp.sides ? ` (${pp.sides} lados)` : ''}`);
        });
      }
      console.log(`   ✂️  Acabamentos: ${finCount}`);
      if (finCount > 0) {
        customer.finishPrices.forEach(fp => {
          console.log(`      - ${fp.finish.name} (${fp.finish.category}): €${Number(fp.baseCost).toFixed(4)}`);
        });
      }
    } else {
      console.log(`\n👤 ${customer.name} (id ${customer.id}): Sem preços específicos`);
    }
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n📊 RESUMO GERAL:');
  console.log(`  👥 Clientes: ${customers.length}`);
  console.log(`  📦 Preços de Materiais: ${totalMatPrices}`);
  console.log(`  🖨️  Preços de Impressões: ${totalPrnPrices}`);
  console.log(`  ✂️  Preços de Acabamentos: ${totalFinPrices}`);
  console.log(`  📋 Total de Preços: ${totalMatPrices + totalPrnPrices + totalFinPrices}\n`);

  // Clientes sem preços
  const customersWithoutPrices = customers.filter(c => 
    c.materialPrices.length === 0 && 
    c.printingPrices.length === 0 && 
    c.finishPrices.length === 0
  );

  if (customersWithoutPrices.length > 0) {
    console.log('⚠️  Clientes sem preços específicos:');
    customersWithoutPrices.forEach(c => {
      console.log(`  - ${c.name} (id ${c.id})`);
    });
    console.log('');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

