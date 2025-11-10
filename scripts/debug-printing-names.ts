import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

async function main() {
  console.log("=".repeat(120));
  console.log("🔍 Debug: Nomes de Impressões na Planilha vs Sistema");
  console.log("=".repeat(120));
  console.log();

  // 1. Listar impressões do sistema
  const printings = await prisma.printing.findMany({
    where: { isCurrent: true },
    select: {
      id: true,
      technology: true,
      formatLabel: true,
      colors: true,
    },
    orderBy: { formatLabel: "asc" },
  });

  console.log(`📋 Impressões no sistema: ${printings.length}\n`);
  console.log("Exemplos (primeiras 30):");
  printings.slice(0, 30).forEach(p => {
    console.log(`  - "${p.formatLabel || p.technology}" (${p.technology}, ${p.colors || "N/A"})`);
  });
  console.log();

  // 2. Extrair nomes da planilha
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`❌ Arquivo não encontrado: ${EXCEL_FILE}`);
    return;
  }

  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheetNames = ["IMPRESSÕES SINGULARES", "CÁLCULO CATALOGOS", "ENVELOPES", "PASTAS PARA A4"];
  
  const extractedNames = new Set<string>();

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];
    
    // Procurar coluna de impressão
    let headerRow = -1;
    let printingCol = -1;

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "").toUpperCase().trim();
        if (cell.includes("IMPRESS") || cell.includes("PRINT")) {
          headerRow = i;
          printingCol = j;
          break;
        }
      }
      if (headerRow !== -1) break;
    }

    if (headerRow !== -1 && printingCol !== -1) {
      for (let i = headerRow + 1; i < Math.min(headerRow + 100, data.length); i++) {
        const row = data[i];
        if (!row || !row[printingCol]) continue;
        
        const printingName = String(row[printingCol]).trim();
        if (printingName && printingName.length > 3) {
          extractedNames.add(printingName.toUpperCase());
        }
      }
    }
  }

  console.log(`\n📋 Nomes extraídos da planilha: ${extractedNames.size}\n`);
  console.log("Exemplos (primeiros 30):");
  Array.from(extractedNames).slice(0, 30).forEach(name => {
    console.log(`  - "${name}"`);
  });
  console.log();

  // 3. Tentar fazer match
  console.log("\n🔗 Tentando fazer match...\n");
  let matches = 0;
  let noMatches = 0;

  for (const extractedName of Array.from(extractedNames).slice(0, 20)) {
    const normalized = extractedName.trim().toUpperCase().replace(/\s+/g, " ");
    
    // Tentar match simples
    let match = printings.find(p => {
      if (!p.formatLabel) return false;
      const pNormalized = p.formatLabel.toUpperCase();
      return pNormalized === normalized || 
             pNormalized.includes(normalized) || 
             normalized.includes(pNormalized);
    });

    if (!match) {
      // Tentar por palavras-chave
      const keywords = ["NHM", "UV", "PLANA", "VINIL", "LAMIN"];
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) {
          match = printings.find(p => {
            if (!p.formatLabel) return false;
            return p.formatLabel.toUpperCase().includes(keyword);
          });
          if (match) break;
        }
      }
    }

    if (match) {
      matches++;
      console.log(`  ✅ "${extractedName}" → "${match.formatLabel}"`);
    } else {
      noMatches++;
      console.log(`  ❌ "${extractedName}" → SEM MATCH`);
    }
  }

  console.log(`\n📊 Resultado: ${matches} matches, ${noMatches} sem match`);

  await prisma.$disconnect();
}

main();

