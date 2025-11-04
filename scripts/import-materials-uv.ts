import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";

type Row = {
  name: string;
  type: string; // "placa"
  unit: string; // "SHEET"
  unitCost: string; // dec4
  variant: { label: string; widthMm: number | null; heightMm: number | null };
  active: boolean;
};

function readRows(): Row[] {
  const p = path.join(process.cwd(), "data/normalized/materials.uv-substrates.json");
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function dec4(n: any) { return Number(Number(n ?? 0).toFixed(4)); }

export async function runImportMaterialsUV() {
  const rows = readRows();
  let materialsCreated = 0, materialsUpdated = 0, variantsCreated = 0, variantsUpdated = 0;

  for (const r of rows) {
    const existing = await prisma.material.findFirst({
      where: {
        name: { equals: r.name, mode: "insensitive" },
        type: "placa",
        unit: "SHEET",
      },
    });

    let materialId: number;
    if (!existing) {
      const created = await prisma.material.create({
        data: {
          name: r.name,
          type: "placa",
          unit: "SHEET",
          unitCost: r.unitCost,
          active: r.active,
          isCurrent: true,
        },
      });
      materialId = created.id;
      materialsCreated++;
    } else {
      materialId = existing.id;
      if (dec4(existing.unitCost as any) !== dec4(r.unitCost)) {
        await prisma.material.update({ where: { id: existing.id }, data: { unitCost: r.unitCost } });
        materialsUpdated++;
      }
    }

    // Upsert variant by (materialId, label insensitive)
    const existingVar = await prisma.materialVariant.findFirst({
      where: {
        materialId,
        label: { equals: r.variant.label, mode: "insensitive" },
      },
    });

    const variantData = {
      materialId,
      label: r.variant.label,
      widthMm: r.variant.widthMm ?? undefined,
      heightMm: r.variant.heightMm ?? undefined,
      unitPrice: r.unitCost, // convention: same as material cost
      isCurrent: true,
    } as const;

    if (!existingVar) {
      await prisma.materialVariant.create({ data: variantData as any });
      variantsCreated++;
    } else {
      const needUpdate = (
        (existingVar.widthMm ?? null) !== (r.variant.widthMm ?? null) ||
        (existingVar.heightMm ?? null) !== (r.variant.heightMm ?? null) ||
        dec4(existingVar.unitPrice as any) !== dec4(r.unitCost)
      );
      if (needUpdate) {
        await prisma.materialVariant.update({ where: { id: existingVar.id }, data: variantData as any });
        variantsUpdated++;
      }
    }
  }

  const out = { materialsCreated, materialsUpdated, variantsCreated, variantsUpdated };
  console.log(JSON.stringify(out));
  return out;
}

if (require.main === module) {
  runImportMaterialsUV().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}


