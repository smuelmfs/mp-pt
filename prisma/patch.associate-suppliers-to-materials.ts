import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔗 Associando Fornecedores aos Materiais...\n");

  // Buscar fornecedores
  const fornecedorAlveolarA = await prisma.supplier.findFirst({ where: { name: "Fornecedor Alveolar A" } });
  const fornecedorAlveolarB = await prisma.supplier.findFirst({ where: { name: "Fornecedor Alveolar B" } });
  const fornecedorAlveolarC = await prisma.supplier.findFirst({ where: { name: "Fornecedor Alveolar C" } });
  const inapa = await prisma.supplier.findFirst({ where: { name: "INAPA" } });
  const antalis = await prisma.supplier.findFirst({ where: { name: "ANTALIS" } });

  if (!fornecedorAlveolarA || !inapa || !antalis) {
    console.error("❌ Fornecedores não encontrados!");
    return;
  }

  let updated = 0;

  // 1. ALVEOLAR - Distribuir entre os 3 fornecedores
  const materiaisAlveolar = await prisma.material.findMany({
    where: {
      type: "alveolar",
      isCurrent: true,
      supplierId: null
    }
  });

  console.log(`📦 Associando ${materiaisAlveolar.length} materiais ALVEOLAR...`);
  for (let i = 0; i < materiaisAlveolar.length; i++) {
    const mat = materiaisAlveolar[i];
    let supplier = fornecedorAlveolarA;
    if (i % 3 === 1 && fornecedorAlveolarB) supplier = fornecedorAlveolarB;
    if (i % 3 === 2 && fornecedorAlveolarC) supplier = fornecedorAlveolarC;

    await prisma.material.update({
      where: { id: mat.id },
      data: { supplierId: supplier.id }
    });
    console.log(`  ✅ ${mat.name} → ${supplier.name}`);
    updated++;
  }

  // 2. ENVELOPE - Associar a INAPA (padrão para envelopes)
  const materiaisEnvelope = await prisma.material.findMany({
    where: {
      type: "envelope",
      isCurrent: true,
      supplierId: null
    }
  });

  console.log(`\n📮 Associando ${materiaisEnvelope.length} materiais ENVELOPE...`);
  for (const mat of materiaisEnvelope) {
    await prisma.material.update({
      where: { id: mat.id },
      data: { supplierId: inapa.id }
    });
    console.log(`  ✅ ${mat.name} → INAPA`);
    updated++;
  }

  // 3. PVC - Associar a INAPA (padrão para papelaria)
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
      data: { supplierId: inapa.id }
    });
    console.log(`  ✅ ${mat.name} → INAPA`);
    updated++;
  }

  // 4. TEXTIL - Criar fornecedor genérico ou usar existente
  // Por enquanto, vamos deixar sem fornecedor e o usuário pode associar depois
  // ou criar um fornecedor específico para têxteis
  const materiaisTextil = await prisma.material.findMany({
    where: {
      type: "textil",
      isCurrent: true,
      supplierId: null
    }
  });

  console.log(`\n👕 ${materiaisTextil.length} materiais TEXTIL encontrados`);
  console.log(`  ⚠️  Não associados automaticamente - verificar fornecedor apropriado`);
  console.log(`  Exemplos: ${materiaisTextil.slice(0, 3).map(m => m.name).join(", ")}`);

  console.log("\n" + "=".repeat(120));
  console.log(`✅ Total de materiais atualizados: ${updated}`);
  console.log(`⚠️  ${materiaisTextil.length} materiais TEXTIL precisam de fornecedor manual`);
  console.log("=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

