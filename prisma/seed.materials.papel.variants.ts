import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Observação:
 * Onde a planilha não trouxe formato (mm), deixamos width/height nulos.
 * Você pode complementar dimensões depois no Admin se quiser usar imposição.
 */

type V = {
  material: string;
  label: string;
  gramagem: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  sheetsPerPack: number | null;
  packPrice: number | null;
  unitPrice: number | null; // €/folha (opcional)
};

const VARIANTS: V[] = [
  { material: "Papel Condat Gloss 150g", label: "Condat Gloss 150g", gramagem: 150, sheetsPerPack: 20000, packPrice: 1212.40, unitPrice: 0.0600 },
  { material: "Papel Condat Gloss 170g", label: "Condat Gloss 170g", gramagem: 170, sheetsPerPack: 500,   packPrice: 36.33,   unitPrice: 0.0730 },
  { material: "Papel Condat Gloss 250g", label: "Condat Gloss 250g", gramagem: 250, sheetsPerPack: 1000,  packPrice: 94.58,   unitPrice: 0.0946 },
  { material: "Papel Condat Silk 300g",  label: "Condat Silk 300g",  gramagem: 300, sheetsPerPack: 500,   packPrice: 30.00,   unitPrice: 0.0600 },
  { material: "Papel Condat Silk 350g",  label: "Condat Silk 350g",  gramagem: 350, sheetsPerPack: 1000,  packPrice: 135.50,  unitPrice: 0.1355 },
  { material: "Papel Gloss 400g",        label: "Gloss 400g",        gramagem: 400, sheetsPerPack: 125,   packPrice: 17.91,   unitPrice: 0.1433 },

  { material: "Papel IOR 90g",           label: "IOR 90g",           gramagem: 90,  sheetsPerPack: 500,   packPrice: 28.55,   unitPrice: 0.0571 },
  { material: "Papel IOR 90g",           label: "IOR 90g (64x90 cortado)", gramagem: 90, sheetsPerPack: 500, packPrice: 13.75, unitPrice: 0.0275 },

  { material: "Papel Multiloft Adesivo 1 Face Branco",          label: "Multiloft Adesivo 1 Face Branco",          gramagem: null, sheetsPerPack: 100, packPrice: 66.96, unitPrice: 0.6696 },
  { material: "Papel Multiloft Adesivo 2 Faces Verde Turquesa", label: "Multiloft Adesivo 2 Faces Verde Turquesa", gramagem: null, sheetsPerPack: 80,  packPrice: 74.71, unitPrice: 0.9339 },

  { material: "Papel Digilabel Com Cortes Silk Autocolante", label: "Digilabel Com Cortes Silk Autocolante", gramagem: null, sheetsPerPack: 1000, packPrice: 380.00, unitPrice: 0.3800 },
  { material: "Papel Jac-Datapol White Gloss 32x45",         label: "Jac-Datapol White Gloss 32x45",         gramagem: null, sheetsPerPack: 100,  packPrice: 76.00,  unitPrice: 0.7600 },
  { material: "Papel Polylaser Branco Brilho",                label: "Polylaser Branco Brilho",                gramagem: null, sheetsPerPack: 200,  packPrice: 156.60, unitPrice: 0.7830 },
  { material: "Papel Novatech Digital Silk 350g",            label: "Novatech Digital Silk 350g",            gramagem: 350,  sheetsPerPack: 375,  packPrice: 58.08,  unitPrice: 0.1549 },
  { material: "Papel Invercote Creato 350g",                 label: "Invercote Creato 350g",                 gramagem: 350,  sheetsPerPack: 200,  packPrice: 87.37,  unitPrice: 0.4369 },
];

async function upsertVariant(materialId: number, v: V) {
  const exists = await prisma.materialVariant.findFirst({
    where: { materialId, label: { equals: v.label, mode: "insensitive" }, isCurrent: true },
    select: { id: true },
  });

  if (!exists) {
    const created = await prisma.materialVariant.create({
      data: {
        materialId,
        label: v.label,
        gramagem: v.gramagem ?? null,
        widthMm: v.widthMm ?? null,
        heightMm: v.heightMm ?? null,
        sheetsPerPack: v.sheetsPerPack ?? null,
        packPrice: v.packPrice ?? null,
        unitPrice: v.unitPrice ?? null,
        isCurrent: true,
      },
    });
    console.log(`  + Variant criada: ${v.label} (id ${created.id})`);
  } else {
    await prisma.materialVariant.update({
      where: { id: exists.id },
      data: {
        gramagem: v.gramagem ?? null,
        widthMm: v.widthMm ?? null,
        heightMm: v.heightMm ?? null,
        sheetsPerPack: v.sheetsPerPack ?? null,
        packPrice: v.packPrice ?? null,
        unitPrice: v.unitPrice ?? null,
        isCurrent: true,
      },
    });
    console.log(`  ~ Variant atualizada: ${v.label} (id ${exists.id})`);
  }
}

async function main() {
  console.log("🎛️ Seed — Variantes de PAPEL");
  for (const v of VARIANTS) {
    const mat = await prisma.material.findFirst({ where: { name: { equals: v.material, mode: "insensitive" } }, select: { id: true, name: true } });
    if (!mat) { console.warn(`❔ Material não encontrado: ${v.material}`); continue; }
    await upsertVariant(mat.id, v);
  }
  console.log("🏁 Concluído.");
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);prisma.$disconnect()});
