import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUPPLIERS = [
  { name: "INAPA" },
  { name: "ANTALIS" },
];

async function main() {
  console.log("🏷️ Seed — Fornecedores (Suppliers)");
  for (const s of SUPPLIERS) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (existing) {
      await prisma.supplier.update({ where: { id: existing.id }, data: { active: true } });
      console.log(`✔ Fornecedor atualizado: ${s.name} (id ${existing.id})`);
    } else {
      const created = await prisma.supplier.create({ data: { name: s.name, active: true } });
      console.log(`✔ Fornecedor criado: ${s.name} (id ${created.id})`);
    }
  }
  console.log("🏁 Concluído.");
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);prisma.$disconnect()});

