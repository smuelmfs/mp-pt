import { PrismaClient } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Seed para extrair e adicionar clientes do Excel
 * 
 * Busca clientes em todas as abas do Excel e adiciona ao sistema
 */

function extractCustomersFromExcel(): Set<string> {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const customers = new Set<string>();

  // Aba PRODUTOS PUBLICITÁRIOS
  const produtosSheet = workbook.Sheets['PRODUTOS PUBLICITÁRIOS'];
  if (produtosSheet) {
    const data = XLSX.utils.sheet_to_json(produtosSheet, { header: 1, defval: null, raw: false }) as any[][];
    
    // Encontra header
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
        if (row && row[0]) {
          const cliente = String(row[0]).trim();
          if (cliente && cliente !== 'CLIENTE' && cliente !== '') {
            customers.add(cliente);
          }
        }
      }
    }
  }

  return customers;
}

async function upsertCustomer(name: string) {
  const existing = await prisma.customer.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });

  if (existing) {
    // Atualiza para ativo se estiver inativo
    if (!existing.isActive) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      console.log(`  ~ Ativado: ${name} (id ${existing.id})`);
    } else {
      console.log(`  ✓ Já existe: ${name} (id ${existing.id})`);
    }
    return existing.id;
  } else {
    const created = await prisma.customer.create({
      data: { name, isActive: true },
    });
    console.log(`  + Criado: ${name} (id ${created.id})`);
    return created.id;
  }
}

async function main() {
  console.log('🚀 Seed — Clientes do Excel\n');
  console.log('='.repeat(120));

  try {
    const excelCustomers = extractCustomersFromExcel();
    console.log(`📊 Excel: ${excelCustomers.size} clientes únicos encontrados\n`);

    let created = 0;
    let updated = 0;
    let existing = 0;

    for (const customerName of excelCustomers) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { name: { equals: customerName, mode: 'insensitive' } },
      });

      if (existingCustomer) {
        if (!existingCustomer.isActive) {
          await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: { isActive: true },
          });
          updated++;
        } else {
          existing++;
        }
      } else {
        await prisma.customer.create({
          data: { name: customerName, isActive: true },
        });
        created++;
      }
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n📊 RESUMO:');
    console.log(`  ✅ Criados: ${created}`);
    console.log(`  ✅ Atualizados: ${updated}`);
    console.log(`  ✓ Já existiam: ${existing}`);
    console.log(`  📋 Total: ${excelCustomers.size}\n`);

    // Lista todos os clientes
    const allCustomers = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    console.log('📋 Clientes ativos no sistema:');
    allCustomers.forEach(c => {
      console.log(`  - ${c.name} (id ${c.id})`);
    });
    console.log('');
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

