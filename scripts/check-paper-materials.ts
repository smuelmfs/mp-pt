import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log('\n📄 Materiais de PAPEL no Sistema:\n');
  console.log('='.repeat(120));

  const materials = await prisma.material.findMany({
    where: { type: { equals: 'papel', mode: 'insensitive' } },
    include: { 
      supplier: { select: { name: true } },
      variants: { where: { isCurrent: true }, take: 1 },
    },
    orderBy: { name: 'asc' },
  });

  console.log(
    'NOME'.padEnd(60) +
    'FORNECEDOR'.padEnd(15) +
    'PREÇO (€)'.padEnd(15) +
    'VARIANTS'.padEnd(10)
  );
  console.log('-'.repeat(120));

  for (const mat of materials) {
    const name = mat.name.substring(0, 58).padEnd(60);
    const supplier = (mat.supplier?.name || '-').padEnd(15);
    const price = `€${Number(mat.unitCost).toFixed(4)}`.padEnd(15);
    const variants = mat.variants.length > 0 ? 'Sim' : 'Não';
    
    console.log(name + supplier + price + variants);
  }

  console.log('\n' + '='.repeat(120));
  console.log(`\nTotal: ${materials.length} materiais\n`);

  // Materiais específicos que precisamos verificar
  const specific = [
    'Multiloft Adesivo 2 Faces Verde Turquesa',
    'Invercote Creato 350g',
    'Multiloft Adesivo 1 Face Branco',
    'Jac-Datapol White Gloss 32x45',
    'Polylaser Branco Brilho',
    'Print Speed Laser Jet IOR 90g',
  ];

  console.log('\n🔍 Materiais específicos:\n');
  for (const search of specific) {
    const mat = materials.find(m => 
      m.name.toLowerCase().includes(search.toLowerCase())
    );
    
    if (mat) {
      console.log(`  ✅ ${mat.name}`);
      console.log(`     Fornecedor: ${mat.supplier?.name || 'N/A'}`);
      console.log(`     Preço: €${Number(mat.unitCost).toFixed(4)}`);
      console.log(`     Variants: ${mat.variants.length}`);
      console.log('');
    } else {
      console.log(`  ❌ ${search} - NÃO ENCONTRADO\n`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

