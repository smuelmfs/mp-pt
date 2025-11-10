import { prisma } from "../lib/prisma";

async function main() {
  console.log("📊 Verificando status dos produtos no sistema\n");
  console.log("=".repeat(120));

  // Contar produtos por categoria
  const categories = await prisma.productCategory.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: { name: "asc" }
  });

  console.log("\n📋 Produtos por Categoria:\n");
  let totalProducts = 0;
  for (const cat of categories) {
    const count = cat._count.products;
    totalProducts += count;
    console.log(`  ${cat.name}: ${count} produtos`);
  }

  console.log(`\n  📊 Total: ${totalProducts} produtos\n`);

  // Listar alguns produtos de exemplo
  const sampleProducts = await prisma.product.findMany({
    take: 10,
    include: {
      category: { select: { name: true } },
      materials: {
        include: { material: { select: { name: true } } },
        take: 1
      },
      finishes: {
        include: { finish: { select: { name: true } } },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (sampleProducts.length > 0) {
    console.log("📋 Exemplos de produtos (últimos 10):\n");
    for (const p of sampleProducts) {
      const mat = p.materials[0]?.material?.name || "sem material";
      const fin = p.finishes[0]?.finish?.name || "sem acabamento";
      console.log(`  - ${p.name} (${p.category.name})`);
      console.log(`    Material: ${mat} | Acabamento: ${fin}`);
    }
  } else {
    console.log("⚠️  Nenhum produto encontrado no sistema.\n");
  }

  console.log("\n" + "=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

