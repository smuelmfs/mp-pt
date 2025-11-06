import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CUSTOMERS = [
  { name: "TECOFIX" },
  { name: "ISCF" },
  { name: "Abbott" },
  { name: "WMG" },
  { name: "RODRIGUES & GONÇALVES" },
];

async function main() {
  console.log("👥 Seed — Clientes core");
  for (const c of CUSTOMERS) {
    const exists = await prisma.customer.findFirst({ where: { name: { equals: c.name, mode: "insensitive" } } });
    if (exists) {
      console.log(`~ Cliente já existe: ${c.name} (id ${exists.id})`);
      continue;
    }
    const created = await prisma.customer.create({ data: { name: c.name, isActive: true } });
    console.log(`✔ Cliente criado: ${created.name} (id ${created.id})`);
  }
  console.log("🏁 Concluído.");
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);prisma.$disconnect()});
