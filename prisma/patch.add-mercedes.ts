import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("👥 Adicionando cliente MERCEDES...\n");

  const existing = await prisma.customer.findFirst({
    where: { name: { equals: "MERCEDES", mode: "insensitive" } }
  });

  let mercedes;
  if (existing) {
    mercedes = await prisma.customer.update({
      where: { id: existing.id },
      data: { isActive: true }
    });
    console.log(`✅ MERCEDES já existia, reativado: ${mercedes.name} (id: ${mercedes.id})`);
  } else {
    mercedes = await prisma.customer.create({
      data: {
        name: "MERCEDES",
        isActive: true
      }
    });
    console.log(`✅ MERCEDES criado: ${mercedes.name} (id: ${mercedes.id})`);
  }

  const total = await prisma.customer.count({ where: { isActive: true } });
  console.log(`\n📊 Total de clientes ativos: ${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

