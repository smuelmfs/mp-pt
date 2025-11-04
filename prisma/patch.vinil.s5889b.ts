// prisma/patch.vinil.s5889b.ts

import { PrismaClient } from "@prisma/client";

import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

function norm(s: string) {
  return s.replace(/\t|\n|\r/g, " ").replace(/\s{2,}/g, " ").replace(/\s*€\s*$/g, "").trim();
}

function loadData() {
  const p = process.env.VINIL_DATA_PATH || path.resolve(process.cwd(), "data", "vinil_materials_extracted.json");
  const raw = fs.readFileSync(p, "utf-8");
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr)) throw new Error("JSON não é array");
  return arr.map((m: any) => ({ ...m, name: norm(m.name), variants: (m.variants||[]).map((v:any)=>({ ...v, label: norm(v.label) })) }));
}

async function upsertVariants(materialId: number, materialName: string, variants: any[]) {
  const seen = new Set<string>();

  for (const v of variants) {
    if (!v?.label) continue;

    const k = v.label.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);

    const existing = await prisma.materialVariant.findFirst({ where: { materialId, label: v.label }, select: { id: true } });

    const data = {
      materialId,
      label: v.label,
      widthMm: v.widthMm,
      heightMm: v.heightMm ?? 0,
      sheetsPerPack: v.sheetsPerPack ?? 1,
      ...(v.packPrice ? { packPrice: v.packPrice } : { packPrice: null }),
      ...(v.unitPrice ? { unitPrice: v.unitPrice } : {}),
      isCurrent: true,
    } as const;

    if (!existing) {
      await prisma.materialVariant.create({ data });
      console.log(`  + Variant criada: [${materialName}] ${v.label}`);
    } else {
      await prisma.materialVariant.update({ where: { id: existing.id }, data });
      console.log(`  ~ Variant atualizada: [${materialName}] ${v.label}`);
    }
  }

  console.log(`✔ Variants garantidas para: ${materialName} (id ${materialId})`);
}

async function main() {
  // 1) Renomeia o material problemático (id 9) para o nome correto
  const targetId = 9; // conforme seu dump anterior
  const properName = "Vinil Suptac S5889B Coal Black Gloss";

  const mat = await prisma.material.findUnique({ where: { id: targetId } });
  if (!mat) throw new Error("Material id 9 não encontrado.");

  if (mat.name !== properName) {
    await prisma.material.update({ where: { id: targetId }, data: { name: properName } });
    console.log(`🧼 Renomeado id ${targetId}: "${mat.name}" → "${properName}"`);
  } else {
    console.log(`ℹ️ Nome já ok para id ${targetId}: "${properName}"`);
  }

  // 2) Carrega o JSON e localiza o bloco do S5889B
  const DATA = loadData();
  const row = DATA.find((m:any) => m.name.toLowerCase().includes("s5889b") && m.name.toLowerCase().includes("coal black gloss"));

  if (!row) {
    throw new Error("Não encontrei S5889B no JSON (verifique vinil_materials_extracted.json).");
  }

  // 3) Garante as variantes corretas para o id 9
  await upsertVariants(targetId, properName, row.variants || []);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });

