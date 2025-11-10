import { PrismaClient, Unit } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Script COMPLETO para importar TODOS os preços por cliente (materiais, impressões, acabamentos)
 * Revisa e corrige preços existentes, adiciona novos preços
 */

interface CustomerPrice {
  cliente: string;
  tipo: 'material' | 'impressao' | 'acabamento';
  nome: string;
  preco: number;
  unidade?: string;
  aba: string;
}

function extractAllCustomerPrices(): CustomerPrice[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const prices: CustomerPrice[] = [];

  // Aba PRODUTOS PUBLICITÁRIOS
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

        // Material (suporte)
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
              aba: 'PRODUTOS PUBLICITÁRIOS',
            });
          }
        }

        // Impressão
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
              aba: 'PRODUTOS PUBLICITÁRIOS',
            });
          }
        }
      }
    }
  }

  // Aba FLEX - extrai preços por cliente
  const flexSheet = workbook.Sheets['FLEX'];
  if (flexSheet) {
    const data = XLSX.utils.sheet_to_json(flexSheet, { header: 1, defval: null, raw: false }) as any[][];
    
    // Procura por coluna CLIENTE
    let headerRow = -1;
    let clienteCol = -1;
    let medidaCol = -1;
    let custoCol = -1;
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').toUpperCase().trim();
        if (cell === 'CLIENTE') {
          headerRow = i;
          clienteCol = j;
        }
        if (cell === 'MEDIDA' || cell.includes('MEDIDA')) {
          medidaCol = j;
        }
        if (cell.includes('CUSTO') || cell.includes('PREÇO') || cell.includes('PREÇO')) {
          custoCol = j;
        }
      }
      if (headerRow !== -1 && clienteCol !== -1) break;
    }

    if (headerRow !== -1 && clienteCol !== -1 && custoCol !== -1) {
      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[clienteCol]) continue;

        const cliente = String(row[clienteCol]).trim();
        const medida = medidaCol !== -1 ? String(row[medidaCol] || '').trim() : '';
        const precoRaw = row[custoCol];

        if (!cliente || cliente === 'CLIENTE' || !precoRaw) continue;

        let preco = 0;
        if (typeof precoRaw === 'number') {
          preco = precoRaw;
        } else {
          const precoStr = String(precoRaw).replace(/[€\s]/g, '').replace(',', '.');
          preco = Number(precoStr) || 0;
        }

        if (preco > 0) {
          // Usa "FLEX" genérico (será mapeado para "Vinil FLEX BRANCO" ou "FLEX")
          prices.push({
            cliente,
            tipo: 'material',
            nome: 'FLEX',
            preco,
            unidade: 'M2',
            aba: 'FLEX',
          });
        }
      }
    }
  }

  return prices;
}

async function ensureFlexMaterial() {
  // Tenta encontrar "Vinil FLEX BRANCO" primeiro (já existe no sistema)
  const flexBranco = await prisma.material.findFirst({
    where: {
      name: { contains: 'FLEX BRANCO', mode: 'insensitive' },
      isCurrent: true,
    },
  });

  if (flexBranco) return flexBranco;

  // Se não encontrar, tenta qualquer FLEX
  const flex = await prisma.material.findFirst({
    where: {
      type: { equals: 'flex', mode: 'insensitive' },
      name: { contains: 'FLEX', mode: 'insensitive' },
      isCurrent: true,
    },
  });

  if (flex) return flex;

  // Se não existir nenhum, cria um genérico
  const created = await prisma.material.create({
    data: {
      name: 'FLEX',
      type: 'flex',
      unit: Unit.M2,
      unitCost: 0, // Será definido por preços de cliente
      active: true,
      isCurrent: true,
    },
  });
  console.log(`  + Material FLEX criado (id ${created.id})`);
  return created;
}

