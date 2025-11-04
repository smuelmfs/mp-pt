import { PrismaClient, Unit } from "@prisma/client";

import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type VariantInput = {
  label: string;
  widthMm: number;
  heightMm: number;
  sheetsPerPack?: number;
  unitPrice?: string;
  packPrice?: string | null;
};

type MaterialInput = {
  name: string;
  type: string;     // "rigido" | "pvc" | "ps" | "acrilico" | ...
  unit: "M2";
  unitCost: string; // decimal string
  active?: boolean;
  isCurrent?: boolean;
  variants: VariantInput[];
};

function norm(s: string) {
  return s.replace(/\t|\n|\r/g, " ").replace(/\s{2,}/g, " ").trim();
}

function loadData(): MaterialInput[] {
  const fromEnv = process.env.RIGIDOS_DATA_PATH;
  const tryPaths = [
    fromEnv && path.resolve(fromEnv),
    path.resolve(process.cwd(), "data", "rigidos_materials_extracted.json"),
  ].filter(Boolean) as string[];

  for (const p of tryPaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        const json = JSON.parse(raw);
        if (!Array.isArray(json)) throw new Error("JSON não é um array.");

        // normaliza e de-dup por (name,label)
        const map = new Map<string, MaterialInput>();

        for (const m of json as MaterialInput[]) {
          const name = norm(m.name);
          const key = name.toLowerCase();

          const base = map.get(key) ?? {
            ...m,
            name,
            type: (m.type || "rigido"),
            unit: "M2",
            variants: [],
          };

          const seen = new Set(base.variants.map(v => norm(v.label).toLowerCase()));

          for (const v of m.variants || []) {
            const label = norm(v.label);
            const k = label.toLowerCase();

            if (!seen.has(k)) {
              base.variants.push({
                ...v,
                label,
                sheetsPerPack: v.sheetsPerPack ?? 1,
              });
              seen.add(k);
            }
          }

          map.set(key, base);
        }

        const arr = Array.from(map.values());
        console.log(`📥 Lidos rígidos: ${p} (materiais: ${arr.length})`);
        return arr;
      }
    } catch (e) {
      console.warn(`⚠️ Falha ao ler ${p}:`, (e as Error).message);
    }
  }

  throw new Error("Arquivo data/rigidos_materials_extracted.json não encontrado.");
}

async function upsertMaterialWithVariants(row: MaterialInput) {
  // Ajuste: find-first + update/create pois name não é único no schema
  const existingMaterial = await prisma.material.findFirst({ where: { name: row.name } });
  const material = existingMaterial
    ? await prisma.material.update({
        where: { id: existingMaterial.id },
        data: {
          type: (row.type || "rigido"),
          unit: Unit.M2,
          unitCost: row.unitCost,
          active: row.active ?? true,
          isCurrent: row.isCurrent ?? true,
        },
      })
    : await prisma.material.create({
        data: {
          name: row.name,
          type: (row.type || "rigido"),
          unit: Unit.M2,
          unitCost: row.unitCost,
          active: row.active ?? true,
          isCurrent: row.isCurrent ?? true,
        },
      });

  for (const v of row.variants || []) {
    const existing = await prisma.materialVariant.findFirst({
      where: { materialId: material.id, label: v.label },
      select: { id: true },
    });

    const data = {
      materialId: material.id,
      label: v.label,
      widthMm: v.widthMm,
      heightMm: v.heightMm,
      sheetsPerPack: v.sheetsPerPack ?? 1,
      ...(v.packPrice ? { packPrice: v.packPrice } : { packPrice: null }),
      ...(v.unitPrice ? { unitPrice: v.unitPrice } : {}),
      isCurrent: true,
    } as const;

    if (!existing) {
      await prisma.materialVariant.create({ data });
      console.log(`  + Variant criada: [${material.name}] ${v.label}`);
    } else {
      await prisma.materialVariant.update({ where: { id: existing.id }, data });
      console.log(`  ~ Variant atualizada: [${material.name}] ${v.label}`);
    }
  }

  console.log(`✔ Material garantido: ${material.name} (id: ${material.id})`);
}

async function main() {
  console.log("🚀 Seed de Materiais – Rígidos (FOAM/ACM e afins) …");
  const DATA = loadData();
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

