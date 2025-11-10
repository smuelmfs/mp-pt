import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertSupplier(name: string) {
  const existing = await prisma.supplier.findFirst({ where: { name } });
  if (existing) {
    await prisma.supplier.update({ where: { id: existing.id }, data: { active: true } });
    console.log(`✔ Fornecedor garantido: ${name} (id ${existing.id})`);
    return existing.id;
  } else {
    const created = await prisma.supplier.create({ data: { name, active: true } });
    console.log(`✔ Fornecedor criado: ${name} (id ${created.id})`);
    return created.id;
  }
}

async function attachSupplierToMaterial(materialName: string, supplierId: number, searchPattern?: string) {
  // Primeiro tenta busca exata
  let mat = await prisma.material.findFirst({
    where: { 
      type: "papel",
      name: { equals: materialName, mode: "insensitive" } 
    },
    select: { id: true, name: true, supplierId: true },
  });

  // Se não encontrou e tem padrão de busca, tenta busca parcial
  if (!mat && searchPattern) {
    mat = await prisma.material.findFirst({
      where: { 
        type: "papel",
        name: { contains: searchPattern, mode: "insensitive" } 
      },
      select: { id: true, name: true, supplierId: true },
    });
    if (mat) {
      console.log(`   ℹ️ Encontrado por busca parcial: "${mat.name}" (procurando: "${materialName}")`);
    }
  }

  if (!mat) {
    console.warn(`❔ Material não encontrado: ${materialName}${searchPattern ? ` (buscou também: ${searchPattern})` : ''}`);
    return;
  }

  if (mat.supplierId === supplierId) {
    console.log(`= Já associado: ${materialName}`);
  } else {
    await prisma.material.update({
      where: { id: mat.id },
      data: { supplierId },
    });
    console.log(`🔗 Associado: ${materialName} → supplierId=${supplierId}`);
  }

  // Log de variantes (apenas para conferência)
  const variants = await prisma.materialVariant.findMany({
    where: { materialId: mat.id, isCurrent: true },
    select: { id: true, label: true },
    orderBy: { id: "asc" },
  });

  if (variants.length) {
    const specials = variants.filter(v => /\(64x90|cortado/i.test(v.label));
    console.log(
      `   ↳ Variantes (${variants.length}): ` +
      variants.map(v => v.label).join(" | ")
    );
    if (specials.length) {
      console.log(
        `   ⚑ Destaque: ` + specials.map(v => `"${v.label}"`).join(", ")
      );
    }
  }
}

async function main() {
  console.log("🔧 Vinculando PAPÉIS aos fornecedores (INAPA / ANTALIS)…");

  // 1) Garante suppliers
  const inapaId   = await upsertSupplier("INAPA");
  const antalisId = await upsertSupplier("ANTALIS");

  // 2) Mapeamento explícito de materiais por fornecedor (nomes 1:1 com os já semeados)
  // INAPA: 11 materiais principais (alguns da lista podem ser variantes ou sem dados completos)
  const INAPA_MATERIALS: string[] = [
    "Papel Condat Gloss 150g",
    "Papel Condat Gloss 170g",
    "Papel Condat Gloss 250g",
    "Papel Condat Silk 300g",
    "Papel Condat Silk 350g",
    "Papel Gloss 400g",
    "Papel IOR 90g",
    "Papel Digilabel Com Cortes Silk Autocolante",
    "Papel Jac-Datapol White Gloss 32x45",
    "Papel Multiloft Adesivo 1 Face Branco",
    "Papel Multiloft Adesivo 2 Faces Verde Turquesa",
    // Nota: As linhas sem marca/gramagem (100g, 125g, 200g) da planilha não têm dados completos
    // e provavelmente não são materiais cadastrados
  ];

  const ANTALIS_MATERIALS: Array<{ name: string; searchPattern?: string }> = [
    { name: "Papel Polylaser Branco Brilho" },
    { name: "Papel Novatech Digital Silk 350g" },
    { name: "Papel Invercote Creato 350g" },
    { name: "Papel Print Speed Laser Jet IOR 90g", searchPattern: "Print Speed" },
  ];

  // 3) Aplica vínculos
  for (const item of INAPA_MATERIALS) {
    await attachSupplierToMaterial(item, inapaId);
  }
  
  for (const item of ANTALIS_MATERIALS) {
    await attachSupplierToMaterial(item.name, antalisId, item.searchPattern);
  }

  console.log("🏁 Concluído.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect().finally(() => process.exit(1)); });

