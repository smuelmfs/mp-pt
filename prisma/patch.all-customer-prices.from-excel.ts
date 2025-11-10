import { PrismaClient } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Script para importar TODOS os preços por cliente (impressões, materiais, acabamentos) do Excel
 * 
 * Analisa todas as abas do Excel para encontrar preços específicos por cliente
 */

interface CustomerPrice {
  cliente: string;
  tipo: 'impressao' | 'material' | 'acabamento';
  nome: string;
  preco: number;
  unidade?: string;
  observacoes?: string;
}

function extractCustomerPricesFromExcel(): CustomerPrice[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const prices: CustomerPrice[] = [];

  // Aba PRODUTOS PUBLICITÁRIOS - tem impressões e materiais (suportes)
  const produtosSheet = workbook.Sheets['PRODUTOS PUBLICITÁRIOS'];
  if (produtosSheet) {
    const data = XLSX.utils.sheet_to_json(produtosSheet, { header: 1, defval: null, raw: false }) as any[][];
    
    let headerRow = -1;
    for (let i = 0; i < Math.min(5, data.length); i++) {
      if (data[i] && String(data[i][0] || '').toUpperCase() === 'CLIENTE') {
        headerRow = i;
        break;
      }
    }

    if (headerRow !== -1) {
      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 8) continue;

        const cliente = String(row[0] || '').trim();
        const suporte = String(row[3] || '').trim();
        const custoSuporteRaw = row[4];
        const impressao = String(row[5] || '').trim();
        const custoImpressaoRaw = row[6];

        if (!cliente || cliente === 'CLIENTE') continue;

        // Preço de material (suporte)
        if (suporte && custoSuporteRaw) {
          let custo = 0;
          if (typeof custoSuporteRaw === 'number') {
            custo = custoSuporteRaw;
          } else {
            const custoStr = String(custoSuporteRaw).replace(/[€\s]/g, '').replace(',', '.');
            custo = Number(custoStr) || 0;
          }
          if (custo > 0) {
            const suporteLimpo = suporte.replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/-\s*\d+[.,]?\d*\s*€/g, '').trim();
            prices.push({
              cliente,
              tipo: 'material',
              nome: suporteLimpo,
              preco: custo,
              unidade: 'UNIT',
            });
          }
        }

        // Preço de impressão
        if (impressao && custoImpressaoRaw) {
          let custo = 0;
          if (typeof custoImpressaoRaw === 'number') {
            custo = custoImpressaoRaw;
          } else {
            const custoStr = String(custoImpressaoRaw).replace(/[€\s]/g, '').replace(',', '.');
            custo = Number(custoStr) || 0;
          }
          if (custo > 0) {
            const impressaoLimpa = impressao.replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/-\s*\d+[.,]?\d*\s*€/g, '').trim();
            prices.push({
              cliente,
              tipo: 'impressao',
              nome: impressaoLimpa,
              preco: custo,
            });
          }
        }
      }
    }
  }

  return prices;
}

async function findMaterialByName(name: string) {
  // Tenta match flexível
  const materials = await prisma.material.findMany({
    where: { 
      isCurrent: true,
      OR: [
        { name: { contains: name.split(' ')[0], mode: 'insensitive' } },
        { name: { contains: name.split(' ').slice(0, 2).join(' '), mode: 'insensitive' } },
      ]
    },
    take: 5,
  });

  // Tenta match mais específico
  for (const mat of materials) {
    const matWords = mat.name.toLowerCase().split(/\s+/);
    const searchWords = name.toLowerCase().split(/\s+/);
    const commonWords = searchWords.filter(w => matWords.some(mw => mw.includes(w) || w.includes(mw)));
    if (commonWords.length >= Math.min(2, searchWords.length)) {
      return mat;
    }
  }

  return materials[0] || null;
}

async function findPrintingByName(name: string) {
  // Tenta match flexível
  const printings = await prisma.printing.findMany({
    where: { 
      isCurrent: true,
      OR: [
        { formatLabel: { contains: name.split(' ')[0], mode: 'insensitive' } },
        { formatLabel: { contains: name.split(' ').slice(0, 2).join(' '), mode: 'insensitive' } },
      ]
    },
    take: 5,
  });

  // Tenta match mais específico
  for (const p of printings) {
    const pLabel = (p.formatLabel || '').toLowerCase();
    const searchLower = name.toLowerCase();
    if (pLabel.includes(searchLower.split(' ')[0]) || searchLower.includes(pLabel.split(' ')[0])) {
      return p;
    }
  }

  return printings[0] || null;
}

