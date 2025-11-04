import { prisma } from "../lib/prisma";

async function main() {
  const s1 = await prisma.supplier.upsert({
    where: { name: "Fornecedor X" },
    update: { active: true },
    create: { name: "Fornecedor X", active: true },
  });

  const s2 = await prisma.supplier.upsert({
    where: { name: "Fornecedor Y" },
    update: { active: true },
    create: { name: "Fornecedor Y", active: true },
  });

  console.log(JSON.stringify({ suppliers: [s1.id, s2.id] }));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });


