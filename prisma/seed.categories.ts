import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES: string[] = [
  "Cartões & Identificações",
  "Papelaria Corporativa",
  "Catálogos & Brochuras",
  "Têxteis Personalizados",
  "Comunicação Visual & Grande Formato",
  "Produtos Publicitários",
];

async function main() {
  for (const name of CATEGORIES) {
    const res = await prisma.productCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`✔ upsert: ${res.name} (id: ${res.id})`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });