import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";

type Row = {
  technology: "UV";
  formatLabel: string;
  colors: string | null;
  sides: number | null;
  unitPrice: string;
  yield: number | null;
  setupMode: string | null;
  setupFlatFee: string | null;
  minFee: string | null;
  lossFactor: string | null;
  active: boolean;
};

function readRows(): Row[] {
  const p = path.join(process.cwd(), "data/normalized/printing-uv.json");
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function dec4(s: any) { return Number(Number(s).toFixed(4)); }
function dec2(s: any) { return Number(Number(s).toFixed(2)); }

export async function runImportPrintingUV() {
  const rows = readRows();
  let created = 0, updated = 0;

  for (const r of rows) {
    const existing = await prisma.printing.findFirst({
      where: {
        technology: "UV",
        formatLabel: { equals: r.formatLabel, mode: "insensitive" },
        colors: r.colors ? { equals: r.colors, mode: "insensitive" } : null,
        sides: r.sides ?? undefined,
        isCurrent: true,
      },
    });

    if (!existing) {
      await prisma.printing.create({
        data: {
          technology: "UV",
          formatLabel: r.formatLabel,
          colors: r.colors,
          sides: r.sides ?? undefined,
          unitPrice: r.unitPrice,
          yield: r.yield ?? undefined,
          setupMode: r.setupMode as any,
          setupFlatFee: r.setupFlatFee,
          minFee: r.minFee,
          lossFactor: r.lossFactor,
          active: r.active,
          isCurrent: true,
        },
      });
      created++;
      continue;
    }

    // compare normalized
    const needUpdate = (
      dec4(existing.unitPrice as any) !== dec4(r.unitPrice) ||
      String(existing.setupMode || "") !== String(r.setupMode || "") ||
      dec2(existing.setupFlatFee as any) !== dec2(r.setupFlatFee) ||
      dec2(existing.minFee as any) !== dec2(r.minFee) ||
      dec4(existing.lossFactor as any) !== dec4(r.lossFactor) ||
      Boolean(existing.active) !== Boolean(r.active)
    );

    if (needUpdate) {
      await prisma.printing.update({
        where: { id: existing.id },
        data: {
          unitPrice: r.unitPrice,
          setupMode: r.setupMode as any,
          setupFlatFee: r.setupFlatFee,
          minFee: r.minFee,
          lossFactor: r.lossFactor,
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
  runImportPrintingUV().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}


