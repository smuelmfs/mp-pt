import { prisma } from "../lib/prisma";

async function main() {
  console.log("📊 Status Atual do Sistema\n");
  console.log("=".repeat(120));

  // Contar produtos
  const productsCount = await prisma.product.count();
  const productsByCategory = await prisma.productCategory.findMany({
    include: {
      _count: { select: { products: true } }
    }
  });

  // Contar clientes
  const customersCount = await prisma.customer.count({ where: { isActive: true } });
  const allCustomers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { name: true },
    orderBy: { name: "asc" }
  });

  // Contar fornecedores
  const suppliersCount = await prisma.supplier.count({ where: { active: true } });
  const allSuppliers = await prisma.supplier.findMany({
    where: { active: true },
    select: { name: true },
    orderBy: { name: "asc" }
  });

  // Contar materiais
  const materialsCount = await prisma.material.count({ where: { isCurrent: true, active: true } });

  // Contar impressões
  const printingsCount = await prisma.printing.count({ where: { isCurrent: true, active: true } });

  // Contar acabamentos
  const finishesCount = await prisma.finish.count({ where: { isCurrent: true, active: true } });

  console.log("\n📦 PRODUTOS:");
  console.log(`  Total: ${productsCount} produtos`);
  productsByCategory.forEach(cat => {
    if (cat._count.products > 0) {
      console.log(`  - ${cat.name}: ${cat._count.products} produtos`);
    }
  });

  console.log("\n👥 CLIENTES:");
  console.log(`  Total: ${customersCount} clientes ativos`);
  if (allCustomers.length > 0) {
    console.log(`  Lista: ${allCustomers.map(c => c.name).join(", ")}`);
  }

  console.log("\n🏭 FORNECEDORES:");
  console.log(`  Total: ${suppliersCount} fornecedores ativos`);
  if (allSuppliers.length > 0) {
    console.log(`  Lista: ${allSuppliers.map(s => s.name).join(", ")}`);
  }

  console.log("\n📋 MATERIAIS:");
  console.log(`  Total: ${materialsCount} materiais ativos`);

  console.log("\n🖨️ IMPRESSÕES:");
  console.log(`  Total: ${printingsCount} impressões ativas`);

  console.log("\n✨ ACABAMENTOS:");
  console.log(`  Total: ${finishesCount} acabamentos ativos`);

  console.log("\n" + "=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