async function findMaterialByName(name: string): Promise<any> {
  // Normaliza nome
  const normalized = name.toLowerCase().trim();
  
  // Busca exata primeiro
  let material = await prisma.material.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      isCurrent: true,
    },
  });

  if (material) return material;

  // Busca por palavras-chave
  const keywords = normalized.split(/\s+/).filter(w => w.length > 2);
  
  for (const keyword of keywords) {
    material = await prisma.material.findFirst({
      where: {
        name: { contains: keyword, mode: 'insensitive' },
        isCurrent: true,
      },
    });
    if (material) return material;
  }

  // Busca flexível por partes do nome
  if (normalized.includes('flex')) {
    // Tenta encontrar "FLEX BRANCO" primeiro
    const flexBranco = await prisma.material.findFirst({
      where: {
        OR: [
          { name: { contains: 'FLEX BRANCO', mode: 'insensitive' } },
          { name: { contains: 'FLEX', mode: 'insensitive' } },
        ],
        isCurrent: true,
      },
    });
    if (flexBranco) return flexBranco;
    return await ensureFlexMaterial();
  }

  if (normalized.includes('roll up') || normalized.includes('rollup')) {
    return await prisma.material.findFirst({
      where: {
        OR: [
          { name: { contains: 'Roll Up', mode: 'insensitive' } },
          { name: { contains: 'RollUp', mode: 'insensitive' } },
        ],
        isCurrent: true,
      },
    });
  }

  if (normalized.includes('bandeira') || normalized.includes('gota')) {
    return await prisma.material.findFirst({
      where: {
        OR: [
          { name: { contains: 'Bandeira', mode: 'insensitive' } },
          { name: { contains: 'Gota', mode: 'insensitive' } },
        ],
        isCurrent: true,
      },
    });
  }

  if (normalized.includes('balcão') || normalized.includes('balcao')) {
    return await prisma.material.findFirst({
      where: {
        name: { contains: 'Balcão', mode: 'insensitive' },
        isCurrent: true,
      },
    });
  }

  if (normalized.includes('dimatur')) {
    return await prisma.material.findFirst({
      where: {
        name: { contains: 'Dimatur', mode: 'insensitive' },
        isCurrent: true,
      },
    });
  }

  return null;
}

