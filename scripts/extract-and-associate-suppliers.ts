import { prisma } from "../lib/prisma";
import * as XLSX from "xlsx";
import * as path from "path";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface MaterialSupplierMapping {
  materialName: string;
  supplierName: string;
  materialType: string;
}

function normalizeMaterialName(name: string): string {
  return name
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("=".repeat(120));
  console.log("🔗 Extraindo e Associando Fornecedores da Planilha");
  console.log("=".repeat(120));
  console.log();

  const workbook = XLSX.readFile(EXCEL_PATH);
  const mappings: MaterialSupplierMapping[] = [];

  // 1. PAPEL - Col 1 = FORNECEDOR (INAPA, ANTALIS)
  if (workbook.SheetNames.includes("PAPEL")) {
    console.log("📄 Processando aba PAPEL...");
    const sheet = workbook.Sheets["PAPEL"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;

      const supplierName = String(row[0] || "").trim().toUpperCase();
      const marca = String(row[1] || "").trim();
      const glossSilk = String(row[2] || "").trim();
      const gramagem = String(row[3] || "").trim();

      if (!supplierName || supplierName === "" || supplierName === "MARCA") continue;
      if (supplierName !== "INAPA" && supplierName !== "ANTALIS") continue;

      // Construir nome do material
      let materialName = "";
      if (marca) {
        materialName = `Papel ${marca}`;
        if (glossSilk) materialName += ` ${glossSilk}`;
        if (gramagem) materialName += ` ${gramagem}g`;
      } else if (gramagem) {
        materialName = `Papel ${gramagem}g`;
      }

      if (materialName) {
        mappings.push({
          materialName: normalizeMaterialName(materialName),
          supplierName,
          materialType: "papel"
        });
      }
    }
    console.log(`  ✅ ${mappings.length} materiais PAPEL com fornecedor encontrados`);
  }

  // 2. VINIL - Usar fornecedores genéricos (Fornecedor Vinil A/B/C)
  if (workbook.SheetNames.includes("VINIL")) {
    console.log("\n📋 Processando aba VINIL...");
    const sheet = workbook.Sheets["VINIL"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

    // Encontrar linha de cabeçalho (linha 4 tem "TIPO")
    let headerRow = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const firstCell = String(row[0] || "").toUpperCase().trim();
      if (firstCell.includes("TIPO")) {
        headerRow = i;
        break;
      }
    }

    if (headerRow !== -1) {
      const vinilSuppliers = ["Fornecedor Vinil A", "Fornecedor Vinil B", "Fornecedor Vinil C"];
      let count = 0;

      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;

        const materialName = normalizeMaterialName(String(row[0] || "").trim());
        if (!materialName || materialName === "" || materialName === "TIPO") continue;

        // Extrair nome base do material (remover dimensões)
        const baseName = materialName.split("615mm")[0].split("1220mm")[0].trim();
        if (!baseName) continue;

        const supplierName = vinilSuppliers[count % 3];
        mappings.push({
          materialName: baseName,
          supplierName,
          materialType: "vinil"
        });
        count++;
      }
      console.log(`  ✅ ${count} materiais VINIL mapeados para fornecedores genéricos`);
    }
  }

  // 3. ALVEOLAR - Usar fornecedores genéricos (Fornecedor Alveolar A/B/C)
  if (workbook.SheetNames.includes("ALVEOLAR")) {
    console.log("\n📦 Processando aba ALVEOLAR...");
    const sheet = workbook.Sheets["ALVEOLAR"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

    let headerRow = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const firstCell = String(row[0] || "").toUpperCase().trim();
      if (firstCell.includes("TIPO")) {
        headerRow = i;
        break;
      }
    }

    if (headerRow !== -1) {
      const alveolarSuppliers = ["Fornecedor Alveolar A", "Fornecedor Alveolar B", "Fornecedor Alveolar C"];
      let count = 0;

      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;

        const materialName = normalizeMaterialName(String(row[0] || "").trim());
        if (!materialName || materialName === "" || materialName === "TIPO") continue;

        // Extrair nome base do material
        const baseName = materialName.split("\\\\")[0].split("\\")[0].trim();
        if (!baseName) continue;

        const supplierName = alveolarSuppliers[count % 3];
        mappings.push({
          materialName: baseName,
          supplierName,
          materialType: "alveolar"
        });
        count++;
      }
      console.log(`  ✅ ${count} materiais ALVEOLAR mapeados para fornecedores genéricos`);
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log(`📊 Total de mapeamentos: ${mappings.length}`);
  console.log("=".repeat(120));

  // Agrupar por fornecedor
  const bySupplier = mappings.reduce((acc, m) => {
    if (!acc[m.supplierName]) acc[m.supplierName] = [];
    acc[m.supplierName].push(m.materialName);
    return acc;
  }, {} as Record<string, string[]>);

  console.log("\nFornecedores encontrados:");
  for (const [supplier, materials] of Object.entries(bySupplier)) {
    console.log(`\n  ${supplier}: ${materials.length} materiais`);
    console.log(`    Exemplos: ${[...new Set(materials)].slice(0, 3).join(", ")}`);
  }

  // Agora associar aos materiais no banco
  console.log("\n" + "=".repeat(120));
  console.log("🔗 Associando fornecedores aos materiais no banco...");
  console.log("=".repeat(120));

  let associated = 0;
  let notFound = 0;
  const notFoundMaterials: string[] = [];

  for (const mapping of mappings) {
    // Buscar material no banco (busca flexível por nome)
    const material = await prisma.material.findFirst({
      where: {
        type: mapping.materialType,
        isCurrent: true,
        name: {
          contains: mapping.materialName.split(" ")[0], // Primeira palavra
          mode: "insensitive"
        }
      }
    });

    if (!material) {
      notFound++;
      notFoundMaterials.push(`${mapping.materialName} (${mapping.materialType})`);
      continue;
    }

    // Buscar ou criar fornecedor
    let supplier = await prisma.supplier.findFirst({
      where: {
        name: { equals: mapping.supplierName, mode: "insensitive" },
        active: true
      }
    });

    if (!supplier) {
      // Criar fornecedor genérico se não existir
      supplier = await prisma.supplier.create({
        data: {
          name: mapping.supplierName,
          active: true
        }
      });
      console.log(`  ✅ Fornecedor criado: ${mapping.supplierName}`);
    }

    // Associar material ao fornecedor
    if (material.supplierId !== supplier.id) {
      await prisma.material.update({
        where: { id: material.id },
        data: { supplierId: supplier.id }
      });
      console.log(`  ✅ ${material.name} → ${supplier.name}`);
      associated++;
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log(`✅ Total associado: ${associated}`);
  console.log(`⚠️  Não encontrados: ${notFound}`);
  if (notFoundMaterials.length > 0) {
    console.log(`\nMateriais não encontrados (primeiros 10):`);
    notFoundMaterials.slice(0, 10).forEach(m => console.log(`  - ${m}`));
  }
  console.log("=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

