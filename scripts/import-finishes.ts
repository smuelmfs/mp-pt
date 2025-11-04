import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";

type Row = {
  name: string;
  category: "LAMINACAO"|"VERNIZ"|"CORTE"|"DOBRA"|"OUTROS";
  unit: "UNIT"|"M2"|"LOT"|"HOUR";
  calcType: "PER_UNIT"|"PER_M2"|"PER_LOT"|"PER_HOUR";
  baseCost: string;
  minFee?: string | null;
  areaStepM2?: string | null;
  minPerPiece?: string | null;
  lossFactor?: string | null;
  active: boolean;
};

function readRows(): Row[] {
  const p = path.join(process.cwd(), "data/normalized/finishes.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function dec4s(n: any) { return (Number(n ?? 0)).toFixed(4); }
function dec2s(n: any) { return (Number(n ?? 0)).toFixed(2); }

export async function runImportFinishes() {
  const rows = readRows();
  let created = 0, updated = 0;
  for (const r of rows) {
    const existing = await prisma.finish.findFirst({ where: { name: { equals: r.name, mode: "insensitive" } } });
    if (!existing) {
      await prisma.finish.create({
        data: {
          name: r.name,
          category: r.category as any,
          unit: r.unit as any,
          calcType: r.calcType as any,
          baseCost: r.baseCost,
          minFee: r.minFee ?? undefined,
          areaStepM2: r.areaStepM2 ?? undefined,
          minPerPiece: r.minPerPiece ?? undefined,
          lossFactor: r.lossFactor ?? undefined,
          active: true,
          isCurrent: true,
        },
      });
      created++;
      continue;
    }

    const needUpdate = (
      String(existing.category) !== String(r.category) ||
      String(existing.unit) !== String(r.unit) ||
      String(existing.calcType) !== String(r.calcType) ||
      dec4s(existing.baseCost as any) !== r.baseCost ||
      (existing.minFee == null ? null : dec2s(existing.minFee as any)) !== (r.minFee ?? null) ||
      (existing.areaStepM2 == null ? null : dec4s(existing.areaStepM2 as any)) !== (r.areaStepM2 ?? null) ||
      (existing.minPerPiece == null ? null : dec2s(existing.minPerPiece as any)) !== (r.minPerPiece ?? null) ||
      (existing.lossFactor == null ? null : dec4s(existing.lossFactor as any)) !== (r.lossFactor ?? null) ||
      Boolean(existing.active) !== Boolean(r.active)
    );
    if (needUpdate) {
      await prisma.finish.update({
        where: { id: existing.id },
        data: {
          category: r.category as any,
          unit: r.unit as any,
          calcType: r.calcType as any,
          baseCost: r.baseCost,
          minFee: r.minFee ?? undefined,
          areaStepM2: r.areaStepM2 ?? undefined,
          minPerPiece: r.minPerPiece ?? undefined,
          lossFactor: r.lossFactor ?? undefined,
          active: r.active,
        },
      });
      updated++;
    }
  }
  const out = { created, updated };
  console.log(JSON.stringify(out));
  return out;
}

if (require.main === module) {
  runImportFinishes().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}