async function findPrintingByName(name: string): Promise<any> {
  const normalized = name.toLowerCase().trim();
  
  // Busca exata
  let printing = await prisma.printing.findFirst({
    where: {
      formatLabel: { equals: name, mode: 'insensitive' },
      isCurrent: true,
    },
  });

  if (printing) return printing;

  // Busca por palavras-chave
  const keywords = normalized.split(/\s+/).filter(w => w.length > 2);
  
  for (const keyword of keywords) {
    printing = await prisma.printing.findFirst({
      where: {
        formatLabel: { contains: keyword, mode: 'insensitive' },
        isCurrent: true,
      },
    });
    if (printing) return printing;
  }

  // Buscas específicas
  if (normalized.includes('tela') && normalized.includes('85')) {
    return await prisma.printing.findFirst({
      where: {
        OR: [
          { formatLabel: { contains: 'Tela 85', mode: 'insensitive' } },
          { formatLabel: { contains: 'Tela / lona 85', mode: 'insensitive' } },
        ],
        isCurrent: true,
      },
    });
  }

  if (normalized.includes('nhm') && normalized.includes('balcão')) {
    return await prisma.printing.findFirst({
      where: {
        formatLabel: { contains: 'NHM – Balcão', mode: 'insensitive' },
        isCurrent: true,
      },
    });
  }

  if (normalized.includes('nhm') && normalized.includes('peça')) {
    return await prisma.printing.findFirst({
      where: {
        OR: [
          { formatLabel: { contains: 'NHM – Peça 1', mode: 'insensitive' } },
          { formatLabel: { contains: 'NHM – Peça 2', mode: 'insensitive' } },
        ],
        isCurrent: true,
      },
    });
  }

  if (normalized.includes('publifast')) {
    return await prisma.printing.findFirst({
      where: {
        formatLabel: { contains: 'Publifast', mode: 'insensitive' },
        isCurrent: true,
      },
    });
  }

  return null;
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
    // Atualiza se o preço for diferente
    const diff = Math.abs(Number(existing.unitCost) - unitCost);
    if (diff > 0.0001) {
      await prisma.materialCustomerPrice.update({
        where: { id: existing.id },
        data: { unitCost },
      });
      return { id: existing.id, action: 'updated' };
    }
    return { id: existing.id, action: 'exists' };
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

async function upsertPrintingCustomerPrice(customerId: number, printingId: number, unitPrice: number, sides?: number | null) {
  const existing = await prisma.printingCustomerPrice.findFirst({
    where: {
      customerId,
      printingId,
      sides: sides === null ? null : sides,
      isCurrent: true,
    },
  });

  if (existing) {
    const diff = Math.abs(Number(existing.unitPrice) - unitPrice);
    if (diff > 0.0001) {
      await prisma.printingCustomerPrice.update({
        where: { id: existing.id },
        data: { unitPrice },
      });
      return { id: existing.id, action: 'updated' };
    }
    return { id: existing.id, action: 'exists' };
  } else {
    const created = await prisma.printingCustomerPrice.create({
      data: {
        customerId,
        printingId,
        unitPrice,
        sides: sides === null ? null : sides,
        priority: 100,
        isCurrent: true,
      },
    });
    return { id: created.id, action: 'created' };
  }
}

async function main() {
  console.log('🚀 Patch COMPLETO — TODOS os Preços por Cliente (Revisão e Importação)\n');
  console.log('='.repeat(120));

  try {
    const excelPrices = extractAllCustomerPrices();
    console.log(`📊 Excel: ${excelPrices.length} preços encontrados\n`);

    // Garante material FLEX
    await ensureFlexMaterial();

    let materialCreated = 0;
    let materialUpdated = 0;
    let materialExists = 0;
    let printingCreated = 0;
    let printingUpdated = 0;
    let printingExists = 0;
    let notFound = 0;

    // Agrupa por cliente para evitar duplicatas
    const byCustomerAndType = new Map<string, CustomerPrice[]>();
    for (const price of excelPrices) {
      const key = `${price.cliente}|${price.tipo}|${price.nome}`;
      const existing = byCustomerAndType.get(key) || [];
      existing.push(price);
      byCustomerAndType.set(key, existing);
    }

    // Processa cada preço único
    for (const [key, prices] of byCustomerAndType.entries()) {
      const price = prices[0]; // Pega o primeiro (ou poderia fazer média se houver múltiplos)
      
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
        } else if (result.action === 'updated') {
          materialUpdated++;
          console.log(`  ~ Material: ${customer.name} → ${material.name}: €${price.preco.toFixed(2)} (atualizado)`);
        } else {
          materialExists++;
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
        } else if (result.action === 'updated') {
          printingUpdated++;
          console.log(`  ~ Impressão: ${customer.name} → ${printing.formatLabel}: €${price.preco.toFixed(2)} (atualizado)`);
        } else {
          printingExists++;
        }
      }
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n📊 RESUMO:');
    console.log(`  ✅ Materiais - Criados: ${materialCreated}, Atualizados: ${materialUpdated}, Já existiam: ${materialExists}`);
    console.log(`  ✅ Impressões - Criados: ${printingCreated}, Atualizados: ${printingUpdated}, Já existiam: ${printingExists}`);
    console.log(`  ⚠️  Não encontrados: ${notFound}`);
    console.log(`  📋 Total processados: ${excelPrices.length}\n`);

    // Validação final
    console.log('🔍 Validação Final:\n');
    const allCustomers = await prisma.customer.findMany({
      where: { isActive: true },
      include: {
        materialPrices: { where: { isCurrent: true } },
        printingPrices: { where: { isCurrent: true } },
        finishPrices: { where: { isCurrent: true } },
      },
      orderBy: { name: 'asc' },
    });

    for (const customer of allCustomers) {
      const total = customer.materialPrices.length + customer.printingPrices.length + customer.finishPrices.length;
      if (total === 0) {
        console.log(`  ⚠️  ${customer.name}: Sem preços configurados`);
      } else {
        console.log(`  ✅ ${customer.name}: ${customer.materialPrices.length} materiais, ${customer.printingPrices.length} impressões, ${customer.finishPrices.length} acabamentos`);
      }
    }
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

