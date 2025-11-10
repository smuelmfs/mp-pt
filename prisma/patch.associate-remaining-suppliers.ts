import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔗 Associando Fornecedores Restantes (Genéricos)...\n");

  // Buscar fornecedores existentes
  const inapa = await prisma.supplier.findFirst({ where: { name: "INAPA" } });
  const antalis = await prisma.supplier.findFirst({ where: { name: "ANTALIS" } });

  if (!inapa || !antalis) {
    console.error("❌ Fornecedores INAPA ou ANTALIS não encontrados!");
    return;
  }

  // Criar fornecedores genéricos se não existirem
  const fornecedorTextil = await prisma.supplier.upsert({
    where: { name: "Fornecedor Têxteis" },
    update: {},
    create: { name: "Fornecedor Têxteis", active: true }
  });

  const fornecedorEnvelope = await prisma.supplier.upsert({
    where: { name: "Fornecedor Envelopes" },
    update: {},
    create: { name: "Fornecedor Envelopes", active: true }
  });

  const fornecedorPVC = await prisma.supplier.upsert({
    where: { name: "Fornecedor PVC" },
    update: {},
    create: { name: "Fornecedor PVC", active: true }
  });

  console.log("✅ Fornecedores genéricos garantidos\n");

  let updated = 0;

  // 1. ENVELOPE - Associar a "Fornecedor Envelopes"
  const materiaisEnvelope = await prisma.material.findMany({
    where: {
      type: "envelope",
      isCurrent: true,
      supplierId: null
    }
  });

  console.log(`📮 Associando ${materiaisEnvelope.length} materiais ENVELOPE...`);
  for (const mat of materiaisEnvelope) {
    await prisma.material.update({
      where: { id: mat.id },
      data: { supplierId: fornecedorEnvelope.id }
    });
    console.log(`  ✅ ${mat.name} → ${fornecedorEnvelope.name}`);
    updated++;
  }

  // 2. PVC - Associar a "Fornecedor PVC"
  const materiaisPVC = await prisma.material.findMany({
    where: {
      type: "pvc",
      isCurrent: true,
      supplierId: null
    }
  });

  console.log(`\n💳 Associando ${materiaisPVC.length} materiais PVC...`);
  for (const mat of materiaisPVC) {
    await prisma.material.update({
      where: { id: mat.id },
      data: { supplierId: fornecedorPVC.id }
    });
    console.log(`  ✅ ${mat.name} → ${fornecedorPVC.name}`);
    updated++;
  }

  // 3. TEXTIL - Associar a "Fornecedor Têxteis"
  const materiaisTextil = await prisma.material.findMany({
    where: {
      type: "textil",
      isCurrent: true,
      supplierId: null
    }
  });

  console.log(`\n👕 Associando ${materiaisTextil.length} materiais TEXTIL...`);
  for (const mat of materiaisTextil) {
    await prisma.material.update({
      where: { id: mat.id },
      data: { supplierId: fornecedorTextil.id }
    });
    console.log(`  ✅ ${mat.name} → ${fornecedorTextil.name}`);
    updated++;
  }

  // 4. FLEX - Deixar sem fornecedor (não usado em produtos)
  const materiaisFlex = await prisma.material.findMany({
    where: {
      type: "flex",
      isCurrent: true,
      supplierId: null
    }
  });

  if (materiaisFlex.length > 0) {
    console.log(`\n📋 ${materiaisFlex.length} materiais FLEX encontrados`);
    console.log(`  ℹ️  Deixando sem fornecedor (não usado em produtos)`);
  }

  // 5. SUPORTE e PUBLICITARIO - Deixar sem fornecedor (materiais internos)
  const materiaisSuporte = await prisma.material.findMany({
    where: {
      type: { in: ["suporte", "publicitario"] },
      isCurrent: true,
      supplierId: null
    }
  });

  if (materiaisSuporte.length > 0) {
    console.log(`\n📦 ${materiaisSuporte.length} materiais SUPORTE/PUBLICITARIO encontrados`);
    console.log(`  ℹ️  Deixando sem fornecedor (materiais internos)`);
  }

  console.log("\n" + "=".repeat(120));
  console.log(`✅ Total de materiais atualizados: ${updated}`);
  console.log("=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

