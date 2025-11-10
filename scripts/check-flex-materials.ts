import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const materials = await prisma.material.findMany({
    where: {
      OR: [
        { name: { contains: 'FLEX', mode: 'insensitive' } },
        { type: { equals: 'flex', mode: 'insensitive' } },
      ],
      isCurrent: true,
    },
  });

  console.log('\n📦 Materiais FLEX encontrados:\n');
  materials.forEach(m => {
    console.log(`  - ${m.name} (id ${m.id}, type: ${m.type}, unit: ${m.unit})`);
  });

  if (materials.length === 0) {
    console.log('  ⚠️  Nenhum material FLEX encontrado');
  }

  await prisma.$disconnect();
}

main().catch(console.error);

