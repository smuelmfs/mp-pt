import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    take: 15,
    orderBy: { name: "asc" },
    select: { name: true }
  });

  console.log("📋 Exemplos de nomes normalizados:");
  customers.forEach(c => console.log(`  - ${c.name}`));

  // Verificar se há algum nome que não está em maiúsculas
  const notUpper = customers.filter(c => c.name !== c.name.toUpperCase());
  if (notUpper.length > 0) {
    console.log(`\n⚠️  ${notUpper.length} nomes não estão em maiúsculas:`);
    notUpper.forEach(c => console.log(`  - ${c.name}`));
  } else {
    console.log("\n✅ Todos os nomes estão em MAIÚSCULAS!");
  }

  await prisma.$disconnect();
}

main().catch(console.error);

