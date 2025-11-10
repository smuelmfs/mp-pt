import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script para limpar duplicatas de preços por cliente
 * Mantém apenas o preço mais recente ou com maior prioridade
 */

async function cleanDuplicates() {
  console.log('🧹 Limpando duplicatas de preços por cliente...\n');

  // Materiais duplicados
  const materialPrices = await prisma.materialCustomerPrice.findMany({
    where: { isCurrent: true },
    include: { material: { select: { name: true } }, customer: { select: { name: true } } },
    orderBy: [{ customerId: 'asc' }, { materialId: 'asc' }, { priority: 'asc' }, { id: 'desc' }],
  });

  const matMap = new Map<string, any[]>();
  for (const mp of materialPrices) {
    const key = `${mp.customerId}-${mp.materialId}`;
    const existing = matMap.get(key) || [];
    existing.push(mp);
    matMap.set(key, existing);
  }

  let matRemoved = 0;
  for (const [key, prices] of matMap.entries()) {
    if (prices.length > 1) {
      // Mantém o primeiro (maior prioridade, mais recente)
      const toKeep = prices[0];
      const toRemove = prices.slice(1);

      for (const dup of toRemove) {
        await prisma.materialCustomerPrice.update({
          where: { id: dup.id },
          data: { isCurrent: false },
        });
        matRemoved++;
        console.log(`  🗑️  Removido duplicata: ${dup.customer.name} → ${dup.material.name} (id ${dup.id})`);
      }
    }
  }

  // Impressões duplicadas
  const printingPrices = await prisma.printingCustomerPrice.findMany({
    where: { isCurrent: true },
    include: { printing: { select: { formatLabel: true } }, customer: { select: { name: true } } },
    orderBy: [{ customerId: 'asc' }, { printingId: 'asc' }, { sides: 'asc' }, { priority: 'asc' }, { id: 'desc' }],
  });

  const prnMap = new Map<string, any[]>();
  for (const pp of printingPrices) {
    const key = `${pp.customerId}-${pp.printingId}-${pp.sides ?? 'null'}`;
    const existing = prnMap.get(key) || [];
    existing.push(pp);
    prnMap.set(key, existing);
  }

  let prnRemoved = 0;
  for (const [key, prices] of prnMap.entries()) {
    if (prices.length > 1) {
      const toKeep = prices[0];
      const toRemove = prices.slice(1);

      for (const dup of toRemove) {
        await prisma.printingCustomerPrice.update({
          where: { id: dup.id },
          data: { isCurrent: false },
        });
        prnRemoved++;
        console.log(`  🗑️  Removido duplicata: ${dup.customer.name} → ${dup.printing.formatLabel} (id ${dup.id})`);
      }
    }
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n📊 RESUMO:');
  console.log(`  🗑️  Materiais duplicados removidos: ${matRemoved}`);
  console.log(`  🗑️  Impressões duplicadas removidas: ${prnRemoved}`);
  console.log(`  📋 Total removido: ${matRemoved + prnRemoved}\n`);
}

async function fixSpecificIssues() {
  console.log('🔧 Corrigindo problemas específicos...\n');

  // TECOFIX: Base Roll Up Weddt deve ser €15.54 (não €44.75)
  const tecofix = await prisma.customer.findFirst({ where: { name: { equals: 'TECOFIX', mode: 'insensitive' } } });
  const baseRollUp = await prisma.material.findFirst({ where: { name: { contains: 'Base Roll Up Weddt', mode: 'insensitive' } } });

  if (tecofix && baseRollUp) {
    const prices = await prisma.materialCustomerPrice.findMany({
      where: {
        customerId: tecofix.id,
        materialId: baseRollUp.id,
        isCurrent: true,
      },
    });

    if (prices.length > 1) {
      // Mantém apenas o com preço correto (€15.54)
      for (const price of prices) {
        const cost = Number(price.unitCost);
        if (Math.abs(cost - 15.54) < 0.01) {
          // Mantém este
          continue;
        } else {
          await prisma.materialCustomerPrice.update({
            where: { id: price.id },
            data: { isCurrent: false },
          });
          console.log(`  🔧 Removido preço incorreto: TECOFIX → Base Roll Up Weddt: €${cost.toFixed(2)}`);
        }
      }
    }
  }

  // RODRIGUES & GONÇALVES: Remover "Base Roll Up Weddt" duplicado (manter apenas "Balcão WEDDT")
  const rodrigues = await prisma.customer.findFirst({ where: { name: { contains: 'RODRIGUES', mode: 'insensitive' } } });
  if (rodrigues && baseRollUp) {
    const prices = await prisma.materialCustomerPrice.findMany({
      where: {
        customerId: rodrigues.id,
        materialId: baseRollUp.id,
        isCurrent: true,
      },
    });

    if (prices.length > 0) {
      // Remove "Base Roll Up Weddt" se houver "Balcão WEDDT"
      const balcao = await prisma.material.findFirst({ where: { name: { contains: 'Balcão WEDDT', mode: 'insensitive' } } });
      if (balcao) {
        const balcaoPrice = await prisma.materialCustomerPrice.findFirst({
          where: {
            customerId: rodrigues.id,
            materialId: balcao.id,
            isCurrent: true,
          },
        });

        if (balcaoPrice) {
          // Remove Base Roll Up Weddt
          for (const price of prices) {
            await prisma.materialCustomerPrice.update({
              where: { id: price.id },
              data: { isCurrent: false },
            });
            console.log(`  🔧 Removido duplicata: RODRIGUES & GONÇALVES → Base Roll Up Weddt (mantém Balcão WEDDT)`);
          }
        }
      }
    }
  }

  // Clientes FLEX: Remover "FLEX" genérico se já tiverem "Vinil FLEX BRANCO"
  const flexBranco = await prisma.material.findFirst({ where: { name: { contains: 'FLEX BRANCO', mode: 'insensitive' } } });
  const flexGeneric = await prisma.material.findFirst({ where: { name: { equals: 'FLEX' }, type: { equals: 'flex' } } });

  if (flexBranco && flexGeneric) {
    const customers = await prisma.customer.findMany({ where: { isActive: true } });

    for (const customer of customers) {
      const brancoPrice = await prisma.materialCustomerPrice.findFirst({
        where: {
          customerId: customer.id,
          materialId: flexBranco.id,
          isCurrent: true,
        },
      });

      const genericPrice = await prisma.materialCustomerPrice.findFirst({
        where: {
          customerId: customer.id,
          materialId: flexGeneric.id,
          isCurrent: true,
        },
      });

      if (brancoPrice && genericPrice) {
        // Remove o genérico
        await prisma.materialCustomerPrice.update({
          where: { id: genericPrice.id },
          data: { isCurrent: false },
        });
        console.log(`  🔧 Removido FLEX genérico: ${customer.name} (mantém Vinil FLEX BRANCO)`);
      }
    }
  }

  console.log('');
}

async function main() {
  console.log('🚀 Patch — Limpeza de Duplicatas de Preços por Cliente\n');
  console.log('='.repeat(120));

  await cleanDuplicates();
  await fixSpecificIssues();

  console.log('✅ Limpeza concluída!\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

