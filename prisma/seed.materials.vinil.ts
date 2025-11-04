import { PrismaClient, Unit } from "@prisma/client";

import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

/**
 * Este seed:
 * - Lê o arquivo JSON extraído da aba VINIL da planilha (grande e fiel ao original).
 * - Cria/atualiza Materiais (unit = M2, unitCost = custo/m²) e Variantes (rolos por largura, com comprimento se houver).
 * - Idempotente: upsert por Material.name e find-or-create por (materialId + label).
 *
 * Como usar:
 * 1) Coloque o arquivo com os dados reais em:
 *    ./data/vinil_materials_extracted.json
 *    (ou defina VINIL_DATA_PATH para apontar para o caminho do arquivo)
 * 2) Rode: npx prisma generate && npm run seed:materials:vinil
 */

type VariantInput = {
  label: string;
  widthMm: number;
  heightMm: number;        // 0 para rolo contínuo
  sheetsPerPack: number;   // 1
  unitPrice?: string;      // geralmente vazio (preço é por m² no Material)
  packPrice?: string|null; // custo do rolo (quando existir) ou custo estimado
};

type MaterialInput = {
  name: string;
  type: string;   // "vinil"
  unit: "M2";
  unitCost: string; // Decimal em string
  active?: boolean;
  isCurrent?: boolean;
  variants: VariantInput[];
};

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
        const json = JSON.parse(raw);
        if (!Array.isArray(json)) {
          throw new Error("JSON não é um array.");
        }
        // Validação leve
        json.forEach((m, i) => {
          if (!m.name || !m.unitCost || !m.variants) {
            throw new Error(`Item inválido no índice ${i}.`);
          }
        });
        console.log(`📥 Lido VINIL de: ${p} (itens: ${json.length})`);
        return json;
      }
    } catch (e) {
      console.warn(`⚠️ Falha ao ler ${p}:`, (e as Error).message);
    }
  }

  // Fallback mínimo (apenas para não quebrar caso o arquivo não exista):
  console.warn("⚠️ VINIL_DATA_PATH/data/vinil_materials_extracted.json não encontrados. Usando amostra mínima.");
  const SAMPLE: MaterialInput[] = [
    {
      name: "Vinil Suptac S5001B Polar White Gloss",
      type: "vinil",
      unit: "M2",
      unitCost: "6.2179",
      active: true,
      isCurrent: true,
      variants: [
        { label: "Rolo 615mm x 5.0m", widthMm: 615, heightMm: 0, sheetsPerPack: 1, unitPrice: "", packPrice: "19.1200" },
      ],
    },
  ];
  return SAMPLE;
}

async function upsertMaterialWithVariants(row: MaterialInput) {
  // 1) Garante o Material por name (idempotente)
  const existingMaterial = await prisma.material.findFirst({ where: { name: row.name } });
  const material = existingMaterial
    ? await prisma.material.update({
        where: { id: existingMaterial.id },
        data: {
          type: row.type,
          unit: Unit.M2,
          unitCost: row.unitCost,
          active: row.active ?? true,
          isCurrent: row.isCurrent ?? true,
        },
      })
    : await prisma.material.create({
        data: {
          name: row.name,
          type: row.type,
          unit: Unit.M2,
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

    const data = {
      materialId: material.id,
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
      console.log(`  + Variant criada: ${v.label}`);
    } else {
      await prisma.materialVariant.update({ where: { id: existing.id }, data });
      console.log(`  ~ Variant atualizada: ${v.label}`);
    }
  }

  console.log(`✔ Material garantido: ${material.name} (id: ${material.id})`);
}

async function main() {
  console.log("🚀 Seed de Materiais – VINIL (com variantes)...");
  const DATA = loadData();
  for (const row of DATA) {
    // normalização defensiva
    row.type = "vinil";
    row.unit = "M2";
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

