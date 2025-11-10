import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface CustomerPrice {
  cliente: string;
  tipo: "material" | "impressao" | "acabamento";
  nome: string;
  preco: number;
  unidade?: string;
  aba?: string;
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[€$]/g, "")
    .replace(/\d+[.,]\d+\s*€/g, "")
    .trim();
}

async function getCustomersWithoutPrices() {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const customersWithMaterialPrices = await prisma.materialCustomerPrice.findMany({
    where: { isCurrent: true },
    select: { customerId: true },
    distinct: ["customerId"],
  });
  const customersWithPrintingPrices = await prisma.printingCustomerPrice.findMany({
    where: { isCurrent: true },
    select: { customerId: true },
    distinct: ["customerId"],
  });
  const customersWithFinishPrices = await prisma.finishCustomerPrice.findMany({
    where: { isCurrent: true },
    select: { customerId: true },
    distinct: ["customerId"],
  });

  const hasMaterial = new Set(customersWithMaterialPrices.map(p => p.customerId));
  const hasPrinting = new Set(customersWithPrintingPrices.map(p => p.customerId));
  const hasFinish = new Set(customersWithFinishPrices.map(p => p.customerId));

  const customersWithoutPrices = customers.filter(c =>
    !hasMaterial.has(c.id) && !hasPrinting.has(c.id) && !hasFinish.has(c.id)
  );

  return new Set(customersWithoutPrices.map(c => normalizeName(c.name)));
}

function extractPricesFromSheet(sheetName: string, sheet: XLSX.WorkSheet, customersToFind: Set<string>): CustomerPrice[] {
  const prices: CustomerPrice[] = [];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];

  // Abas específicas com estrutura conhecida
  if (sheetName === "IMPRESSÕES SINGULARES") {
    return extractFromImpressoesSingulares(data, customersToFind);
  }
  if (sheetName === "CÁLCULO CATALOGOS") {
    return extractFromCatalogos(data, customersToFind);
  }
  if (sheetName === "ENVELOPES") {
    return extractFromEnvelopes(data, customersToFind);
  }
  if (sheetName === "PASTAS PARA A4") {
    return extractFromPastasA4(data, customersToFind);
  }
  if (sheetName === "CARTOES PVC") {
    return extractFromCartoesPVC(data, customersToFind);
  }

  // Procurar por coluna CLIENTE (método genérico)
  let headerRow = -1;
  let clienteCol = -1;

  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toUpperCase().trim();
      if (cell === "CLIENTE" || cell === "CLI") {
        headerRow = i;
        clienteCol = j;
        break;
      }
    }
    if (headerRow !== -1) break;
  }

  if (headerRow === -1 || clienteCol === -1) {
    return prices; // Não encontrou coluna de cliente nesta aba
  }

  // Identificar colunas de dados
  const headerRowData = data[headerRow];
  let materialCol = -1;
  let materialPriceCol = -1;
  let printingCol = -1;
  let printingPriceCol = -1;
  let finishCol = -1;
  let finishPriceCol = -1;

  for (let j = 0; j < headerRowData.length; j++) {
    const cell = String(headerRowData[j] || "").toUpperCase().trim();
    if (cell.includes("SUPORTE") || cell.includes("MATERIAL")) {
      materialCol = j;
      // Próxima coluna geralmente é o preço
      if (j + 1 < headerRowData.length) {
        const nextCell = String(headerRowData[j + 1] || "").toUpperCase().trim();
        if (nextCell.includes("CUSTO") || nextCell.includes("PREÇO") || !isNaN(Number(nextCell))) {
          materialPriceCol = j + 1;
        }
      }
    }
    if (cell.includes("IMPRESS") || cell.includes("PRINT")) {
      printingCol = j;
      if (j + 1 < headerRowData.length) {
        const nextCell = String(headerRowData[j + 1] || "").toUpperCase().trim();
        if (nextCell.includes("CUSTO") || nextCell.includes("PREÇO") || !isNaN(Number(nextCell))) {
          printingPriceCol = j + 1;
        }
      }
    }
    if (cell.includes("ACABAMENT") || cell.includes("FINISH") || cell.includes("LAMIN") || cell.includes("PLASTIF")) {
      finishCol = j;
      if (j + 1 < headerRowData.length) {
        const nextCell = String(headerRowData[j + 1] || "").toUpperCase().trim();
        if (nextCell.includes("CUSTO") || nextCell.includes("PREÇO") || !isNaN(Number(nextCell))) {
          finishPriceCol = j + 1;
        }
      }
    }
  }

  // Processar linhas de dados
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[clienteCol]) continue;

    const cliente = normalizeName(String(row[clienteCol] || "").trim());
    if (!cliente || cliente === "CLIENTE" || !customersToFind.has(cliente)) continue;

    // Material
    if (materialCol !== -1 && materialPriceCol !== -1 && row[materialCol] && row[materialPriceCol]) {
      const materialName = String(row[materialCol]).trim();
      const priceRaw = row[materialPriceCol];
      let price = 0;
      if (typeof priceRaw === "number") {
        price = priceRaw;
      } else {
        const priceStr = String(priceRaw).replace(/[€\s]/g, "").replace(",", ".");
        price = Number(priceStr) || 0;
      }
      if (price > 0 && materialName) {
        prices.push({
          cliente,
          tipo: "material",
          nome: materialName,
          preco: price,
          aba: sheetName,
        });
      }
    }

    // Impressão
    if (printingCol !== -1 && printingPriceCol !== -1 && row[printingCol] && row[printingPriceCol]) {
      const printingName = String(row[printingCol]).trim();
      const priceRaw = row[printingPriceCol];
      let price = 0;
      if (typeof priceRaw === "number") {
        price = priceRaw;
      } else {
        const priceStr = String(priceRaw).replace(/[€\s]/g, "").replace(",", ".");
        price = Number(priceStr) || 0;
      }
      if (price > 0 && printingName) {
        prices.push({
          cliente,
          tipo: "impressao",
          nome: printingName,
          preco: price,
          aba: sheetName,
        });
      }
    }

    // Acabamento
    if (finishCol !== -1 && finishPriceCol !== -1 && row[finishCol] && row[finishPriceCol]) {
      const finishName = String(row[finishCol]).trim();
      const priceRaw = row[finishPriceCol];
      let price = 0;
      if (typeof priceRaw === "number") {
        price = priceRaw;
      } else {
        const priceStr = String(priceRaw).replace(/[€\s]/g, "").replace(",", ".");
        price = Number(priceStr) || 0;
      }
      if (price > 0 && finishName) {
        prices.push({
          cliente,
          tipo: "acabamento",
          nome: finishName,
          preco: price,
          aba: sheetName,
        });
      }
    }
  }

  return prices;
}

// Extração específica para IMPRESSÕES SINGULARES
function extractFromImpressoesSingulares(data: any[][], customersToFind: Set<string>): CustomerPrice[] {
  const prices: CustomerPrice[] = [];
  
  // Estrutura: Col 0 = CLIENTE, Col 1 = DESCRIÇÃO, Col 5 = CUSTO IMPRESSÃO UNIT, Col 7 = CUSTO PAPEL UNIT
  let headerRow = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    if (data[i] && String(data[i][0] || "").toUpperCase().trim() === "CLIENTE") {
      headerRow = i;
      break;
    }
  }
  
  if (headerRow === -1) return prices;
  
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    
    const cliente = normalizeName(String(row[0] || "").trim());
    if (!cliente || cliente === "CLIENTE" || !customersToFind.has(cliente)) continue;
    
    const description = String(row[1] || "").trim();
    const printingUnitCost = normalizePrice(row[5]);
    const paperUnitCost = normalizePrice(row[7]);
    
    // Extrair formato de impressão da descrição
    const printingName = extractPrintingNameFromDescription(description);
    
    if (printingName && printingUnitCost > 0) {
      prices.push({
        cliente,
        tipo: "impressao",
        nome: printingName,
        preco: printingUnitCost,
        aba: "IMPRESSÕES SINGULARES",
      });
    }
    
    // Extrair material da descrição
    const materialName = extractMaterialNameFromDescription(description);
    if (materialName && paperUnitCost > 0) {
      prices.push({
        cliente,
        tipo: "material",
        nome: materialName,
        preco: paperUnitCost,
        aba: "IMPRESSÕES SINGULARES",
      });
    }
  }
  
  return prices;
}

