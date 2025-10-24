import { PrismaClient, Unit, PrintingTech, FinishCategory, FinishCalcType, MarginScope } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed completo...");

  // 1. ConfigGlobal
  console.log("📊 Configurando ConfigGlobal...");
  await prisma.configGlobal.upsert({
    where: { id: 1 },
    update: {},
    create: { 
      id: 1, 
      marginDefault: "0.30", 
      markupOperational: "0.20", 
      roundingStep: "0.05", 
      lossFactor: "0.03",
      printingHourCost: "60.00",
      vatPercent: "0.23",
      setupTimeMin: 15
    },
  });

  // 2. Categoria
  console.log("📁 Criando categoria Papelaria...");
  const categoria = await prisma.productCategory.upsert({
    where: { name: "Papelaria" },
    update: {},
    create: { name: "Papelaria", roundingStep: "0.05" },
  });

  // 3. Material base e variantes
  console.log("📄 Criando materiais e variantes...");
  const papel = await prisma.material.create({
    data: {
      name: "Papel Revestido",
      type: "papel",
      unit: Unit.SHEET,
      unitCost: "0.0400",
    }
  });

  // Criar variantes separadamente
  const variantePerola = await prisma.materialVariant.create({
    data: {
      materialId: papel.id,
      label: "Pérola 300g 66x96",
      gramagem: 300,
      widthMm: 660,
      heightMm: 960,
      sheetsPerPack: 500,
      packPrice: "20.00",
      unitPrice: "0.0400",
    }
  });

  const varianteBrilhante = await prisma.materialVariant.create({
    data: {
      materialId: papel.id,
      label: "Brilhante 300g 66x96",
      gramagem: 300,
      widthMm: 660,
      heightMm: 960,
      sheetsPerPack: 500,
      packPrice: "22.00",
      unitPrice: "0.0440",
    }
  });

  const varianteLinho = await prisma.materialVariant.create({
    data: {
      materialId: papel.id,
      label: "Linho 300g 66x96",
      gramagem: 300,
      widthMm: 660,
      heightMm: 960,
      sheetsPerPack: 500,
      packPrice: "25.00",
      unitPrice: "0.0500",
    }
  });

  // 4. Impressão
  console.log("🖨️ Criando configuração de impressão...");
  const impressao = await prisma.printing.create({
    data: {
      technology: PrintingTech.OFFSET,
      formatLabel: "SRA3",
      colors: "4x4",
      sides: 2,
      unitPrice: "0.2000",
      yield: 250,
      setupMinutes: 15,
      minFee: "15.00",
    },
  });

  // 5. Acabamentos
  console.log("✨ Criando acabamentos...");
  const laminacao = await prisma.finish.create({
    data: {
      name: "Laminação Fosca",
      category: FinishCategory.LAMINACAO,
      unit: Unit.M2,
      baseCost: "2.0000",
      marginDefault: "0.1500",
      calcType: FinishCalcType.PER_M2,
      minFee: "5.00",
      areaStepM2: "0.10",
    },
  });

  const cantos = await prisma.finish.create({
    data: {
      name: "Cantos Arredondados",
      category: FinishCategory.CORTE,
      unit: Unit.UNIT,
      baseCost: "0.0500",
      marginDefault: "0.2000",
      calcType: FinishCalcType.PER_UNIT,
      minFee: "2.00",
    },
  });

  // 6. Produto principal
  console.log("📋 Criando produto Cartões de Visita...");
  const produto = await prisma.product.create({
    data: {
      name: "Cartões de Visita 9x5",
      categoryId: categoria.id,
      printingId: impressao.id,
      widthMm: 90,
      heightMm: 50,
      marginDefault: "0.30",
      markupDefault: "0.20",
      roundingStep: "0.05",
      minOrderQty: 100,
      minOrderValue: "50.00",
      attributesSchema: { largura_mm: 90, altura_mm: 50 },
      materials: {
        create: [{
          materialId: papel.id,
          qtyPerUnit: "0.0200", // 1 folha ~50 cartões
          wasteFactor: "0.02",
        }],
      },
      finishes: {
        create: [{
          finishId: laminacao.id,
          calcTypeOverride: FinishCalcType.PER_M2,
          qtyPerUnit: "0.0045", // área em m² por cartão
        }],
      },
    },
  });

  // 7. Regras de margem
  console.log("💰 Criando regras de margem...");
  await prisma.marginRule.create({
    data: { 
      scope: MarginScope.GLOBAL, 
      margin: "0.30", 
      active: true 
    },
  });

  await prisma.marginRuleDynamic.create({
    data: {
      scope: MarginScope.PRODUCT,
      productId: produto.id,
      minSubtotal: "500.00",
      adjustPercent: "-0.0500",
      priority: 10,
      stackable: false,
      active: true,
    },
  });

  // 8. Opções do produto
  console.log("⚙️ Criando opções do produto...");
  
  // Grupo Papel
  const grupoPapel = await prisma.productOptionGroup.create({
    data: {
      productId: produto.id,
      name: "Papel",
      kind: "RADIO",
      description: "Escolha o tipo de papel",
      order: 1,
      required: true,
      choices: {
        create: [
          {
            name: "Pérola",
            description: "Papel pérola 300g",
            order: 1,
            materialVariantId: variantePerola.id,
          },
          {
            name: "Brilhante", 
            description: "Papel brilhante 300g",
            order: 2,
            materialVariantId: varianteBrilhante.id,
          },
          {
            name: "Linho",
            description: "Papel linho 300g",
            order: 3,
            materialVariantId: varianteLinho.id,
          }
        ]
      }
    }
  });

  // Grupo Tamanho
  const grupoTamanho = await prisma.productOptionGroup.create({
    data: {
      productId: produto.id,
      name: "Tamanho",
      kind: "SIZE",
      description: "Escolha o tamanho do cartão",
      order: 2,
      required: true,
      choices: {
        create: [
          {
            name: "9x5 cm",
            description: "Tamanho padrão",
            order: 1,
            overrideAttrs: { largura_mm: 90, altura_mm: 50 },
          },
          {
            name: "8.5x5.5 cm",
            description: "Tamanho americano",
            order: 2,
            overrideAttrs: { largura_mm: 85, altura_mm: 55 },
          },
          {
            name: "6.5x6.5 cm",
            description: "Tamanho quadrado",
            order: 3,
            overrideAttrs: { largura_mm: 65, altura_mm: 65 },
          }
        ]
      }
    }
  });

  // Grupo Cantos
  const grupoCantos = await prisma.productOptionGroup.create({
    data: {
      productId: produto.id,
      name: "Cantos",
      kind: "RADIO",
      description: "Escolha o acabamento dos cantos",
      order: 3,
      required: false,
      choices: {
        create: [
          {
            name: "Quadrado",
            description: "Cantos retos",
            order: 1,
          },
          {
            name: "Arredondado",
            description: "Cantos arredondados",
            order: 2,
            finishId: cantos.id,
            finishQtyPerUnit: "1.0",
          }
        ]
      }
    }
  });

  // 9. Quantidades sugeridas
  console.log("📊 Criando quantidades sugeridas...");
  await prisma.productSuggestedQuantity.createMany({
    data: [
      { productId: produto.id, quantity: 100, label: "Pequena tiragem", order: 1 },
      { productId: produto.id, quantity: 250, label: "Tiragem média", order: 2 },
      { productId: produto.id, quantity: 500, label: "Tiragem grande", order: 3 },
      { productId: produto.id, quantity: 1000, label: "Tiragem profissional", order: 4 },
      { productId: produto.id, quantity: 1500, label: "Tiragem comercial", order: 5 },
    ]
  });

  // 10. Usuário demo
  console.log("👤 Criando usuário demo...");
  await prisma.user.upsert({
    where: { email: "comercial@demo.com" },
    update: {},
    create: {
      name: "Comercial Demo",
      email: "comercial@demo.com",
      role: "COMMERCIAL"
    }
  });

  console.log("✅ Seed concluído com sucesso!");
  console.log(`📋 Produto criado: ${produto.name} (ID: ${produto.id})`);
  console.log(`📄 Material: ${papel.name} com 3 variantes`);
  console.log(`🖨️ Impressão: ${impressao.technology} ${impressao.colors}`);
  console.log(`✨ Acabamentos: ${laminacao.name}, ${cantos.name}`);
  console.log(`⚙️ Opções: 3 grupos com múltiplas escolhas`);
  console.log(`📊 Quantidades: 5 presets sugeridos`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });