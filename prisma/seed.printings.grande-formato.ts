import { PrismaClient, PrintingTech } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DATA_PATH = path.resolve(process.cwd(), "data", "printings-grande-formato.json");

interface PrintingVariant {
  name: string;
  supplier?: string;
  pricePerM2: number;
  marginPercent: number;
  technology: "GRANDE_FORMATO" | "DIGITAL" | "UV";
}

interface PrintingData {
  name: string;
  variants: PrintingVariant[];
}

function determineTechnology(name: string): PrintingTech {
  const upper = name.toUpperCase();
  if (upper.includes("UV")) return PrintingTech.UV;
  if (upper.includes("DTF") || upper.includes("DIGITAL") || upper.includes("PLOTTER")) {
    return PrintingTech.DIGITAL;
  }
  return PrintingTech.GRANDE_FORMATO;
}

async function main() {
  console.log("🖨️  Importando Impressões - IMP. GRANDE FORMATO...\n");

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${DATA_PATH}`);
    console.log("   Execute primeiro: npm run extract:printings:grande-formato");
    return;
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as PrintingData[];

  let created = 0;
  let updated = 0;

  for (const item of data) {
    // Usar a primeira variante como base
    const baseVariant = item.variants[0];
    const technology = determineTechnology(item.name);

    // Criar impressão base
    const existing = await prisma.printing.findFirst({
      where: {
        formatLabel: { equals: item.name, mode: "insensitive" },
        technology
      }
    });

    if (existing) {
      // Atualizar se necessário
      if (Number(existing.unitPrice) !== baseVariant.pricePerM2) {
        await prisma.printing.update({
          where: { id: existing.id },
          data: {
            unitPrice: baseVariant.pricePerM2.toFixed(4),
            active: true,
            isCurrent: true
          }
        });
        updated++;
        console.log(`  ✅ ${item.name} (atualizada: €${baseVariant.pricePerM2.toFixed(2)}/m²)`);
      } else {
        console.log(`  ℹ️  ${item.name} (já existe)`);
      }
    } else {
      await prisma.printing.create({
        data: {
          technology,
          formatLabel: item.name,
          unitPrice: baseVariant.pricePerM2.toFixed(4),
          setupMode: "TIME_X_RATE",
          active: true,
          isCurrent: true
        }
      });
      created++;
      console.log(`  ✅ ${item.name} (criada: €${baseVariant.pricePerM2.toFixed(2)}/m², ${technology})`);
    }

    // Se houver múltiplos fornecedores, criar impressões adicionais ou preços por fornecedor
    if (item.variants.length > 1) {
      for (let i = 1; i < item.variants.length; i++) {
        const variant = item.variants[i];
        const variantName = `${item.name} (${variant.supplier || `Variante ${i + 1}`})`;
        
        const variantExists = await prisma.printing.findFirst({
          where: {
            formatLabel: { equals: variantName, mode: "insensitive" },
            technology
          }
        });

        if (!variantExists) {
          await prisma.printing.create({
            data: {
              technology,
              formatLabel: variantName,
              unitPrice: variant.pricePerM2.toFixed(4),
              setupMode: "TIME_X_RATE",
              active: true,
              isCurrent: true
            }
          });
          created++;
          console.log(`    ✅ ${variantName} (criada: €${variant.pricePerM2.toFixed(2)}/m²)`);
        }
      }
    }
  }

  console.log(`\n${"=".repeat(120)}`);
  console.log(`✅ RESUMO:`);
  console.log(`  - Criadas: ${created}`);
  console.log(`  - Atualizadas: ${updated}`);
  console.log("=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