// Extração específica para CÁLCULO CATALOGOS
function extractFromCatalogos(data: any[][], customersToFind: Set<string>): CustomerPrice[] {
  const prices: CustomerPrice[] = [];
  
  // Estrutura: Col 0 = CLIENTE, Col 1 = DESCRIÇÃO, Col 5 = CUSTO IMPRESSÃO, Col 7 = CUSTO PAPEL UNIT
  let headerRow = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    if (data[i] && String(data[i][0] || "").toUpperCase().trim() === "CLIENTE") {
      headerRow = i;
      break;
    }
  }
  
  if (headerRow === -1) return prices;
  
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    
    const cliente = normalizeName(String(row[0] || "").trim());
    if (!cliente || cliente === "CLIENTE" || !customersToFind.has(cliente)) continue;
    
    const description = String(row[1] || "").trim();
    const printingCost = normalizePrice(row[5]);
    const paperUnitCost = normalizePrice(row[7]);
    
    // Para catálogos, usar impressão padrão baseada na descrição
    const printingName = extractPrintingNameFromDescription(description) || "A4";
    
    if (printingName && printingCost > 0) {
      prices.push({
        cliente,
        tipo: "impressao",
        nome: printingName,
        preco: printingCost,
        aba: "CÁLCULO CATALOGOS",
      });
    }
    
    const materialName = extractMaterialNameFromDescription(description);
    if (materialName && paperUnitCost > 0) {
      prices.push({
        cliente,
        tipo: "material",
        nome: materialName,
        preco: paperUnitCost,
        aba: "CÁLCULO CATALOGOS",
      });
    }
  }
  
  return prices;
}

// Extração específica para ENVELOPES
function extractFromEnvelopes(data: any[][], customersToFind: Set<string>): CustomerPrice[] {
  const prices: CustomerPrice[] = [];
  
  // Envelopes geralmente não têm preços por cliente específicos na planilha
  // Mas podemos verificar se há alguma seção de clientes
  // Por enquanto, retornar vazio pois envelopes usam preços padrão
  return prices;
}

// Extração específica para PASTAS PARA A4
function extractFromPastasA4(data: any[][], customersToFind: Set<string>): CustomerPrice[] {
  const prices: CustomerPrice[] = [];
  // Similar a catálogos
  return prices;
}

// Extração específica para CARTOES PVC
function extractFromCartoesPVC(data: any[][], customersToFind: Set<string>): CustomerPrice[] {
  const prices: CustomerPrice[] = [];
  // Similar a outros
  return prices;
}

function normalizePrice(value: any): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const str = String(value).replace(/[€\s]/g, "").replace(",", ".");
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

function extractPrintingNameFromDescription(description: string): string | null {
  if (!description) return null;
  
  const desc = description.toUpperCase();
  
  // Padrões conhecidos - ordem importa (mais específicos primeiro)
  if (desc.includes("BANNER")) {
    if (desc.includes("FRENTE") && desc.includes("VERSO")) return "BANNER CMYK FRENTE / VERSO";
    if (desc.includes("FRENTE")) return "BANNER CMYK FRENTE";
    return "BANNER";
  }
  if (desc.includes("SRA3") || (desc.includes("A3") && !desc.includes("A4") && !desc.includes("A30"))) {
    return "A3";
  }
  if (desc.includes("SRA4") || (desc.includes("A4") && !desc.includes("A40"))) {
    return "A4";
  }
  if (desc.includes("A5")) return "A5";
  if (desc.includes("A6")) return "A6";
  if (desc.includes("33X48") || desc.includes("33×48")) return "33x48";
  if (desc.includes("DL")) return "DL";
  if (desc.includes("FLYER")) {
    if (desc.includes("A4")) return "A4";
    if (desc.includes("A5")) return "A5";
    if (desc.includes("A6")) return "A6";
  }
  if (desc.includes("CARTAZ")) {
    if (desc.includes("A3")) return "A3";
    if (desc.includes("A4")) return "A4";
  }
  
  // Tentar extrair formato
  const formatMatch = description.match(/(A\d+|SRA\d+|\d+X\d+)/i);
  if (formatMatch) {
    const format = formatMatch[1].toUpperCase();
    if (format.includes("A3") || format.includes("SRA3")) return "A3";
    if (format.includes("A4") || format.includes("SRA4")) return "A4";
    if (format.includes("A5")) return "A5";
    if (format.includes("A6")) return "A6";
    return format;
  }
  
  // Fallback: se não encontrar nada, retornar null para não criar preço inválido
  return null;
}

