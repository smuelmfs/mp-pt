import { prisma } from "../lib/prisma";

async function main() {
  console.log("🔍 Verificando materiais sem fornecedor e fornecedores sem materiais...\n");

  const mats = await prisma.material.findMany({
    where: { isCurrent: true, supplierId: null },
    select: { name: true, type: true }
  });

  console.log(`Materiais sem fornecedor (${mats.length}):`);
  mats.forEach(m => console.log(`  - ${m.name} (${m.type})`));

  const supps = await prisma.supplier.findMany({
    where: { active: true },
    include: {
      materials: {
        where: { isCurrent: true },
        select: { id: true }
      }
    }
  });

  console.log(`\nFornecedores sem materiais:`);
  supps.filter(s => s.materials.length === 0).forEach(s => console.log(`  - ${s.name}`));

  // Verificar envelopes e PVC
  const envs = await prisma.material.findMany({
    where: { type: "envelope", isCurrent: true },
    include: { supplier: { select: { name: true } } }
  });
  console.log(`\n📮 Envelopes (${envs.length}):`);
  envs.forEach(e => console.log(`  - ${e.name} → ${e.supplier?.name || "SEM FORNECEDOR"}`));

  const pvcs = await prisma.material.findMany({
    where: { type: "pvc", isCurrent: true },
    include: { supplier: { select: { name: true } } }
  });
  console.log(`\n💳 PVC (${pvcs.length}):`);
  pvcs.forEach(p => console.log(`  - ${p.name} → ${p.supplier?.name || "SEM FORNECEDOR"}`));

  console.log(`\n✅ Verificação concluída!`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

