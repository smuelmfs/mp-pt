import { PrismaClient, Unit } from "@prisma/client";

import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type VariantInput = {
  label: string;
  widthMm: number;
  heightMm?: number;
  sheetsPerPack?: number;
  unitPrice?: string;
  packPrice?: string | null;
};

type MaterialInput = {
  name: string;
  type: string;
  unit: "M2";
  unitCost: string;
  active?: boolean;
  isCurrent?: boolean;
  variants: VariantInput[];
};

function norm(s: string) {
  return s
    .replace(/\t|\n|\r/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*€\s*$/g, "")
    .trim();
}

function loadData(): MaterialInput[] {
  const fromEnv = process.env.VINIL_DATA_PATH;
  const tryPaths = [
    fromEnv && path.resolve(fromEnv),
    path.resolve(process.cwd(), "data", "vinil_materials_extracted.json"),
  ].filter(Boolean) as string[];

  for (const p of tryPaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        const json = JSON.parse(raw) as MaterialInput[];

        // normaliza nomes e de-duplica variants por (label)
        const byName = new Map<string, MaterialInput>();

        for (const m of json) {
          const name = norm(m.name);
          const key = name.toLowerCase();

          const entry = byName.get(key) ?? {
            ...m,
            name,
            type: "vinil",
            unit: "M2",
            variants: [],
          };

          const seen = new Set(entry.variants.map(v => norm(v.label)));

          for (const v of m.variants || []) {
            const label = norm(v.label);

            if (!seen.has(label)) {
              entry.variants.push({
                ...v,
                label,
                heightMm: v.heightMm ?? 0,
                sheetsPerPack: v.sheetsPerPack ?? 1,
              });
              seen.add(label);
            }
          }

          byName.set(key, entry);
        }

        const arr = Array.from(byName.values());
        console.log(`📥 VINIL lido/normalizado: ${p} (materiais: ${arr.length})`);
        return arr;
      }
    } catch (e) {
      console.warn(`⚠️ Falha ao ler ${p}:`, (e as Error).message);
    }
  }

  console.warn("⚠️ Arquivo VINIL não encontrado. Prosseguindo só com saneamento de nomes.");
  return [];
}

async function fixMaterialNames() {
  // 1) "nome colado": qualquer material que contenha ambos trechos ⇒ renomeia para o nome correto
  const merged = await prisma.material.findFirst({
    where: {
      AND: [
        { type: "vinil" },
        { name: { contains: "Suptac S5001B", mode: "insensitive" } },
        { name: { contains: "S5889B Coal Black Gloss", mode: "insensitive" } },
      ],
    },
  });

  if (merged) {
    const proper = "Vinil Suptac S5889B Coal Black Gloss";
    await prisma.material.update({ where: { id: merged.id }, data: { name: proper } });
    console.log(`🧼 Renomeado colado → "${proper}" (id ${merged.id})`);
  }

  // 2) "preço no name": remove € e números finais (qualquer Luxtac ICE)
  const luxtacList = await prisma.material.findMany({
    where: { type: "vinil", name: { contains: "Luxtac", mode: "insensitive" } },
  });

  for (const m of luxtacList) {
    const cleaned = norm(m.name);
    if (cleaned !== m.name) {
      await prisma.material.update({ where: { id: m.id }, data: { name: cleaned } });
      console.log(`🧼 Limpo sufixo preço: "${m.name}" → "${cleaned}" (id ${m.id})`);
    }
  }

  // 3) normaliza quebras de linha acidentais em todos os VINIL (ex.: "S5001B \nPolar White Gloss")
  const allVinyl = await prisma.material.findMany({ where: { type: "vinil" } });

  for (const m of allVinyl) {
    const cleaned = norm(m.name);
    if (cleaned !== m.name) {
      await prisma.material.update({ where: { id: m.id }, data: { name: cleaned } });
      console.log(`🧼 Normalizado whitespace: "${m.name}" → "${cleaned}" (id ${m.id})`);
    }
  }
}

async function ensureVinylVariantsFromJson() {
  const data = loadData();
  if (!data.length) return;

  for (const row of data) {
    const cleanedName = norm(row.name);

    const mat = await prisma.material.findFirst({
      where: { type: "vinil", name: cleanedName },
    });

    if (!mat) {
      console.warn(`❔ Não achei por name exato: ${cleanedName} — tentando por contains…`);

      const alt = await prisma.material.findFirst({
        where: {
          type: "vinil",
          AND: cleanedName
            .split(" ")
            .filter(Boolean)
            .slice(0, 3)
            .map(w => ({ name: { contains: w, mode: "insensitive" } })),
        },
      });

      if (!alt) {
        console.warn(`  → PULEI variants: ${cleanedName}`);
        continue;
      }

      await upsertVariants(alt.id, alt.name, row.variants || []);
    } else {
      await upsertVariants(mat.id, mat.name, row.variants || []);
    }
  }
}

async function upsertVariants(materialId: number, materialName: string, variants: VariantInput[]) {
  // de-dup por label normalizado
  const seen = new Set<string>();
  const uniq = variants
    .map(v => ({ ...v, label: norm(v.label), heightMm: v.heightMm ?? 0, sheetsPerPack: v.sheetsPerPack ?? 1 }))
    .filter(v => {
      const k = v.label.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  for (const v of uniq) {
    const existing = await prisma.materialVariant.findFirst({
      where: { materialId, label: v.label },
      select: { id: true },
    });

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
      console.log(`  + Variant VINIL criada: [${materialName}] ${v.label}`);
    } else {
      await prisma.materialVariant.update({ where: { id: existing.id }, data });
      console.log(`  ~ Variant VINIL atualizada: [${materialName}] ${v.label}`);
    }
  }

  console.log(`✔ Variants garantidas para: ${materialName} (id ${materialId})`);
}

async function main() {
  console.log("🔧 Saneando nomes VINIL…");
  await fixMaterialNames();

  console.log("🎛️ Garantindo VARIANTES VINIL a partir do JSON (com de-dup) …");
  await ensureVinylVariantsFromJson();

  console.log("🏁 Finalizado.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