function extractMaterialNameFromDescription(description: string): string | null {
  if (!description) return null;
  
  const desc = description.toUpperCase();
  
  // Padrões conhecidos - buscar no banco por palavras-chave
  // Retornar null aqui e fazer matching inteligente na função findMaterialByName
  // Isso permite matching mais flexível
  
  // Mas podemos retornar sugestões baseadas em padrões
  if (desc.includes("CONDAT")) return "Condat";
  if (desc.includes("OFFSET")) return "Offset";
  if (desc.includes("COUCHE")) return "Couché";
  if (desc.includes("250G") || desc.includes("250 G")) {
    if (desc.includes("GLOSS")) return "Condat Gloss 250g";
    if (desc.includes("MATT") || desc.includes("MATE")) return "Condat Matt 250g";
    return "250g";
  }
  if (desc.includes("300G") || desc.includes("300 G")) {
    if (desc.includes("GLOSS")) return "Condat Gloss 300g";
    if (desc.includes("MATT") || desc.includes("MATE")) return "Condat Matt 300g";
    return "300g";
  }
  if (desc.includes("GLOSS")) return "Gloss";
  if (desc.includes("MATT") || desc.includes("MATE")) return "Matt";
  
  return null;
}

async function extractAllPricesForMissingCustomers(customersToFind: Set<string>): Promise<CustomerPrice[]> {
  console.log(`\n📖 Lendo planilha Excel: ${EXCEL_FILE}`);
  
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`❌ Arquivo não encontrado: ${EXCEL_FILE}`);
    return [];
  }

  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheetNames = workbook.SheetNames;
  const allPrices: CustomerPrice[] = [];

  console.log(`📋 Processando ${sheetNames.length} abas...`);

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const prices = extractPricesFromSheet(sheetName, sheet, customersToFind);
    if (prices.length > 0) {
      console.log(`  ✅ ${sheetName}: ${prices.length} preços encontrados`);
      allPrices.push(...prices);
    }
  }

  return allPrices;
}

function findMaterialByName(name: string): Promise<any> {
  const normalized = normalizeName(name);
  
  // Buscar todas as materiais para matching inteligente
  return prisma.material.findMany({
    where: { isCurrent: true },
    select: { id: true, name: true, type: true }
  }).then(materials => {
    // Tentar match exato primeiro
    let match = materials.find(m => 
      normalizeName(m.name) === normalized ||
      normalizeName(m.name).includes(normalized) ||
      normalized.includes(normalizeName(m.name))
    );
    
    if (match) return match;
    
    // Matching por primeira palavra (tipo de material)
    const firstWord = normalized.split(" ")[0];
    match = materials.find(m => 
      normalizeName(m.name).startsWith(firstWord) ||
      m.type === firstWord.toLowerCase()
    );
    
    return match || null;
  });
}

