import { prisma } from "../lib/prisma";

async function main() {
  console.log("🔍 Verificando categorias sem produtos...\n");
  console.log("=".repeat(120));

  const categories = await prisma.productCategory.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: { name: "asc" }
  });

  const emptyCategories = categories.filter(cat => cat._count.products === 0);

  if (emptyCategories.length === 0) {
    console.log("✅ Todas as categorias têm produtos!\n");
    await prisma.$disconnect();
    return;
  }

  console.log(`📋 Categorias sem produtos (${emptyCategories.length}):\n`);
  emptyCategories.forEach(cat => {
    console.log(`  - ${cat.name} (ID: ${cat.id})`);
  });

  console.log("\n" + "=".repeat(120));
  console.log("\n🗑️  Excluindo categorias vazias...\n");

  let deleted = 0;
  for (const cat of emptyCategories) {
    try {
      await prisma.productCategory.delete({
        where: { id: cat.id }
      });
      console.log(`  ✅ Excluída: ${cat.name} (ID: ${cat.id})`);
      deleted++;
    } catch (error: any) {
      console.error(`  ❌ Erro ao excluir ${cat.name}: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log(`\n✅ ${deleted} categoria(s) excluída(s) com sucesso!\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

