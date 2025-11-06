import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Dados da planilha fornecida
const SHEET_DATA = [
  { marca: "INAPA", tipo: "", gramagem: "100", qty: 0, preco: 0, precoFolha: 0, nome: "" },
  { marca: "INAPA", tipo: "", gramagem: "125", qty: 0, preco: 0, precoFolha: 0, nome: "" },
  { marca: "INAPA", tipo: "CONDAT GLOSS", gramagem: "150", qty: 20000, preco: 1212.40, precoFolha: 0.06, nome: "Condat Gloss 150g" },
  { marca: "INAPA", tipo: "CONDAT GLOSS", gramagem: "170", qty: 500, preco: 36.33, precoFolha: 0.073, nome: "Condat Gloss 170g" },
  { marca: "INAPA", tipo: "", gramagem: "200", qty: 0, preco: 0, precoFolha: 0, nome: "" },
  { marca: "INAPA", tipo: "CONDAT GLOSS", gramagem: "250", qty: 1000, preco: 94.58, precoFolha: 0.09, nome: "Condat Gloss 250g" },
  { marca: "INAPA", tipo: "CONDAT SILK", gramagem: "300", qty: 500, preco: 30.00, precoFolha: 0.06, nome: "Condat Silk 300g" },
  { marca: "INAPA", tipo: "CONDAT SILK", gramagem: "350", qty: 1000, preco: 135.50, precoFolha: 0.14, nome: "Condat Silk 350g" },
  { marca: "INAPA", tipo: "GLOSS", gramagem: "400", qty: 125, preco: 17.91, precoFolha: 0.14, nome: "Gloss 400g" },
  { marca: "INAPA", tipo: "", gramagem: "IOR 90 Gr.", qty: 500, preco: 28.55, precoFolha: 0.06, nome: "IOR 90g" },
  { marca: "INAPA", tipo: "MULTILOFT", gramagem: "MULTILOFT ADESIVO 1 FACE BRANCO", qty: 100, preco: 66.96, precoFolha: 0.67, nome: "Multiloft Adesivo 1 Face Branco" },
  { marca: "INAPA", tipo: "MULTILOFT", gramagem: "MULTILOFT ADESIVO 2 FACES VERDE TURQUESA", qty: 80, preco: 74.71, precoFolha: 0.93, nome: "Multiloft Adesivo 2 Faces Verde Turquesa" },
  { marca: "INAPA", tipo: "", gramagem: "IOR 90 Gr. (64x90 - CORTADO)", qty: 500, preco: 13.75, precoFolha: 0.03, nome: "IOR 90g (64x90 cortado)" },
  { marca: "INAPA", tipo: "Digilabel Com Cortes", gramagem: "Silk Autocolante", qty: 1000, preco: 380.00, precoFolha: 0.38, nome: "Digilabel Com Cortes Silk Autocolante" },
  { marca: "INAPA", tipo: "JAC-DATAPOL WHITE GLOSS 32X45", gramagem: "VINIL AUTOCOLANTE PARA IMP DIGITAL", qty: 100, preco: 76.00, precoFolha: 0.76, nome: "Jac-Datapol White Gloss 32x45" },
  { marca: "ANTALIS", tipo: "Polylaser Branco Brilho", gramagem: "VINIL AUTOCOLANTE PARA IMP DIGITAL", qty: 200, preco: 156.60, precoFolha: 0.78, nome: "Polylaser Branco Brilho" },
  { marca: "ANTALIS", tipo: "NOVATECH", gramagem: "DIGITAL SILK 350Gr", qty: 375, preco: 58.08, precoFolha: 0.15, nome: "Novatech Digital Silk 350g" },
  { marca: "ANTALIS", tipo: "Print Speed Laser Jet", gramagem: "IOR90 450x640 500un Gr cortado 32x45 -1000un", qty: 1000, preco: 31.34, precoFolha: 0.03, nome: "Print Speed Laser Jet IOR 90g" },
  { marca: "INAPA", tipo: "", gramagem: "", qty: 25, preco: 117.27, precoFolha: 4.69, nome: "" },
  { marca: "ANTALIS", tipo: "Invercote Creato", gramagem: "350gr", qty: 200, preco: 87.37, precoFolha: 0.44, nome: "Invercote Creato 350g" },
];

