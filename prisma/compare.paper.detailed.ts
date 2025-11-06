import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n📋 TABELA COMPARATIVA DETALHADA: PLANILHA vs SISTEMA (PAPEL)\n");
  
  const materials = await prisma.material.findMany({
    where: { type: { equals: "papel", mode: "insensitive" } },
    include: {
      supplier: { select: { name: true } },
      variants: { where: { isCurrent: true }, orderBy: { id: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  // Dados da planilha organizados
  const planilha = [
    { fornecedor: "INAPA", nome: "Condat Gloss 150g", gramagem: "150", qty: 20000, precoPack: 1212.40, precoFolha: 0.06 },
    { fornecedor: "INAPA", nome: "Condat Gloss 170g", gramagem: "170", qty: 500, precoPack: 36.33, precoFolha: 0.073 },
    { fornecedor: "INAPA", nome: "Condat Gloss 250g", gramagem: "250", qty: 1000, precoPack: 94.58, precoFolha: 0.09 },
    { fornecedor: "INAPA", nome: "Condat Silk 300g", gramagem: "300", qty: 500, precoPack: 30.00, precoFolha: 0.06 },
    { fornecedor: "INAPA", nome: "Condat Silk 350g", gramagem: "350", qty: 1000, precoPack: 135.50, precoFolha: 0.14 },
    { fornecedor: "INAPA", nome: "Gloss 400g", gramagem: "400", qty: 125, precoPack: 17.91, precoFolha: 0.14 },
    { fornecedor: "INAPA", nome: "IOR 90g", gramagem: "90", qty: 500, precoPack: 28.55, precoFolha: 0.06 },
    { fornecedor: "INAPA", nome: "Multiloft Adesivo 1 Face Branco", gramagem: "", qty: 100, precoPack: 66.96, precoFolha: 0.67 },
    { fornecedor: "INAPA", nome: "Multiloft Adesivo 2 Faces Verde Turquesa", gramagem: "", qty: 80, precoPack: 74.71, precoFolha: 0.93 },
    { fornecedor: "INAPA", nome: "IOR 90g (64x90 cortado)", gramagem: "90", qty: 500, precoPack: 13.75, precoFolha: 0.03 },
    { fornecedor: "INAPA", nome: "Digilabel Com Cortes Silk Autocolante", gramagem: "", qty: 1000, precoPack: 380.00, precoFolha: 0.38 },
    { fornecedor: "INAPA", nome: "Jac-Datapol White Gloss 32x45", gramagem: "", qty: 100, precoPack: 76.00, precoFolha: 0.76 },
    { fornecedor: "ANTALIS", nome: "Polylaser Branco Brilho", gramagem: "", qty: 200, precoPack: 156.60, precoFolha: 0.78 },
    { fornecedor: "ANTALIS", nome: "Novatech Digital Silk 350g", gramagem: "350", qty: 375, precoPack: 58.08, precoFolha: 0.15 },
    { fornecedor: "ANTALIS", nome: "Print Speed Laser Jet IOR 90g", gramagem: "90", qty: 1000, precoPack: 31.34, precoFolha: 0.03 },
    { fornecedor: "ANTALIS", nome: "Invercote Creato 350g", gramagem: "350", qty: 200, precoPack: 87.37, precoFolha: 0.44 },
  ];

  console.log("=".repeat(150));
  console.log(
    "MATERIAL".padEnd(45) +
    "FORNECEDOR".padEnd(12) +
    "PLANILHA (€/folha)".padEnd(20) +
    "SISTEMA (€/folha)".padEnd(20) +
    "DIFERENÇA".padEnd(15) +
    "QTY PLAN".padEnd(12) +
    "QTY SIST".padEnd(12) +
    "STATUS"
  );
  console.log("=".repeat(150));

  for (const p of planilha) {
    const searchName = `Papel ${p.nome}`;
    const mat = materials.find(m => 
      m.name.toLowerCase().includes(p.nome.toLowerCase()) || 
      p.nome.toLowerCase().includes(m.name.toLowerCase().replace("papel ", ""))
    );

    if (mat) {
      const systemCost = Number(mat.unitCost);
      const diff = Math.abs(systemCost - p.precoFolha);
      const diffPercent = ((diff / p.precoFolha) * 100).toFixed(2);
      
      const variant = mat.variants[0];
      const qtyPlan = p.qty;
      const qtySist = variant?.sheetsPerPack || 0;
      const qtyMatch = qtyPlan === qtySist;
      
      const supplierMatch = mat.supplier?.name === p.fornecedor;
      
      let status = "✅";
      if (diff > 0.01) status = `⚠️ ${diffPercent}%`;
      if (!qtyMatch) status += " QTY";
      if (!supplierMatch) status += " FORN";
      
      const nomeDisplay = p.nome.substring(0, 43).padEnd(45);
      const fornecedorDisplay = p.fornecedor.padEnd(12);
      const planDisplay = `€${p.precoFolha.toFixed(4)}`.padEnd(20);
      const sistDisplay = `€${systemCost.toFixed(4)}`.padEnd(20);
      const diffDisplay = `€${diff.toFixed(4)} (${diffPercent}%)`.padEnd(15);
      const qtyPlanDisplay = String(qtyPlan).padEnd(12);
      const qtySistDisplay = String(qtySist).padEnd(12);
      
      console.log(nomeDisplay + fornecedorDisplay + planDisplay + sistDisplay + diffDisplay + qtyPlanDisplay + qtySistDisplay + status);
    } else {
      const nomeDisplay = p.nome.substring(0, 43).padEnd(45);
      console.log(nomeDisplay + p.fornecedor.padEnd(12) + `€${p.precoFolha.toFixed(4)}`.padEnd(20) + "❌ NÃO ENCONTRADO".padEnd(20) + "-".padEnd(15) + String(p.qty).padEnd(12) + "-".padEnd(12) + "❌ FALTANDO");
    }
  }

  console.log("=".repeat(150));
  console.log("\n📝 OBSERVAÇÕES:\n");
  console.log("1. 'IOR 90g (64x90 cortado)' existe como VARIANTE do material 'Papel IOR 90g', não como material separado.");
  console.log("2. Diferenças pequenas (< 0.01€) são consideradas OK devido a arredondamentos.");
  console.log("3. Diferenças maiores podem indicar necessidade de atualização.\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

