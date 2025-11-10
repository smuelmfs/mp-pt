import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 VALIDAÇÃO: Fase 1 - Impressões Básicas e Acabamentos\n');
  console.log('='.repeat(120));

  // Impressões básicas
  const printings = await prisma.printing.findMany({
    where: {
      technology: 'DIGITAL',
      isCurrent: true,
    },
    orderBy: { formatLabel: 'asc' },
  });

  console.log(`\n📄 IMPRESSÕES BÁSICAS (DIGITAL): ${printings.length}\n`);
  console.log(
    'FORMATO'.padEnd(20) +
    'CORES'.padEnd(10) +
    'PREÇO (€)'.padEnd(15) +
    'ATIVO'
  );
  console.log('-'.repeat(60));

  for (const p of printings) {
    const formato = (p.formatLabel || '-').substring(0, 18).padEnd(20);
    const cores = (p.colors || '-').padEnd(10);
    const preco = `€${Number(p.unitPrice).toFixed(4)}`.padEnd(15);
    const ativo = p.active ? '✅' : '❌';
    console.log(formato + cores + preco + ativo);
  }

  // Acabamentos (cortes)
  const finishes = await prisma.finish.findMany({
    where: {
      category: 'CORTE',
      isCurrent: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`\n✂️  ACABAMENTOS (CORTE): ${finishes.length}\n`);
  console.log(
    'NOME'.padEnd(40) +
    'CUSTO BASE (€)'.padEnd(15) +
    'UNIDADE'.padEnd(10) +
    'ATIVO'
  );
  console.log('-'.repeat(75));

  for (const f of finishes) {
    const nome = f.name.substring(0, 38).padEnd(40);
    const custo = `€${Number(f.baseCost).toFixed(4)}`.padEnd(15);
    const unidade = f.unit.padEnd(10);
    const ativo = f.active ? '✅' : '❌';
    console.log(nome + custo + unidade + ativo);
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n✅ Fase 1 concluída com sucesso!\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