async function main() {
  console.log("\n📊 COMPARAÇÃO: PLANILHA vs SISTEMA (PAPEL)\n");
  console.log("=".repeat(140));
  console.log(
    "PLANILHA".padEnd(60) +
    "SISTEMA".padEnd(60) +
    "STATUS".padEnd(20)
  );
  console.log("=".repeat(140));

  const materials = await prisma.material.findMany({
    where: { type: { equals: "papel", mode: "insensitive" } },
    include: {
      supplier: { select: { name: true } },
      variants: { where: { isCurrent: true } },
    },
    orderBy: { name: "asc" },
  });

  // Mapear materiais do sistema por nome normalizado
  const systemMap = new Map<string, any>();
  for (const m of materials) {
    const key = m.name.toLowerCase().replace(/\s+/g, " ").trim();
    systemMap.set(key, m);
  }

  // Comparar cada item da planilha
  for (const sheetItem of SHEET_DATA) {
    if (!sheetItem.nome || sheetItem.qty === 0) {
      // Itens sem dados na planilha
      continue;
    }

    const sheetName = `Papel ${sheetItem.nome}`;
    const sheetKey = sheetName.toLowerCase().replace(/\s+/g, " ").trim();
    
    // Tentar encontrar no sistema
    let found = systemMap.get(sheetKey);
    if (!found) {
      // Tentar busca parcial
      for (const [key, mat] of systemMap.entries()) {
        if (key.includes(sheetItem.nome.toLowerCase()) || sheetItem.nome.toLowerCase().includes(key.replace("papel ", ""))) {
          found = mat;
          break;
        }
      }
    }

    const sheetInfo = `${sheetItem.marca} | ${sheetItem.nome} | €${sheetItem.precoFolha.toFixed(4)} | Qty: ${sheetItem.qty}`;
    const sheetDisplay = sheetInfo.substring(0, 58).padEnd(60);

    if (found) {
      const systemInfo = `${found.supplier?.name || "-"} | €${Number(found.unitCost).toFixed(4)} | Qty: ${found.variants[0]?.sheetsPerPack || "-"}`;
      const systemDisplay = systemInfo.substring(0, 58).padEnd(60);
      
      const priceMatch = Math.abs(Number(found.unitCost) - sheetItem.precoFolha) < 0.01;
      const qtyMatch = found.variants[0]?.sheetsPerPack === sheetItem.qty;
      const supplierMatch = found.supplier?.name === sheetItem.marca;
      
      let status = "";
      if (priceMatch && qtyMatch && supplierMatch) {
        status = "✅ OK";
      } else {
        const issues = [];
        if (!priceMatch) issues.push(`Preço: ${Number(found.unitCost).toFixed(4)} vs ${sheetItem.precoFolha.toFixed(4)}`);
        if (!qtyMatch) issues.push(`Qty: ${found.variants[0]?.sheetsPerPack || "-"} vs ${sheetItem.qty}`);
        if (!supplierMatch) issues.push(`Fornecedor: ${found.supplier?.name || "-"} vs ${sheetItem.marca}`);
        status = `⚠️ ${issues.join(" | ")}`.substring(0, 18);
      }
      
      console.log(sheetDisplay + systemDisplay + status);
      systemMap.delete(sheetKey); // Remover para não mostrar novamente
    } else {
      console.log(sheetDisplay + "❌ NÃO ENCONTRADO".padEnd(60) + "❌ FALTANDO");
    }
  }

  // Mostrar materiais no sistema que não estão na planilha
  if (systemMap.size > 0) {
    console.log("\n" + "=".repeat(140));
    console.log("MATERIAIS NO SISTEMA QUE NÃO ESTÃO NA PLANILHA:");
    console.log("=".repeat(140));
    for (const [key, mat] of systemMap.entries()) {
      console.log(`${mat.name} | ${mat.supplier?.name || "-"} | €${Number(mat.unitCost).toFixed(4)}`);
    }
  }

  console.log("\n" + "=".repeat(140) + "\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

