import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("📋 Listando todas as impressões do sistema para análise de matching...\n");
  
  const printings = await prisma.printing.findMany({
    where: { isCurrent: true },
    select: {
      id: true,
      technology: true,
      formatLabel: true,
      colors: true,
      sides: true,
    },
    orderBy: { formatLabel: "asc" },
  });

  console.log(`Total de impressões: ${printings.length}\n`);
  console.log("Exemplos de impressões no sistema:");
  printings.slice(0, 20).forEach(p => {
    console.log(`  - ID ${p.id}: "${p.formatLabel || p.technology}" (${p.technology}, ${p.colors || "N/A"})`);
  });

  await prisma.$disconnect();
}

main();

