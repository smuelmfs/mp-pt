import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DATA_PATH = path.resolve(process.cwd(), "data", "customers-from-excel.json");

async function main() {
  console.log("👥 Importando todos os clientes da planilha...\n");

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${DATA_PATH}`);
    console.log("   Execute primeiro: npm run extract:customers");
    return;
  }

  const customers = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as string[];

  console.log(`📋 Total de clientes para importar: ${customers.length}\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const customerName of customers) {
    if (!customerName || customerName.length < 3) {
      skipped++;
      continue;
    }

    const existing = await prisma.customer.findFirst({
      where: {
        name: { equals: customerName, mode: "insensitive" }
      }
    });

    if (existing) {
      // Atualizar se estiver inativo
      if (!existing.isActive) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: { isActive: true }
        });
        updated++;
        console.log(`  ✅ ${customerName} (reativado)`);
      } else {
        skipped++;
      }
    } else {
      await prisma.customer.create({
        data: {
          name: customerName,
          isActive: true
        }
      });
      created++;
      console.log(`  ✅ ${customerName} (criado)`);
    }
  }

  console.log(`\n${"=".repeat(120)}`);
  console.log(`✅ RESUMO:`);
  console.log(`  - Criados: ${created}`);
  console.log(`  - Reativados: ${updated}`);
  console.log(`  - Já existentes: ${skipped}`);
  console.log(`  - Total processado: ${customers.length}`);
  console.log("=".repeat(120));

  // Listar total de clientes no sistema
  const total = await prisma.customer.count({ where: { isActive: true } });
  console.log(`\n📊 Total de clientes ativos no sistema: ${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

