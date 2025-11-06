import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function rename(oldName: string, newName: string) {
  const src = await prisma.supplier.findFirst({ where: { name: { equals: oldName, mode: "insensitive" } } });
  if (!src) {
    console.log(`ℹ️ Não encontrado: ${oldName}`);
    return;
  }
  const dst = await prisma.supplier.findFirst({ where: { name: { equals: newName, mode: "insensitive" } } });
  if (!dst) {
    await prisma.supplier.update({ where: { id: src.id }, data: { name: newName } });
    console.log(`✔ Renomeado: ${oldName} → ${newName}`);
    return;
  }
  // Reatribui materiais do src para o dst, depois remove src
  await prisma.$executeRawUnsafe(`UPDATE "Material" SET "supplierId" = $1 WHERE "supplierId" = $2`, dst.id, src.id);
  await prisma.supplier.delete({ where: { id: src.id } });
  console.log(`✔ Mesclado: ${oldName} → ${newName}`);
}

async function ensure(name: string) {
  const s = await prisma.supplier.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (s) return;
  await prisma.supplier.create({ data: { name, active: true } });
  console.log(`✔ Criado: ${name}`);
}

async function main() {
  console.log("🔧 Renomeando fornecedores genéricos (Vinil)…");
  // Garante destino existe para evitar colisão de unique
  await ensure("Fornecedor Vinil A");
  await ensure("Fornecedor Vinil B");
  await ensure("Fornecedor Vinil C");

  await rename("Fornecedor A", "Fornecedor Vinil A");
  await rename("Fornecedor B", "Fornecedor Vinil B");
  await rename("Fornecedor C", "Fornecedor Vinil C");

  console.log("🏁 Concluído.");
}

main().then(()=>prisma.$disconnect()).catch(e=>{ console.error(e); prisma.$disconnect().finally(()=>process.exit(1)); });


