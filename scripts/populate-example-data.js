const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populando dados de exemplo...');

  // 1. Criar grupos de opções para o produto 1 (Cartão de Visita)
  const paperGroup = await prisma.productOptionGroup.create({
    data: {
      productId: 1,
      name: 'Papel',
      description: 'Escolha o tipo de papel',
      order: 1,
      required: true,
      active: true
    }
  });

  const sizeGroup = await prisma.productOptionGroup.create({
    data: {
      productId: 1,
      name: 'Tamanho',
      description: 'Dimensões do cartão',
      order: 2,
      required: false,
      active: true
    }
  });

  const finishGroup = await prisma.productOptionGroup.create({
    data: {
      productId: 1,
      name: 'Acabamentos',
      description: 'Acabamentos opcionais',
      order: 3,
      required: false,
      active: true
    }
  });

  // 2. Criar escolhas para o grupo Papel
  await prisma.productOptionChoice.createMany({
    data: [
      {
        groupId: paperGroup.id,
        name: 'Couché 300g',
        description: 'Papel couché 300g - qualidade padrão',
        order: 1,
        active: true
      },
      {
        groupId: paperGroup.id,
        name: 'Couché 350g',
        description: 'Papel couché 350g - mais resistente',
        order: 2,
        active: true,
        priceAdjustment: 0.05 // +5% no preço
      },
      {
        groupId: paperGroup.id,
        name: 'Offset 300g',
        description: 'Papel offset 300g - mais econômico',
        order: 3,
        active: true,
        priceAdjustment: -0.03 // -3% no preço
      }
    ]
  });

  // 3. Criar escolhas para o grupo Tamanho
  await prisma.productOptionChoice.createMany({
    data: [
      {
        groupId: sizeGroup.id,
        name: 'Padrão (90×50mm)',
        description: 'Tamanho padrão de cartão de visita',
        order: 1,
        active: true
      },
      {
        groupId: sizeGroup.id,
        name: 'Grande (100×60mm)',
        description: 'Cartão maior para mais informações',
        order: 2,
        active: true,
        widthOverride: 100,
        heightOverride: 60,
        priceAdjustment: 0.15 // +15% no preço
      },
      {
        groupId: sizeGroup.id,
        name: 'Pequeno (85×55mm)',
        description: 'Cartão compacto',
        order: 3,
        active: true,
        widthOverride: 85,
        heightOverride: 55,
        priceAdjustment: -0.10 // -10% no preço
      }
    ]
  });

  // 4. Criar escolhas para o grupo Acabamentos
  await prisma.productOptionChoice.createMany({
    data: [
      {
        groupId: finishGroup.id,
        name: 'Sem acabamento',
        description: 'Apenas impressão, sem acabamentos',
        order: 1,
        active: true
      },
      {
        groupId: finishGroup.id,
        name: 'Laminação Fosca',
        description: 'Laminação fosca para proteção',
        order: 2,
        active: true,
        finishId: 1, // Assumindo que existe um acabamento com ID 1
        finishQtyPerUnit: 1
      },
      {
        groupId: finishGroup.id,
        name: 'Laminação Brilhante',
        description: 'Laminação brilhante para destaque',
        order: 3,
        active: true,
        finishId: 1, // Mesmo acabamento, mas com preço diferente
        finishQtyPerUnit: 1,
        priceAdjustment: 0.08 // +8% no preço
      }
    ]
  });

  // 5. Criar tiragens sugeridas
  await prisma.productSuggestedQuantity.createMany({
    data: [
      {
        productId: 1,
        quantity: 100,
        label: 'Pequena tiragem',
        order: 1,
        active: true
      },
      {
        productId: 1,
        quantity: 250,
        label: 'Tiragem média',
        order: 2,
        active: true
      },
      {
        productId: 1,
        quantity: 500,
        label: 'Tiragem grande',
        order: 3,
        active: true
      },
      {
        productId: 1,
        quantity: 1000,
        label: 'Tiragem comercial',
        order: 4,
        active: true
      },
      {
        productId: 1,
        quantity: 2000,
        label: 'Tiragem industrial',
        order: 5,
        active: true
      }
    ]
  });

  // 6. Criar dados para outro produto (ex: Flyer A4)
  const flyerGroup = await prisma.productOptionGroup.create({
    data: {
      productId: 2, // Assumindo que existe um produto com ID 2
      name: 'Papel',
      description: 'Escolha o tipo de papel para o flyer',
      order: 1,
      required: true,
      active: true
    }
  });

  await prisma.productOptionChoice.createMany({
    data: [
      {
        groupId: flyerGroup.id,
        name: 'Couché 150g',
        description: 'Papel couché 150g - leve e econômico',
        order: 1,
        active: true
      },
      {
        groupId: flyerGroup.id,
        name: 'Couché 200g',
        description: 'Papel couché 200g - mais resistente',
        order: 2,
        active: true,
        priceAdjustment: 0.10 // +10% no preço
      }
    ]
  });

  await prisma.productSuggestedQuantity.createMany({
    data: [
      {
        productId: 2,
        quantity: 500,
        label: 'Tiragem pequena',
        order: 1,
        active: true
      },
      {
        productId: 2,
        quantity: 1000,
        label: 'Tiragem média',
        order: 2,
        active: true
      },
      {
        productId: 2,
        quantity: 2000,
        label: 'Tiragem grande',
        order: 3,
        active: true
      },
      {
        productId: 2,
        quantity: 5000,
        label: 'Tiragem comercial',
        order: 4,
        active: true
      }
    ]
  });

  console.log('✅ Dados de exemplo criados com sucesso!');
  console.log('📋 Grupos de opções criados para produtos 1 e 2');
  console.log('🎯 Escolhas configuradas com overrides de preço e dimensões');
  console.log('📊 Tiragens sugeridas configuradas');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao popular dados:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
