import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
}

async function main() {
  const printings = await prisma.printing.findMany({
    where: { isCurrent: true },
    select: {
      id: true,
      technology: true,
      formatLabel: true,
      colors: true,
    },
  });

  console.log("🔍 Testando matching para 'A5'...\n");
  
  const testName = "A5";
  const normalized = normalizeName(testName);
  
  console.log(`Nome normalizado: "${normalized}"\n`);
  console.log("Impressões no sistema que contêm 'A5':");
  
  const matches = printings.filter(p => {
    if (!p.formatLabel) return false;
    const pNormalized = normalizeName(p.formatLabel);
    return pNormalized.includes("A5") || pNormalized === "A5";
  });
  
  matches.forEach(p => {
    console.log(`  ✅ ID ${p.id}: "${p.formatLabel}" (${p.technology})`);
  });
  
  if (matches.length === 0) {
    console.log("  ❌ Nenhuma impressão encontrada com 'A5'");
  }
  
  await prisma.$disconnect();
}

main();

