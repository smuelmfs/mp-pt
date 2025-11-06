// prisma/seed.customers.prices.ts
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type MatPrice = { customer: string; material: string; unitCost: number };
type PrnPrice = { customer: string; printing: string; unitCost: number };
type InputJson = { materials?: MatPrice[]; printings?: PrnPrice[] };

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function loadData(): InputJson {
  const p =
    process.env.CUSTOMER_PRICES_PATH ||
    path.resolve(process.cwd(), "data", "customers_prices_extracted.json");
  const raw = fs.readFileSync(p, "utf-8");
  const j = JSON.parse(raw);
  if (!j || typeof j !== "object") throw new Error("JSON inválido.");
  console.log(`📥 Lendo preços de clientes: ${p}`);
  return j as InputJson;
}

async function findCustomerByName(name: string) {
  const n = norm(name);
  const row = await prisma.customer.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!row) console.warn(`❔ Cliente não encontrado: "${name}"`);
  return row;
}

async function findMaterialByNameSmart(name: string) {
  // 1) match exato (case-insensitive)
  let row = await prisma.material.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (row) return row;

  // 2) match "contains" (pega o mais longo)
  const hits = await prisma.material.findMany({
    where: { name: { contains: name, mode: "insensitive" } },
    select: { id: true, name: true },
    take: 5,
  });
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    // heurística: escolher o que tiver nome mais parecido (maior interseção)
    const nn = norm(name);
    let best = hits[0];
    let bestScore = -1;
    for (const h of hits) {
      const hn = norm(h.name);
      const score = Math.min(nn.length, hn.length);
      if (score > bestScore) {
        best = h;
        bestScore = score;
      }
    }
    console.warn(
      `ℹ️ Vários materiais possíveis para "${name}". Escolhido: "${best.name}"`
    );
    return best;
  }

  console.warn(`❔ Material não encontrado por nome: "${name}"`);
  return null;
}

async function findPrintingByNameSmart(name: string) {
  // 1) match exato
  let row = await prisma.printing.findFirst({
    where: { formatLabel: { equals: name, mode: "insensitive" } },
    select: { id: true, formatLabel: true },
  });
  if (row) return row;

  // Alternativa: muitos usam "formatLabel" pra descrição; se não, tenta "colors" também
  row = await prisma.printing.findFirst({
    where: {
      OR: [
        { formatLabel: { equals: name, mode: "insensitive" } },
        { colors: { equals: name, mode: "insensitive" } },
      ],
    },
    select: { id: true, formatLabel: true },
  });
  if (row) return row;

  // 2) contains
  const hits = await prisma.printing.findMany({
    where: {
      OR: [
        { formatLabel: { contains: name, mode: "insensitive" } },
        { colors: { contains: name, mode: "insensitive" } },
      ],
    },
    select: { id: true, formatLabel: true },
    take: 5,
  });
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    console.warn(
      `ℹ️ Várias impressões possíveis para "${name}". Escolhido: "${hits[0].formatLabel}"`
    );
    return hits[0];
  }

  console.warn(`❔ Impressão não encontrada por nome: "${name}"`);
  return null;
}

async function upsertMaterialCustomerPrice(materialId: number, customerId: number, unitCost: number) {
  // Como não há unique index composto no modelo, fazemos findFirst + create/update
  const existing = await prisma.materialCustomerPrice.findFirst({
    where: { materialId, customerId, isCurrent: true },
    orderBy: [{ priority: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  if (!existing) {
    await prisma.materialCustomerPrice.create({
      data: {
        materialId,
        customerId,
        unitCost: unitCost,
        priority: 100,
        isCurrent: true,
      },
    });
  } else {
    await prisma.materialCustomerPrice.update({
      where: { id: existing.id },
      data: {
        unitCost: unitCost,
        isCurrent: true,
      },
    });
  }
}

async function upsertPrintingCustomerPrice(printingId: number, customerId: number, unitCost: number) {
  const existing = await prisma.printingCustomerPrice.findFirst({
    where: { printingId, customerId, isCurrent: true },
    orderBy: [{ priority: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  if (!existing) {
    await prisma.printingCustomerPrice.create({
      data: {
        printingId,
        customerId,
        unitPrice: unitCost,
        priority: 100,
        isCurrent: true,
      },
    });
  } else {
    await prisma.printingCustomerPrice.update({
      where: { id: existing.id },
      data: {
        unitPrice: unitCost,
        isCurrent: true,
      },
    });
  }
}

async function main() {
  console.log("🚀 Importando preços específicos por cliente (materials & printings)...");
  const data = loadData();

  // MATERIAIS
  if (Array.isArray(data.materials)) {
    for (const row of data.materials) {
      if (!row?.customer || !row?.material || row.unitCost == null) continue;

      const customer = await findCustomerByName(row.customer);
      if (!customer) continue;

      const material = await findMaterialByNameSmart(row.material);
      if (!material) continue;

      await upsertMaterialCustomerPrice(material.id, customer.id, row.unitCost);
      console.log(`✔ MaterialPrice: ${customer.name} → ${material.name} = ${row.unitCost.toFixed(2)} €`);
    }
  }

  // IMPRESSÕES
  if (Array.isArray(data.printings)) {
    for (const row of data.printings) {
      if (!row?.customer || !row?.printing || row.unitCost == null) continue;

      const customer = await findCustomerByName(row.customer);
      if (!customer) continue;

      const printing = await findPrintingByNameSmart(row.printing);
      if (!printing) {
        console.warn(`↪️ (pulei) Impressão não cadastrada no sistema: "${row.printing}"`);
        continue;
      }

      await upsertPrintingCustomerPrice(printing.id, customer.id, row.unitCost);
      console.log(`✔ PrintingPrice: ${customer.name} → ${printing.formatLabel ?? "(sem label)"} = ${row.unitCost.toFixed(2)} €`);
    }
  }

  console.log("🏁 Seed finalizado.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
