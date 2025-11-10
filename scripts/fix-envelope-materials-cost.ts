import { prisma } from "../lib/prisma";

async function main() {
  console.log("🔧 Corrigindo custos dos materiais de envelopes...\n");

  // Buscar envelopes com materiais sem custo
  const envelopes = await prisma.product.findMany({
    where: {
      name: { startsWith: "Envelope", mode: "insensitive" }
    },
    include: {
      materials: {
        include: {
          material: true
        }
      }
    }
  });

  let fixed = 0;

  for (const envelope of envelopes) {
    for (const pm of envelope.materials) {
      const material = pm.material;
      
      // Se o material não tem custo ou custo é zero
      if (!material.unitCost || Number(material.unitCost) === 0) {
        // Definir custo padrão baseado no tipo de envelope
        let defaultCost = "0.0400"; // Custo padrão
        
        if (envelope.name.includes("DL 90")) {
          defaultCost = "0.0000"; // DL 90 JANELA tem custo zero no Excel
        } else if (envelope.name.includes("DL 120")) {
          defaultCost = "0.1200"; // DL 120 S_JANELA tem custo 0.12
        } else if (envelope.name.includes("S_JANELA")) {
          defaultCost = "0.0400"; // DL 90 S_JANELA tem custo 0.04
        }

        await prisma.material.update({
          where: { id: material.id },
          data: { unitCost: defaultCost }
        });
        
        console.log(`  ✅ Custo atualizado: ${material.name} → €${defaultCost}`);
        fixed++;
      }
    }
  }

  console.log(`\n✅ ${fixed} materiais corrigidos\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