function findPrintingByName(name: string): Promise<any> {
  const normalized = normalizeName(name);
  
  // Buscar todas as impressões para matching inteligente
  return prisma.printing.findMany({
    where: { isCurrent: true },
    select: {
      id: true,
      technology: true,
      formatLabel: true,
      colors: true,
      sides: true,
    }
  }).then(printings => {
    // 1. Tentar match exato primeiro
    let match = printings.find(p => {
      if (!p.formatLabel) return false;
      const pNormalized = normalizeName(p.formatLabel);
      return pNormalized === normalized || 
             pNormalized === name.toUpperCase() ||
             name.toUpperCase() === pNormalized;
    });
    
    if (match) return match;
    
    // 2. Match por formato (A3, A4, A5, A6, etc.)
    const formatMatch = normalized.match(/^(A\d+|SRA\d+|\d+X\d+)$/);
    if (formatMatch) {
      const format = formatMatch[1].toUpperCase();
      
      // Procurar impressão com mesmo formato - várias estratégias
      // Estratégia 1: Match exato
      match = printings.find(p => {
        if (!p.formatLabel) return false;
        const pNormalized = normalizeName(p.formatLabel);
        return pNormalized === format;
      });
      
      if (match) return match;
      
      // Estratégia 2: Formato no início ou fim do nome
      match = printings.find(p => {
        if (!p.formatLabel) return false;
        const pNormalized = normalizeName(p.formatLabel);
        const firstWord = pNormalized.split(" ")[0];
        const lastWord = pNormalized.split(" ").pop();
        return firstWord === format || lastWord === format || 
               pNormalized.startsWith(format + " ") || 
               pNormalized.endsWith(" " + format);
      });
      
      if (match) return match;
      
      // Estratégia 3: Formato contido no nome (para formatos curtos como A5)
      if (format.length <= 3) {
        match = printings.find(p => {
          if (!p.formatLabel) return false;
          const pNormalized = normalizeName(p.formatLabel);
          // Verificar se o formato está no nome como palavra completa
          const words = pNormalized.split(/\s+/);
          return words.includes(format) || pNormalized.includes(" " + format + " ") || 
                 pNormalized.startsWith(format) || pNormalized.endsWith(format);
        });
        
        if (match) return match;
      }
      
      // Estratégia 4: Para formatos customizados (110X215, etc.), procurar impressão genérica similar
      if (format.includes("X")) {
        // Tentar encontrar impressão genérica de grande formato
        match = printings.find(p => {
          if (!p.formatLabel) return false;
          return p.technology === "GRANDE_FORMATO" || p.technology === "UV";
        });
        
        if (match) return match;
      }
    }
    
    // 3. Matching por palavras-chave
    const keywords = extractKeywords(name);
    for (const printing of printings) {
      if (!printing.formatLabel) continue;
      
      const printingNormalized = normalizeName(printing.formatLabel);
      const printingKeywords = extractKeywords(printing.formatLabel);
      
      // Verificar se há palavras-chave em comum
      const commonKeywords = keywords.filter(k => printingKeywords.includes(k));
      
      // Se houver pelo menos 1 palavra-chave importante em comum
      const importantKeywords = ["NHM", "UV", "PLANA", "VINIL", "LAMIN", "BANNER", "A3", "A4", "A5", "A6"];
      const hasImportantMatch = importantKeywords.some(k => 
        keywords.includes(k) && printingKeywords.includes(k)
      );
      
      if (hasImportantMatch || commonKeywords.length >= 2) {
        return printing;
      }
      
      // Verificar padrões específicos
      if (normalized.includes("NHM") && printingNormalized.includes("NHM")) {
        return printing;
      }
      if (normalized.includes("UV") && printing.technology === "UV") {
        return printing;
      }
      if (normalized.includes("PLANA") && printingNormalized.includes("PLANO")) {
        return printing;
      }
      if (normalized.includes("VINIL") && printingNormalized.includes("VINIL")) {
        return printing;
      }
      if (normalized.includes("LAMIN") && printingNormalized.includes("LAMIN")) {
        return printing;
      }
      if (normalized.includes("BANNER") && printingNormalized.includes("BANNER")) {
        return printing;
      }
    }
    
    // 4. Fallback: procurar por tecnologia se o nome contém indicação
    if (normalized.includes("DIGITAL") || normalized.includes("OFFSET")) {
      match = printings.find(p => p.technology === "DIGITAL" && p.formatLabel && normalizeName(p.formatLabel).includes(normalized.split(" ")[0]));
      if (match) return match;
    }
    
    return null;
  });
}

function extractKeywords(text: string): string[] {
  const normalized = normalizeName(text);
  const words = normalized.split(/\s+/).filter(w => w.length > 1);
  
  // Adicionar palavras-chave importantes mesmo que sejam curtas
  const importantWords = ["NHM", "UV", "PLANA", "VINIL", "LAMIN", "CORTE", "PLANO", "TELA", "LONA", "BANNER", "A3", "A4", "A5", "A6", "DL"];
  const foundImportant = importantWords.filter(w => normalized.includes(w));
  
  // Extrair formatos (A3, A4, A5, A6, 33x48, etc.)
  const formatMatch = normalized.match(/(A\d+|SRA\d+|\d+X\d+)/);
  if (formatMatch) {
    foundImportant.push(formatMatch[1]);
  }
  
  return [...words, ...foundImportant];
}

