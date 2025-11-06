import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Criando material Print Speed Laser Jet (ANTALIS)…");

  // Verifica se já existe
  const existing = await prisma.material.findFirst({
    where: {
      type: "papel",
      name: { contains: "Print Speed", mode: "insensitive" },
    },
  });

  if (existing) {
    console.log(`ℹ️ Material já existe: ${existing.name} (id ${existing.id})`);
    // Associa ao ANTALIS se não estiver
    const antalis = await prisma.supplier.findFirst({ where: { name: "ANTALIS" } });
    if (antalis && existing.supplierId !== antalis.id) {
      await prisma.material.update({
        where: { id: existing.id },
        data: { supplierId: antalis.id },
      });
      console.log(`🔗 Associado ao ANTALIS: ${existing.name}`);
    }
    await prisma.$disconnect();
    return;
  }

  // Cria o material
  const antalis = await prisma.supplier.findFirst({ where: { name: "ANTALIS" } });
  if (!antalis) {
    throw new Error("Fornecedor ANTALIS não encontrado. Execute primeiro seed:suppliers:core");
  }

  // Baseado nos dados da planilha:
  // ANTALIS Print Speed Laser Jet,Print Speed, Laserjet, branco, IOR90 450x640 500un Gr cortado 32x45 -1000un
  // Preço: 0,03 € por folha
  const material = await prisma.material.create({
    data: {
      name: "Papel Print Speed Laser Jet IOR 90g",
      type: "papel",
      unit: Unit.SHEET,
      unitCost: 0.03134, // 31,34 € / 1000un = 0,03134 €/folha
      active: true,
      isCurrent: true,
      supplierId: antalis.id,
    },
  });

  console.log(`✔ Material criado: ${material.name} (id ${material.id})`);

  // Cria variante baseada na descrição
  await prisma.materialVariant.create({
    data: {
      materialId: material.id,
      label: "IOR 90g 450x640 cortado 32x45",
      gramagem: 90,
      widthMm: 320, // 32x45 cm = 320x450 mm
      heightMm: 450,
      sheetsPerPack: 1000,
      packPrice: 31.34,
      unitPrice: 0.03134,
      isCurrent: true,
    },
  });

  console.log(`✔ Variante criada: IOR 90g 450x640 cortado 32x45`);

  console.log("🏁 Concluído.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

