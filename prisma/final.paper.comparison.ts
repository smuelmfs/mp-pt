import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n" + "=".repeat(130));
  console.log("📊 TABELA COMPARATIVA FINAL: PLANILHA vs SISTEMA (MATERIAIS DE PAPEL)");
  console.log("=".repeat(130) + "\n");

  const materials = await prisma.material.findMany({
    where: { type: { equals: "papel", mode: "insensitive" } },
    include: {
      supplier: { select: { name: true } },
      variants: { where: { isCurrent: true }, orderBy: { id: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  // Dados da planilha
  const planilha = [
    { fornecedor: "INAPA", nome: "Condat Gloss 150g", precoFolha: 0.06, qty: 20000 },
    { fornecedor: "INAPA", nome: "Condat Gloss 170g", precoFolha: 0.073, qty: 500 },
    { fornecedor: "INAPA", nome: "Condat Gloss 250g", precoFolha: 0.09, qty: 1000 },
    { fornecedor: "INAPA", nome: "Condat Silk 300g", precoFolha: 0.06, qty: 500 },
    { fornecedor: "INAPA", nome: "Condat Silk 350g", precoFolha: 0.14, qty: 1000 },
    { fornecedor: "INAPA", nome: "Gloss 400g", precoFolha: 0.14, qty: 125 },
    { fornecedor: "INAPA", nome: "IOR 90g", precoFolha: 0.06, qty: 500 },
    { fornecedor: "INAPA", nome: "IOR 90g (64x90 cortado)", precoFolha: 0.03, qty: 500, isVariant: true },
    { fornecedor: "INAPA", nome: "Multiloft Adesivo 1 Face Branco", precoFolha: 0.67, qty: 100 },
    { fornecedor: "INAPA", nome: "Multiloft Adesivo 2 Faces Verde Turquesa", precoFolha: 0.93, qty: 80 },
    { fornecedor: "INAPA", nome: "Digilabel Com Cortes Silk Autocolante", precoFolha: 0.38, qty: 1000 },
    { fornecedor: "INAPA", nome: "Jac-Datapol White Gloss 32x45", precoFolha: 0.76, qty: 100 },
    { fornecedor: "ANTALIS", nome: "Polylaser Branco Brilho", precoFolha: 0.78, qty: 200 },
    { fornecedor: "ANTALIS", nome: "Novatech Digital Silk 350g", precoFolha: 0.15, qty: 375 },
    { fornecedor: "ANTALIS", nome: "Print Speed Laser Jet IOR 90g", precoFolha: 0.03, qty: 1000 },
    { fornecedor: "ANTALIS", nome: "Invercote Creato 350g", precoFolha: 0.44, qty: 200 },
  ];

  console.log(
    "MATERIAL".padEnd(50) +
    "FORNEC".padEnd(10) +
    "PLANILHA".padEnd(12) +
    "SISTEMA".padEnd(12) +
    "DIF".padEnd(10) +
    "STATUS"
  );
  console.log("-".repeat(130));

  for (const p of planilha) {
    const searchName = p.nome.toLowerCase();
    let mat = materials.find(m => {
      const mName = m.name.toLowerCase().replace("papel ", "");
      // Match exato primeiro
      if (mName === searchName) return true;
      // Para "Print Speed", buscar especificamente
      if (searchName.includes("print speed")) {
        return mName.includes("print speed");
      }
      // Para outros, busca parcial
      return mName.includes(searchName) || searchName.includes(mName);
    });

    let variant = null;
    if (p.isVariant && mat) {
      variant = mat.variants.find(v => v.label.toLowerCase().includes("64x90 cortado"));
    }

    const nomeDisplay = p.nome.substring(0, 48).padEnd(50);
    const fornecedorDisplay = p.fornecedor.padEnd(10);
    const planDisplay = `€${p.precoFolha.toFixed(4)}`.padEnd(12);

    if (p.isVariant && variant) {
      const variantCost = variant.unitPrice ? Number(variant.unitPrice) : (variant.packPrice && variant.sheetsPerPack ? Number(variant.packPrice) / Number(variant.sheetsPerPack) : 0);
      const sistDisplay = `€${variantCost.toFixed(4)}`.padEnd(12);
      const diff = Math.abs(variantCost - p.precoFolha);
      const diffDisplay = `€${diff.toFixed(4)}`.padEnd(10);
      const status = diff < 0.01 ? "✅ OK" : `⚠️ ${((diff/p.precoFolha)*100).toFixed(1)}%`;
      console.log(nomeDisplay + fornecedorDisplay + planDisplay + sistDisplay + diffDisplay + status);
    } else if (mat) {
      const systemCost = Number(mat.unitCost);
      const sistDisplay = `€${systemCost.toFixed(4)}`.padEnd(12);
      const diff = Math.abs(systemCost - p.precoFolha);
      const diffDisplay = `€${diff.toFixed(4)}`.padEnd(10);
      const supplierMatch = mat.supplier?.name === p.fornecedor;
      const qtyMatch = mat.variants[0]?.sheetsPerPack === p.qty;
      
      let status = "✅ OK";
      if (diff > 0.01) status = `⚠️ ${((diff/p.precoFolha)*100).toFixed(1)}%`;
      if (!supplierMatch) status += " FORN";
      if (!qtyMatch) status += " QTY";
      
      console.log(nomeDisplay + fornecedorDisplay + planDisplay + sistDisplay + diffDisplay + status);
    } else {
      console.log(nomeDisplay + fornecedorDisplay + planDisplay + "❌ NÃO ENCONTRADO".padEnd(12) + "-".padEnd(10) + "❌ FALTANDO");
    }
  }

  console.log("\n" + "=".repeat(130));
  console.log("\n📝 RESUMO:\n");
  
  let ok = 0, warning = 0, missing = 0;
  for (const p of planilha) {
    if (p.isVariant) {
      const mat = materials.find(m => m.name.toLowerCase().includes("ior 90g"));
      if (mat) {
        const variant = mat.variants.find(v => v.label.toLowerCase().includes("64x90 cortado"));
        if (variant) {
          const variantCost = variant.unitPrice ? Number(variant.unitPrice) : (variant.packPrice && variant.sheetsPerPack ? Number(variant.packPrice) / Number(variant.sheetsPerPack) : 0);
          const diff = Math.abs(variantCost - p.precoFolha);
          if (diff < 0.01) ok++; else warning++;
        } else missing++;
      } else missing++;
    } else {
      const mat = materials.find(m => {
        const mName = m.name.toLowerCase().replace("papel ", "");
        return mName.includes(p.nome.toLowerCase()) || p.nome.toLowerCase().includes(mName);
      });
      if (mat) {
        const diff = Math.abs(Number(mat.unitCost) - p.precoFolha);
        if (diff < 0.01 && mat.supplier?.name === p.fornecedor) ok++;
        else warning++;
      } else missing++;
    }
  }

  console.log(`✅ OK (diferença < 0.01€): ${ok}`);
  console.log(`⚠️  AVISOS (diferença > 0.01€ ou fornecedor/qty diferente): ${warning}`);
  console.log(`❌ FALTANDO: ${missing}`);
  console.log("\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

