import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("📄 Materiais de PAPEL no sistema:\n");
  
  const materials = await prisma.material.findMany({
    where: { type: { equals: "papel", mode: "insensitive" } },
    include: {
      supplier: { select: { name: true } },
      variants: { where: { isCurrent: true } },
    },
    orderBy: { name: "asc" },
  });

  console.log("=".repeat(120));
  console.log(
    "ID".padEnd(5) +
    "NOME".padEnd(50) +
    "FORNECEDOR".padEnd(20) +
    "CUSTO".padEnd(15) +
    "CUSTO FORN".padEnd(15) +
    "UNIDADE"
  );
  console.log("=".repeat(120));

  for (const m of materials) {
    const id = String(m.id).padEnd(5);
    const name = (m.name || "").substring(0, 48).padEnd(50);
    const supplier = (m.supplier?.name || "-").substring(0, 18).padEnd(20);
    const cost = `€${Number(m.unitCost).toFixed(4)}`.padEnd(15);
    const supplierCost = m.supplierUnitCost 
      ? `€${Number(m.supplierUnitCost).toFixed(4)}`.padEnd(15)
      : "-".padEnd(15);
    const unit = m.unit;
    
    console.log(id + name + supplier + cost + supplierCost + unit);
    
    if (m.variants && m.variants.length > 0) {
      for (const v of m.variants) {
        let variantInfo = `  └─ ${v.label}`;
        if (v.gramagem) variantInfo += ` (${v.gramagem}g)`;
        if (v.sheetsPerPack) variantInfo += ` - ${v.sheetsPerPack} folhas/pack`;
        if (v.packPrice) variantInfo += ` - €${Number(v.packPrice).toFixed(2)}`;
        console.log(variantInfo.padStart(120));
      }
    }
  }

  console.log("=".repeat(120));
  console.log(`\nTotal: ${materials.length} materiais de papel\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

