import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Corrigindo preço: TECOFIX → Base Roll Up Weddt\n');

  const tecofix = await prisma.customer.findFirst({
    where: { name: { equals: 'TECOFIX', mode: 'insensitive' } },
  });

  const baseRollUp = await prisma.material.findFirst({
    where: { name: { contains: 'Base Roll Up Weddt', mode: 'insensitive' } },
  });

  if (!tecofix || !baseRollUp) {
    console.log('⚠️  Cliente ou material não encontrado');
    await prisma.$disconnect();
    return;
  }

  const price = await prisma.materialCustomerPrice.findFirst({
    where: {
      customerId: tecofix.id,
      materialId: baseRollUp.id,
      isCurrent: true,
    },
  });

  if (price) {
    const currentCost = Number(price.unitCost);
    if (Math.abs(currentCost - 15.54) > 0.01) {
      await prisma.materialCustomerPrice.update({
        where: { id: price.id },
        data: { unitCost: 15.54 },
      });
      console.log(`✅ Preço corrigido: TECOFIX → Base Roll Up Weddt: €${currentCost.toFixed(2)} → €15.54\n`);
    } else {
      console.log(`✓ Preço já está correto: €${currentCost.toFixed(2)}\n`);
    }
  } else {
    console.log('⚠️  Preço não encontrado\n');
  }

  await prisma.$disconnect();
}

main().catch(console.error);

