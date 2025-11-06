import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🔍 VERIFICAÇÃO DETALHADA: IOR 90g e Print Speed\n");
  
  const ior = await prisma.material.findFirst({
    where: { 
      type: "papel",
      name: { contains: "IOR 90g", mode: "insensitive" }
    },
    include: {
      supplier: true,
      variants: { where: { isCurrent: true }, orderBy: { id: "asc" } },
    },
  });

  const printSpeed = await prisma.material.findFirst({
    where: { 
      type: "papel",
      name: { contains: "Print Speed", mode: "insensitive" }
    },
    include: {
      supplier: true,
      variants: { where: { isCurrent: true } },
    },
  });

  if (ior) {
    console.log("📄 MATERIAL: Papel IOR 90g");
    console.log(`   Fornecedor: ${ior.supplier?.name || "-"}`);
    console.log(`   Custo Unitário: €${Number(ior.unitCost).toFixed(4)}`);
    console.log(`   Custo Fornecedor: €${ior.supplierUnitCost ? Number(ior.supplierUnitCost).toFixed(4) : "-"}`);
    console.log(`   Variantes:`);
    for (const v of ior.variants) {
      console.log(`     - ${v.label}`);
      console.log(`       Gramagem: ${v.gramagem || "-"}`);
      console.log(`       Folhas/Pack: ${v.sheetsPerPack || "-"}`);
      console.log(`       Preço Pack: €${v.packPrice ? Number(v.packPrice).toFixed(2) : "-"}`);
      console.log(`       Preço/Folha: €${v.unitPrice ? Number(v.unitPrice).toFixed(4) : "-"}`);
      if (v.packPrice && v.sheetsPerPack) {
        const calc = Number(v.packPrice) / Number(v.sheetsPerPack);
        console.log(`       Calculado: €${calc.toFixed(4)}/folha (${v.packPrice} ÷ ${v.sheetsPerPack})`);
      }
    }
  }

  console.log("\n");

  if (printSpeed) {
    console.log("📄 MATERIAL: Print Speed Laser Jet IOR 90g");
    console.log(`   Fornecedor: ${printSpeed.supplier?.name || "-"}`);
    console.log(`   Custo Unitário: €${Number(printSpeed.unitCost).toFixed(4)}`);
    console.log(`   Custo Fornecedor: €${printSpeed.supplierUnitCost ? Number(printSpeed.supplierUnitCost).toFixed(4) : "-"}`);
    console.log(`   Variantes:`);
    for (const v of printSpeed.variants) {
      console.log(`     - ${v.label}`);
      console.log(`       Gramagem: ${v.gramagem || "-"}`);
      console.log(`       Folhas/Pack: ${v.sheetsPerPack || "-"}`);
      console.log(`       Preço Pack: €${v.packPrice ? Number(v.packPrice).toFixed(2) : "-"}`);
      console.log(`       Preço/Folha: €${v.unitPrice ? Number(v.unitPrice).toFixed(4) : "-"}`);
      if (v.packPrice && v.sheetsPerPack) {
        const calc = Number(v.packPrice) / Number(v.sheetsPerPack);
        console.log(`       Calculado: €${calc.toFixed(4)}/folha (${v.packPrice} ÷ ${v.sheetsPerPack})`);
      }
    }
  }
  
  console.log("\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

