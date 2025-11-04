import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Observações importantes:
 * - Material.unit = M2 (conforme CUSTO M/2 da planilha)
 * - unitCost, unitPrice e packPrice enviados como string para preservar precisão decimal
 * - packPrice só reflete custo de MATERIAL (quando a planilha somava impressão/min fee, usamos o valor de material)
 * - Script idempotente: upsert por name (Material) e find-or-create por (materialId + label) nas Variants
 */

type VariantInput = {
  label: string;
  widthMm: number;
  heightMm: number;
  sheetsPerPack: number;
  unitPrice: string; // Decimal
  packPrice?: string | null; // Decimal
};

type MaterialInput = {
  name: string;
  type: string;
  unit: Unit;
  unitCost: string; // Decimal
  active?: boolean;
  isCurrent?: boolean;
  variants: VariantInput[];
};

const DATA: MaterialInput[] = [
  {
    name: "Alveolar Dipac 5mm – chapa 2000×2000",
    type: "alveolar",
    unit: Unit.M2,
    unitCost: "4.09",
    active: true,
    isCurrent: true,
    variants: [
      { label: "Placa 1.20×0.90 m (5mm)", widthMm: 1200, heightMm: 900, sheetsPerPack: 1, unitPrice: "4.42", packPrice: "4.41" },
      { label: "Placa 1.00×0.54 m (5mm)", widthMm: 1000, heightMm: 540, sheetsPerPack: 1, unitPrice: "2.21", packPrice: "2.21" },
      { label: "Placa 0.90×0.60 m (5mm)", widthMm: 900, heightMm: 600, sheetsPerPack: 1, unitPrice: "2.21", packPrice: "2.21" },
      { label: "Placa 0.50×0.38 m (5mm)", widthMm: 500, heightMm: 380, sheetsPerPack: 1, unitPrice: "0.78", packPrice: "0.78" },
    ],
  },
  {
    name: "Alveolar Dipac 5mm – chapa 2500×2000",
    type: "alveolar",
    unit: Unit.M2,
    unitCost: "4.08",
    active: true,
    isCurrent: true,
    variants: [
      { label: "Placa 1.20×0.70 m (5mm)", widthMm: 1200, heightMm: 700, sheetsPerPack: 1, unitPrice: "3.43", packPrice: "3.43" },
    ],
  },
  {
    name: "Dipac High Perform 3.5mm – chapa 3040×2020",
    type: "alveolar",
    unit: Unit.M2,
    unitCost: "2.66",
    active: true,
    isCurrent: true,
    variants: [
      { label: "Placa 1.50×1.00 m (3.5mm)", widthMm: 1500, heightMm: 1000, sheetsPerPack: 1, unitPrice: "3.99", packPrice: "3.99" },
      { label: "Placa 1.15×0.65 m (3.5mm)", widthMm: 1150, heightMm: 650, sheetsPerPack: 1, unitPrice: "1.99", packPrice: "1.99" },
      { label: "Placa 0.60×0.85 m (3.5mm)", widthMm: 600, heightMm: 850, sheetsPerPack: 1, unitPrice: "1.36", packPrice: "1.36" },
    ],
  },
  {
    name: "Foam Light 5mm – chapa 3050×2050",
    type: "alveolar",
    unit: Unit.M2,
    unitCost: "10.43",
    active: true,
    isCurrent: true,
    variants: [
      { label: "Placa 1.50×1.00 m (5mm)", widthMm: 1500, heightMm: 1000, sheetsPerPack: 1, unitPrice: "15.65", packPrice: "15.65" },
      { label: "Placa 1.15×0.65 m (5mm)", widthMm: 1150, heightMm: 650, sheetsPerPack: 1, unitPrice: "7.80", packPrice: "7.80" },
      { label: "Placa 0.60×0.85 m (5mm)", widthMm: 600, heightMm: 850, sheetsPerPack: 1, unitPrice: "5.32", packPrice: "5.32" },
    ],
  },
  {
    name: "Foam Light 4mm – chapa 3050×2050",
    type: "alveolar",
    unit: Unit.M2,
    unitCost: "8.93",
    active: true,
    isCurrent: true,
    variants: [
      // IMPORTANTE: usar apenas custo de MATERIAL (planilha tem linha com impressão/min fee somada; ignorar no material)
      { label: "Placa 2.40×1.00 m (4mm)", widthMm: 2400, heightMm: 1000, sheetsPerPack: 1, unitPrice: "21.43", packPrice: "21.43" },
    ],
  },
  {
    name: "ACM 3mm – chapa 1500×1000",
    type: "alveolar",
    unit: Unit.M2,
    unitCost: "23.71",
    active: true,
    isCurrent: true,
    variants: [
      { label: "Placa 0.40×0.60 m (3mm)", widthMm: 400, heightMm: 600, sheetsPerPack: 1, unitPrice: "5.69", packPrice: "5.69" },
    ],
  },
];

async function upsertMaterialWithVariants(row: MaterialInput) {
  // 1) Garante o Material por name (idempotente)
  const existingMaterial = await prisma.material.findFirst({ where: { name: row.name } });
  const material = existingMaterial
    ? await prisma.material.update({
        where: { id: existingMaterial.id },
        data: {
          type: row.type,
          unit: row.unit,
          unitCost: row.unitCost,
          active: row.active ?? true,
          isCurrent: row.isCurrent ?? true,
        },
      })
    : await prisma.material.create({
        data: {
          name: row.name,
          type: row.type,
          unit: row.unit,
          unitCost: row.unitCost,
          active: row.active ?? true,
          isCurrent: row.isCurrent ?? true,
        },
      });

  // 2) Garante cada Variant por (materialId + label)
  for (const v of row.variants) {
    const existing = await prisma.materialVariant.findFirst({
      where: { materialId: material.id, label: v.label },
      select: { id: true },
    });

    if (!existing) {
      await prisma.materialVariant.create({
        data: {
          materialId: material.id,
          label: v.label,
          widthMm: v.widthMm,
          heightMm: v.heightMm,
          sheetsPerPack: v.sheetsPerPack,
          // se packPrice vier undefined, não envia (campos opcionais)
          ...(v.packPrice ? { packPrice: v.packPrice } : {}),
          ...(v.unitPrice ? { unitPrice: v.unitPrice } : {}),
          isCurrent: true,
        },
      });
      console.log(`  + Variant criada: ${v.label}`);
    } else {
      await prisma.materialVariant.update({
        where: { id: existing.id },
        data: {
          label: v.label,
          widthMm: v.widthMm,
          heightMm: v.heightMm,
          sheetsPerPack: v.sheetsPerPack,
          ...(v.packPrice ? { packPrice: v.packPrice } : { packPrice: null }),
          ...(v.unitPrice ? { unitPrice: v.unitPrice } : {}),
          isCurrent: true,
        },
      });
      console.log(`  ~ Variant atualizada: ${v.label}`);
    }
  }

  console.log(`✔ Material garantido: ${material.name} (id: ${material.id})`);
}

async function main() {
  console.log("🚀 Seed de Materiais – ALVEOLAR (com variantes)...");
  for (const row of DATA) {
    await upsertMaterialWithVariants(row);
  }
  console.log("🏁 Concluído.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });


