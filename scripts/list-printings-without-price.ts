import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(120));
  console.log("🖨️  Impressões sem Preço ou Preço Zero");
  console.log("=".repeat(120));
  console.log();

  const printings = await prisma.printing.findMany({
    where: { isCurrent: true },
    orderBy: { formatLabel: "asc" }
  });

  const withoutPrice = printings.filter(p => !p.unitPrice || Number(p.unitPrice) === 0);

  console.log(`Total de impressões: ${printings.length}`);
  console.log(`Sem preço ou preço zero: ${withoutPrice.length}`);
  console.log();

  for (const p of withoutPrice) {
    console.log(`📄 ${p.formatLabel || p.technology || `ID ${p.id}`}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Tecnologia: ${p.technology}`);
    console.log(`   Cores: ${p.colors || "N/A"}`);
    console.log(`   Lados: ${p.sides || "N/A"}`);
    console.log(`   Preço atual: ${p.unitPrice ? Number(p.unitPrice).toFixed(4) : "NULL"}`);
    console.log();
  }

  await prisma.$disconnect();
}

main().catch(console.error);

