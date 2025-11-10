import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Normaliza todos os nomes de clientes para LETRAS MAIÚSCULAS
 */

function normalizeToUpperCase(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " "); // Normalizar espaços múltiplos
}

async function main() {
  console.log("🔄 Normalizando nomes de clientes para MAIÚSCULAS...\n");

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true }
  });

  let updated = 0;
  let skipped = 0;

  for (const customer of customers) {
    const normalized = normalizeToUpperCase(customer.name);
    
    if (normalized !== customer.name) {
      // Verificar se já existe um cliente com esse nome normalizado
      const existing = await prisma.customer.findFirst({
        where: {
          name: { equals: normalized, mode: "insensitive" },
          id: { not: customer.id }
        }
      });

      if (existing) {
        console.log(`  ⚠️  ${customer.name} → ${normalized} (já existe, pulando)`);
        skipped++;
      } else {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { name: normalized }
        });
        console.log(`  ✅ ${customer.name} → ${normalized}`);
        updated++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n${"=".repeat(120)}`);
  console.log(`✅ RESUMO:`);
  console.log(`  - Atualizados: ${updated}`);
  console.log(`  - Já estavam corretos ou duplicados: ${skipped}`);
  console.log(`  - Total processado: ${customers.length}`);
  console.log("=".repeat(120));

  // Listar alguns exemplos
  const examples = await prisma.customer.findMany({
    where: { isActive: true },
    take: 10,
    orderBy: { name: "asc" },
    select: { name: true }
  });

  console.log(`\n📋 Exemplos de nomes normalizados:`);
  examples.forEach(c => console.log(`  - ${c.name}`));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

