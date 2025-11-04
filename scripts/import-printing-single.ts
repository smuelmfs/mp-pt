import { readFileSync } from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { PrintingTech } from "@prisma/client";

type Row = {
  technology: "DIGITAL" | "GRANDE_FORMATO";
  formatLabel: string;
  colors: "K" | "CMYK";
  sides: 1 | 2;
  unitPrice: string; // 4 casas
  active: boolean;
};

type Summary = { created: number; updated: number };

function norm(s: string): string { return s.trim(); }

export async function runImportPrintingSingle(): Promise<Summary> {
  const filePath = path.resolve(process.cwd(), "data", "normalized", "printing-single.json");
  let rows: unknown;
  try {
    rows = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error("Falha ao ler/parsear printing-single.json:", e);
    return { created: 0, updated: 0 };
  }
  if (!Array.isArray(rows)) return { created: 0, updated: 0 };

  let created = 0;
  let updated = 0;

  for (const r of rows as Row[]) {
    const technology = r.technology as PrintingTech;
    const formatLabel = norm(r.formatLabel);
    const colors = norm(r.colors);
    const sides = r.sides;
    const unitPrice = (Number(r.unitPrice)).toFixed(4);
    const active = !!r.active;

    const existing = await prisma.printing.findFirst({
      where: {
        isCurrent: true,
        technology,
        formatLabel: { equals: formatLabel, mode: "insensitive" },
        colors: { equals: colors, mode: "insensitive" },
        sides,
      },
    });

    if (!existing) {
      await prisma.printing.create({
        data: { technology, formatLabel, colors, sides, unitPrice, active, isCurrent: true },
      });
      created += 1;
    } else {
      const existingUnitPrice = (existing.unitPrice as any)?.toFixed
        ? (existing.unitPrice as any).toFixed(4)
        : existing.unitPrice.toString();
      const needUpdate = existing.technology !== technology || existing.active !== active || existingUnitPrice !== unitPrice;
      if (needUpdate) {
        await prisma.printing.update({ where: { id: existing.id }, data: { technology, unitPrice, active } });
        updated += 1;
      }
    }
  }

  const summary = { created, updated };
  console.log(JSON.stringify(summary));
  return summary;
}

if (require.main === module) {
  runImportPrintingSingle().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}


