import { PrismaClient, PrintingTech } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 VALIDAÇÃO: Fase 2 - Impressões Específicas\n');
  console.log('='.repeat(120));

  // Impressões Grande Formato
  const grandeFormato = await prisma.printing.findMany({
    where: {
      technology: PrintingTech.GRANDE_FORMATO,
      isCurrent: true,
    },
    orderBy: { formatLabel: 'asc' },
  });

  console.log(`\n📄 IMPRESSÕES GRANDE FORMATO: ${grandeFormato.length}\n`);
  console.log(
    'IMPRESSÃO'.padEnd(60) +
    'PREÇO (€/m²)'.padEnd(15) +
    'ATIVO'
  );
  console.log('-'.repeat(80));

  for (const p of grandeFormato.slice(0, 20)) {
    const impressao = (p.formatLabel || '-').substring(0, 58).padEnd(60);
    const preco = `€${Number(p.unitPrice).toFixed(2)}`.padEnd(15);
    const ativo = p.active ? '✅' : '❌';
    console.log(impressao + preco + ativo);
  }
  if (grandeFormato.length > 20) {
    console.log(`  ... e mais ${grandeFormato.length - 20} impressões`);
  }

  // Impressões Singulares
  const singulares = await prisma.printing.findMany({
    where: {
      technology: PrintingTech.DIGITAL,
      formatLabel: { 
        contains: 'FRENTE',
        mode: 'insensitive'
      },
      isCurrent: true,
    },
    orderBy: { formatLabel: 'asc' },
  });

  console.log(`\n📄 IMPRESSÕES SINGULARES (DIGITAL): ${singulares.length}\n`);
  console.log(
    'FORMATO'.padEnd(50) +
    'CORES'.padEnd(10) +
    'PREÇO (€)'.padEnd(15) +
    'ATIVO'
  );
  console.log('-'.repeat(85));

  for (const p of singulares) {
    const formato = (p.formatLabel || '-').substring(0, 48).padEnd(50);
    const cores = (p.colors || '-').padEnd(10);
    const preco = `€${Number(p.unitPrice).toFixed(4)}`.padEnd(15);
    const ativo = p.active ? '✅' : '❌';
    console.log(formato + cores + preco + ativo);
  }

  // Impressões UV
  const uv = await prisma.printing.findMany({
    where: {
      technology: PrintingTech.UV,
      isCurrent: true,
    },
    orderBy: { formatLabel: 'asc' },
  });

  console.log(`\n📄 IMPRESSÕES UV: ${uv.length}\n`);
  console.log(
    'MATERIAL'.padEnd(50) +
    'PREÇO (€)'.padEnd(15) +
    'ATIVO'
  );
  console.log('-'.repeat(70));

  for (const p of uv.slice(0, 20)) {
    const material = (p.formatLabel || '-').substring(0, 48).padEnd(50);
    const preco = `€${Number(p.unitPrice).toFixed(4)}`.padEnd(15);
    const ativo = p.active ? '✅' : '❌';
    console.log(material + preco + ativo);
  }
  if (uv.length > 20) {
    console.log(`  ... e mais ${uv.length - 20} impressões`);
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n📊 RESUMO GERAL:');
  console.log(`  ✅ Grande Formato: ${grandeFormato.length}`);
  console.log(`  ✅ Singulares: ${singulares.length}`);
  console.log(`  ✅ UV: ${uv.length}`);
  console.log(`  📋 Total Fase 2: ${grandeFormato.length + singulares.length + uv.length}\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