async function createOrFindGenericPrinting(name: string): Promise<any> {
  const normalized = normalizeName(name);
  
  // Determinar tecnologia baseada no nome
  let technology: "DIGITAL" | "UV" | "GRANDE_FORMATO" | "OFFSET" = "DIGITAL";
  if (normalized.includes("UV")) technology = "UV";
  if (normalized.includes("GRANDE") || normalized.includes("FORMATO") || normalized.match(/\d+X\d+/)) {
    technology = "GRANDE_FORMATO";
  }
  
  // Para formatos A3, A4, A5, A6 - criar impressão genérica
  const formatMatch = normalized.match(/^(A\d+|SRA\d+)$/);
  if (formatMatch) {
    const format = formatMatch[1];
    // Verificar se já existe alguma impressão com esse formato
    const existing = await prisma.printing.findFirst({
      where: {
        isCurrent: true,
        technology: technology,
        formatLabel: { contains: format, mode: "insensitive" }
      }
    });
    
    if (existing) return existing;
    
    // Criar nova impressão genérica
    const created = await prisma.printing.create({
      data: {
        technology,
        formatLabel: format,
        colors: "CMYK",
        sides: 1,
        unitPrice: "0.0000", // Preço virá do cliente
        active: true,
        isCurrent: true
      }
    });
    
    console.log(`  📝 Criada impressão genérica: ${format} (${technology})`);
    return created;
  }
  
  // Para formatos customizados (110X215, etc.) - usar impressão genérica de grande formato
  const customFormatMatch = normalized.match(/^(\d+X\d+)$/);
  if (customFormatMatch) {
    // Procurar impressão genérica de grande formato
    const generic = await prisma.printing.findFirst({
      where: {
        isCurrent: true,
        technology: "GRANDE_FORMATO",
        OR: [
          { formatLabel: { contains: "PLANO", mode: "insensitive" } },
          { formatLabel: { contains: "M2", mode: "insensitive" } }
        ]
      }
    });
    
    if (generic) return generic;
    
    // Criar impressão genérica
    const created = await prisma.printing.create({
      data: {
        technology: "GRANDE_FORMATO",
        formatLabel: `Custom ${customFormatMatch[1]}`,
        unitPrice: "0.0000",
        active: true,
        isCurrent: true
      }
    });
    
    console.log(`  📝 Criada impressão genérica: Custom ${customFormatMatch[1]}`);
    return created;
  }
  
  return null;
}

function findFinishByName(name: string): Promise<any> {
  const normalized = normalizeName(name);
  
  // Buscar todos os acabamentos para matching inteligente
  return prisma.finish.findMany({
    where: { isCurrent: true },
    select: { id: true, name: true, category: true }
  }).then(finishes => {
    // Tentar match exato primeiro
    let match = finishes.find(f => 
      normalizeName(f.name) === normalized ||
      normalizeName(f.name).includes(normalized) ||
      normalized.includes(normalizeName(f.name))
    );
    
    if (match) return match;
    
    // Matching por palavras-chave comuns
    const keywords = ["PLASTIF", "FOIL", "LAMIN", "CORTE", "DOBRA", "VINCO"];
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        match = finishes.find(f => 
          normalizeName(f.name).includes(keyword) ||
          f.category === keyword.slice(0, -1) // Remove última letra para match com enum
        );
        if (match) return match;
      }
    }
    
    return null;
  });
}

