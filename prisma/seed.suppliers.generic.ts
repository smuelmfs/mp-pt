import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUPPLIERS = [
  { name: "Fornecedor A" },
  { name: "Fornecedor B" },
  { name: "Fornecedor C" },
];

async function main() {
  console.log("🏷️ Seed — Fornecedores genéricos");
  for (const s of SUPPLIERS) {
    const existing = await prisma.supplier.findFirst({ where: { name: { equals: s.name, mode: "insensitive" } } });
    if (existing) {
      await prisma.supplier.update({ where: { id: existing.id }, data: { active: true } });
      console.log(`✔ Fornecedor já existia: ${s.name} (id ${existing.id})`);
    } else {
      const created = await prisma.supplier.create({ data: { name: s.name, active: true } });
      console.log(`✔ Fornecedor criado: ${s.name} (id ${created.id})`);
    }
  }
  console.log("🏁 Concluído.");
}

main().then(()=>prisma.$disconnect()).catch(e=>{ console.error(e); prisma.$disconnect(); process.exit(1); });


