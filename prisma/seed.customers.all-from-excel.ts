import { PrismaClient } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Seed para extrair e adicionar TODOS os clientes de TODAS as abas do Excel
 */

function extractAllCustomersFromExcel(): Set<string> {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const customers = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: null,
      raw: false 
    }) as any[][];

    // Procura por coluna "CLIENTE" em qualquer linha
    let headerRow = -1;
    let clienteCol = -1;
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').toUpperCase().trim();
        if (cell === 'CLIENTE' || cell === 'CUSTOMER') {
          headerRow = i;
          clienteCol = j;
          break;
        }
      }
      if (headerRow !== -1) break;
    }

    if (headerRow !== -1 && clienteCol !== -1) {
      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[clienteCol]) continue;
        
        const cliente = String(row[clienteCol]).trim();
        if (cliente && cliente !== 'CLIENTE' && cliente !== '' && cliente.length > 1) {
          customers.add(cliente);
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
      return { id: existing.id, action: 'activated' };
    }
    return { id: existing.id, action: 'exists' };
  } else {
    const created = await prisma.customer.create({
      data: { name, isActive: true },
    });
    return { id: created.id, action: 'created' };
  }
}

async function main() {
  console.log('🚀 Seed — TODOS os Clientes do Excel (Todas as Abas)\n');
  console.log('='.repeat(120));

  try {
    const excelCustomers = extractAllCustomersFromExcel();
    console.log(`📊 Excel: ${excelCustomers.size} clientes únicos encontrados\n`);

    let created = 0;
    let updated = 0;
    let existing = 0;

    for (const customerName of excelCustomers) {
      const result = await upsertCustomer(customerName);
      
      if (result.action === 'created') {
        console.log(`  + Criado: ${customerName} (id ${result.id})`);
        created++;
      } else if (result.action === 'activated') {
        console.log(`  ~ Ativado: ${customerName} (id ${result.id})`);
        updated++;
      } else {
        console.log(`  ✓ Já existe: ${customerName} (id ${result.id})`);
        existing++;
      }
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n📊 RESUMO:');
    console.log(`  ✅ Criados: ${created}`);
    console.log(`  ✅ Atualizados: ${updated}`);
    console.log(`  ✓ Já existiam: ${existing}`);
    console.log(`  📋 Total: ${excelCustomers.size}\n`);

    // Lista todos os clientes ativos
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