async function main() {
  console.log("=".repeat(120));
  console.log("🔍 Buscando e Importando Preços para Clientes sem Preços");
  console.log("=".repeat(120));
  console.log();

  // 1. Identificar clientes sem preços
  console.log("📊 Identificando clientes sem preços...");
  const customersToFind = await getCustomersWithoutPrices();
  console.log(`✅ Encontrados ${customersToFind.size} clientes sem preços`);
  console.log(`   Exemplos: ${Array.from(customersToFind).slice(0, 5).join(", ")}${customersToFind.size > 5 ? "..." : ""}`);
  console.log();

  if (customersToFind.size === 0) {
    console.log("✅ Todos os clientes já têm preços configurados!");
    return;
  }

  // 2. Extrair preços da planilha
  console.log("📖 Extraindo preços da planilha Excel...");
  const prices = await extractAllPricesForMissingCustomers(customersToFind);
  console.log(`\n📊 Total de preços encontrados: ${prices.length}`);
  console.log();

  if (prices.length === 0) {
    console.log("⚠️  Nenhum preço encontrado na planilha para esses clientes.");
    console.log("   Isso pode ser normal se esses clientes usam preços padrão do sistema.");
    return;
  }

  // 3. Agrupar por cliente
  const byCustomer = new Map<string, CustomerPrice[]>();
  for (const price of prices) {
    const existing = byCustomer.get(price.cliente) || [];
    existing.push(price);
    byCustomer.set(price.cliente, existing);
  }

  console.log(`👥 Clientes com preços encontrados: ${byCustomer.size}`);
  console.log();

  // 4. Importar preços
  let materialsCreated = 0;
  let printingsCreated = 0;
  let finishesCreated = 0;
  let materialsSkipped = 0;
  let printingsSkipped = 0;
  let finishesSkipped = 0;

  for (const [customerName, customerPrices] of byCustomer.entries()) {
    const customer = await prisma.customer.findFirst({
      where: {
        name: { equals: customerName, mode: "insensitive" },
        isActive: true
      }
    });

    if (!customer) {
      console.warn(`⚠️  Cliente não encontrado: ${customerName}`);
      continue;
    }

    console.log(`\n👤 ${customerName} (${customerPrices.length} preços)`);

    for (const price of customerPrices) {
      try {
        if (price.tipo === "material") {
          const material = await findMaterialByName(price.nome);
          if (!material) {
            materialsSkipped++;
            continue;
          }

          await prisma.materialCustomerPrice.create({
            data: {
              materialId: material.id,
              customerId: customer.id,
              unitCost: price.preco.toFixed(4),
              priority: 100,
              isCurrent: true
            }
          });
          materialsCreated++;
          console.log(`  ✅ Material: ${material.name} → €${price.preco.toFixed(2)}`);
        } else if (price.tipo === "impressao") {
          let printing = await findPrintingByName(price.nome);
          
          // Se não encontrou, tentar criar ou usar impressão genérica
          if (!printing) {
            // Tentar criar impressão genérica para formatos conhecidos
            printing = await createOrFindGenericPrinting(price.nome);
            
            if (!printing) {
              console.warn(`  ⚠️  Impressão não encontrada: "${price.nome}" (cliente: ${customerName})`);
              printingsSkipped++;
              continue;
            }
          }

          await prisma.printingCustomerPrice.create({
            data: {
              printingId: printing.id,
              customerId: customer.id,
              unitPrice: price.preco.toFixed(4),
              priority: 100,
              isCurrent: true
            }
          });
          printingsCreated++;
          console.log(`  ✅ Impressão: ${printing.formatLabel || printing.technology} → €${price.preco.toFixed(2)}`);
        } else if (price.tipo === "acabamento") {
          const finish = await findFinishByName(price.nome);
          if (!finish) {
            finishesSkipped++;
            continue;
          }

          await prisma.finishCustomerPrice.create({
            data: {
              finishId: finish.id,
              customerId: customer.id,
              baseCost: price.preco.toFixed(4),
              priority: 100,
              isCurrent: true
            }
          });
          finishesCreated++;
          console.log(`  ✅ Acabamento: ${finish.name} → €${price.preco.toFixed(2)}`);
        }
      } catch (error: any) {
        console.error(`  ❌ Erro ao processar ${price.tipo} "${price.nome}":`, error.message);
      }
    }
  }

  console.log(`\n${"=".repeat(120)}`);
  console.log(`✅ RESUMO DA IMPORTAÇÃO:`);
  console.log("=".repeat(120));
  console.log();
  console.log(`📄 MATERIAIS: ${materialsCreated} criados, ${materialsSkipped} pulados`);
  console.log(`🖨️  IMPRESSÕES: ${printingsCreated} criadas, ${printingsSkipped} puladas`);
  console.log(`✨ ACABAMENTOS: ${finishesCreated} criados, ${finishesSkipped} pulados`);
  console.log(`👥 CLIENTES PROCESSADOS: ${byCustomer.size}`);
  console.log("=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

