import { readFileSync } from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { PrintingTech } from "@prisma/client";

type Row = {
  technology: "DIGITAL" | "GRANDE_FORMATO";
  formatLabel: string;
  colors: string;
  unitPrice: string; // 4 casas
  active: boolean;
};

type Summary = { created: number; updated: number };

function normStr(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  return v.length ? v : null;
}

export async function runImportPrinting(): Promise<Summary> {
  const filePath = path.resolve(process.cwd(), "data", "normalized", "printing.json");
  let rows: unknown;
  try {
    rows = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error("Falha ao ler/parsear printing.json:", e);
    return { created: 0, updated: 0 };
  }
  if (!Array.isArray(rows)) return { created: 0, updated: 0 };

  let created = 0;
  let updated = 0;

  for (const r of rows as Row[]) {
    const technology = (r.technology as string).toUpperCase().trim() as PrintingTech;
    const formatLabel = normStr(r.formatLabel)!;
    const colors = normStr(r.colors)!;
    const unitPrice4 = (Number(r.unitPrice)).toFixed(4);
    const active = !!r.active;

    const existing = await prisma.printing.findFirst({
      where: {
        isCurrent: true,
        technology,
        formatLabel: { equals: formatLabel, mode: "insensitive" },
        colors: { equals: colors, mode: "insensitive" },
      },
    });

    if (!existing) {
      await prisma.printing.create({
        data: {
          technology,
          formatLabel,
          colors,
          unitPrice: unitPrice4,
          active,
          isCurrent: true,
        },
      });
      created += 1;
    } else {
      const existingUnitPrice = (existing.unitPrice as any)?.toFixed
        ? (existing.unitPrice as any).toFixed(4)
        : existing.unitPrice.toString();
      const needsUpdate =
        existing.technology !== technology ||
        existing.active !== active ||
        existingUnitPrice !== unitPrice4;

      if (needsUpdate) {
        await prisma.printing.update({
          where: { id: existing.id },
          data: {
            technology,
            unitPrice: unitPrice4,
            active,
          },
        });
        updated += 1;
      }
    }
  }

  const summary = { created, updated };
  console.log(JSON.stringify(summary));
  return summary;
}

if (require.main === module) {
  runImportPrinting().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}