async function upsertMaterialCustomerPrice(customerId: number, materialId: number, unitCost: number) {
  const existing = await prisma.materialCustomerPrice.findFirst({
    where: {
      customerId,
      materialId,
      isCurrent: true,
    },
  });

  if (existing) {
    await prisma.materialCustomerPrice.update({
      where: { id: existing.id },
      data: { unitCost },
    });
    return { id: existing.id, action: 'updated' };
  } else {
    const created = await prisma.materialCustomerPrice.create({
      data: {
        customerId,
        materialId,
        unitCost,
        priority: 100,
        isCurrent: true,
      },
    });
    return { id: created.id, action: 'created' };
  }
}

async function upsertPrintingCustomerPrice(customerId: number, printingId: number, unitPrice: number) {
  const existing = await prisma.printingCustomerPrice.findFirst({
    where: {
      customerId,
      printingId,
      isCurrent: true,
    },
  });

  if (existing) {
    await prisma.printingCustomerPrice.update({
      where: { id: existing.id },
      data: { unitPrice },
    });
    return { id: existing.id, action: 'updated' };
  } else {
    const created = await prisma.printingCustomerPrice.create({
      data: {
        customerId,
        printingId,
        unitPrice,
        priority: 100,
        isCurrent: true,
      },
    });
    return { id: created.id, action: 'created' };
  }
}

async function main() {
  console.log('🚀 Patch — TODOS os Preços por Cliente (do Excel)\n');
  console.log('='.repeat(120));

  try {
    const excelPrices = extractCustomerPricesFromExcel();
    console.log(`📊 Excel: ${excelPrices.length} preços encontrados\n`);

    let materialCreated = 0;
    let materialUpdated = 0;
    let printingCreated = 0;
    let printingUpdated = 0;
    let notFound = 0;

    for (const price of excelPrices) {
      // Busca cliente
      const customer = await prisma.customer.findFirst({
        where: { name: { equals: price.cliente, mode: 'insensitive' } },
      });

      if (!customer) {
        console.log(`  ⚠️  Cliente não encontrado: ${price.cliente}`);
        notFound++;
        continue;
      }

      if (price.tipo === 'material') {
        const material = await findMaterialByName(price.nome);
        if (!material) {
          console.log(`  ⚠️  Material não encontrado: ${price.nome} (cliente: ${price.cliente})`);
          notFound++;
          continue;
        }

        const result = await upsertMaterialCustomerPrice(customer.id, material.id, price.preco);
        if (result.action === 'created') {
          materialCreated++;
          console.log(`  + Material: ${customer.name} → ${material.name}: €${price.preco.toFixed(2)}`);
        } else {
          materialUpdated++;
          console.log(`  ~ Material: ${customer.name} → ${material.name}: €${price.preco.toFixed(2)}`);
        }
      } else if (price.tipo === 'impressao') {
        const printing = await findPrintingByName(price.nome);
        if (!printing) {
          console.log(`  ⚠️  Impressão não encontrada: ${price.nome} (cliente: ${price.cliente})`);
          notFound++;
          continue;
        }

        const result = await upsertPrintingCustomerPrice(customer.id, printing.id, price.preco);
        if (result.action === 'created') {
          printingCreated++;
          console.log(`  + Impressão: ${customer.name} → ${printing.formatLabel}: €${price.preco.toFixed(2)}`);
        } else {
          printingUpdated++;
          console.log(`  ~ Impressão: ${customer.name} → ${printing.formatLabel}: €${price.preco.toFixed(2)}`);
        }
      }
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n📊 RESUMO:');
    console.log(`  ✅ Materiais - Criados: ${materialCreated}, Atualizados: ${materialUpdated}`);
    console.log(`  ✅ Impressões - Criados: ${printingCreated}, Atualizados: ${printingUpdated}`);
    console.log(`  ⚠️  Não encontrados: ${notFound}`);
    console.log(`  📋 Total processados: ${excelPrices.length}\n`);
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

