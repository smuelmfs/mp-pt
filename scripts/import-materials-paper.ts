import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";

type Row = {
  supplier: string | null;
  brand: string | null;
  finish: string | null;
  grammage: number | null;
  rawGrammage: string | null;
  qtyPack: number | null;
  packPrice: string | null; // dec2
  unitPriceSheet: string;   // dec4
  notes: string | null;
};

function readRows(): Row[] {
  const p = path.join(process.cwd(), "data/normalized/materials.paper.json");
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function collapseSpaces(s: string) { return s.replace(/\s+/g, " ").trim(); }
function dec4(n: any) { return Number(Number(n ?? 0).toFixed(4)); }
function dec4s(n: any) { return (Number(n ?? 0)).toFixed(4); }

function buildName(r: Row): string {
  const brand = r.brand ?? "GENÉRICO";
  const gramToken = r.grammage != null ? String(r.grammage) : (r.rawGrammage ?? "");
  const finish = r.finish ?? "";
  let name = `${brand} ${gramToken} ${finish}`;
  name = collapseSpaces(name);
  // Normalize IOR 90 token spacing
  name = name.replace(/\bIOR\s*90\b/i, "IOR 90");
  return name;
}

function extractDims(txt: string | null | undefined): { widthMm: number | null; heightMm: number | null; label: string } {
  if (!txt) return { widthMm: null, heightMm: null, label: collapseSpaces((txt ?? "").toString()) };
  const m = String(txt).match(/(\d{2,3})\s*x\s*(\d{2,3})/i);
  if (m) {
    const w = Number(m[1]) * 10; // cm to mm if format like 64x90 -> assume cm
    const h = Number(m[2]) * 10;
    if (Number.isFinite(w) && Number.isFinite(h)) return { widthMm: w, heightMm: h, label: `${w}x${h}` };
  }
  return { widthMm: null, heightMm: null, label: collapseSpaces((txt ?? "").toString()) };
}

export async function runImportMaterialsPaper() {
  const rows = readRows();
  // Collapse by stable material name; choose lowest unit price per name
  const byName = new Map<string, Row>();
  for (const r of rows) {
    const name = buildName(r);
    const prev = byName.get(name);
    if (!prev) byName.set(name, r);
    else {
      const prevPrice = Number(prev.unitPriceSheet);
      const curPrice = Number(r.unitPriceSheet);
      if (curPrice < prevPrice) byName.set(name, r);
    }
  }
  const uniqueRows: Array<{ name: string; row: Row }> = Array.from(byName.entries()).map(([name, row]) => ({ name, row }));
  let materialsCreated = 0, materialsUpdated = 0, variantsCreated = 0, variantsUpdated = 0;

  for (const { name, row: r } of uniqueRows) {
    const existing = await prisma.material.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, type: "papel", unit: "SHEET" },
    });
    let materialId: number;
    if (!existing) {
      const created = await prisma.material.create({
        data: {
          name,
          type: "papel",
          unit: "SHEET",
          unitCost: r.unitPriceSheet,
          active: true,
          isCurrent: true,
        },
      });
      materialsCreated++;
      materialId = created.id;
    } else {
      materialId = existing.id;
      if (dec4s(existing.unitCost as any) !== r.unitPriceSheet) {
        await prisma.material.update({ where: { id: existing.id }, data: { unitCost: r.unitPriceSheet } });
        materialsUpdated++;
      }
    }

    // Variant per material: infer from notes if possible; else grammage/raw
    const dims = extractDims(r.notes);
    const vlabel = dims.label || String(r.grammage ?? r.rawGrammage ?? "");
    const existingVar = await prisma.materialVariant.findFirst({
      where: { materialId, label: { equals: vlabel, mode: "insensitive" } },
    });
    const data = {
      materialId,
      label: vlabel,
      gramagem: r.grammage ?? undefined,
      widthMm: dims.widthMm ?? undefined,
      heightMm: dims.heightMm ?? undefined,
      unitPrice: r.unitPriceSheet,
      isCurrent: true,
    } as const;

    if (!existingVar) {
      await prisma.materialVariant.create({ data: data as any });
      variantsCreated++;
    } else {
      const needUpdate = (
        (existingVar.gramagem ?? null) !== (r.grammage ?? null) ||
        (existingVar.widthMm ?? null) !== (dims.widthMm ?? null) ||
        (existingVar.heightMm ?? null) !== (dims.heightMm ?? null) ||
        dec4s(existingVar.unitPrice as any) !== r.unitPriceSheet
      );
      if (needUpdate) {
        await prisma.materialVariant.update({ where: { id: existingVar.id }, data: data as any });
        variantsUpdated++;
      }
    }
  }

  const out = { materialsCreated, materialsUpdated, variantsCreated, variantsUpdated };
  console.log(JSON.stringify(out));
  return out;
}

if (require.main === module) {
  runImportMaterialsPaper().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}


