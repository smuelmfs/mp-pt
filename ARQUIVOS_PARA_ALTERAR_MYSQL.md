# Arquivos que Precisam ser Alterados para MySQL

## 1. Schema Prisma (OBRIGATÓRIO)

**Arquivo:** `prisma/schema.prisma`

**Mudança:**
```prisma
// ANTES
datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}

// DEPOIS
datasource db {
  provider     = "mysql"  // ← MUDAR AQUI
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}
```

---

## 2. Queries SQL Nativas (7 arquivos)

### Arquivo 1: `app/api/admin/materials/route.ts`
**Linha:** ~53-56
```typescript
// ANTES (PostgreSQL)
const raw = await prisma.$queryRawUnsafe(
  `SELECT "supplierUnitCost"::text as "supplierUnitCost" FROM "Material" WHERE "id" = $1`,
  m.id
);

// DEPOIS (MySQL)
const raw = await prisma.$queryRawUnsafe(
  `SELECT CAST(supplierUnitCost AS CHAR) as supplierUnitCost FROM Material WHERE id = ?`,
  m.id
);
```

### Arquivo 2: `app/api/admin/materials/[id]/route.ts`
**Linhas:** ~37-39 e ~83-87
```typescript
// ANTES (PostgreSQL)
await prisma.$queryRawUnsafe(
  `SELECT "supplierUnitCost"::text as "supplierUnitCost" FROM "Material" WHERE "id" = $1`,
  id
);

await prisma.$executeRawUnsafe(
  `UPDATE "Material" SET "supplierUnitCost" = $1::numeric WHERE "id" = $2`,
  supplierUnitCostToSet, id
);

// DEPOIS (MySQL)
await prisma.$queryRawUnsafe(
  `SELECT CAST(supplierUnitCost AS CHAR) as supplierUnitCost FROM Material WHERE id = ?`,
  id
);

await prisma.$executeRawUnsafe(
  `UPDATE Material SET supplierUnitCost = ? WHERE id = ?`,
  supplierUnitCostToSet, id
);
```

### Arquivo 3: `prisma/patch.alveolar.supplier_costs.from_sheet.ts`
**Linha:** ~63-67
```typescript
// ANTES (PostgreSQL)
await prisma.$executeRawUnsafe(
  `UPDATE "Material" SET "supplierUnitCost" = $1::numeric WHERE "id" = $2`,
  row.costPerM2.toFixed(4), mat.id
);

// DEPOIS (MySQL)
await prisma.$executeRawUnsafe(
  `UPDATE Material SET supplierUnitCost = ? WHERE id = ?`,
  row.costPerM2.toFixed(4), mat.id
);
```

### Arquivo 4: `prisma/patch.suppliers.rename.vinil.ts`
**Linha:** ~18
```typescript
// ANTES (PostgreSQL)
await prisma.$executeRawUnsafe(
  `UPDATE "Material" SET "supplierId" = $1 WHERE "supplierId" = $2`,
  dst.id, src.id
);

// DEPOIS (MySQL)
await prisma.$executeRawUnsafe(
  `UPDATE Material SET supplierId = ? WHERE supplierId = ?`,
  dst.id, src.id
);
```

### Arquivo 5: `prisma/patch.fix-finishes-costs-final.ts`
**Linha:** ~63-65
```typescript
// ANTES (PostgreSQL) - QUERY COMPLEXA
const finishTypes = await prisma.$queryRaw<Array<{ name: string }>>`
  SELECT unnest(enum_range(NULL::"FinishCalcType"))::text as name
`.catch(() => []);

// DEPOIS (MySQL) - OPÇÃO 1: Valores hardcoded (mais simples)
const finishTypes = [
  { name: "PER_UNIT" },
  { name: "PER_M2" },
  { name: "PER_LOT" },
  { name: "PER_HOUR" }
];

// DEPOIS (MySQL) - OPÇÃO 2: Query alternativa (se realmente precisar)
// Nota: Esta query não é necessária, pois o código só usa para verificar se existe
// e depois cria com "PER_UNIT" hardcoded. Pode simplesmente usar valores hardcoded.
```

### Arquivo 6: `prisma/patch.paper.supplier_costs.from_sheet.ts`
**Linha:** ~49-53
```typescript
// ANTES (PostgreSQL)
await prisma.$executeRawUnsafe(
  `UPDATE "Material" SET "supplierUnitCost" = $1::numeric WHERE "id" = $2`,
  r.unitPrice.toFixed(4), mat.id
);

// DEPOIS (MySQL)
await prisma.$executeRawUnsafe(
  `UPDATE Material SET supplierUnitCost = ? WHERE id = ?`,
  r.unitPrice.toFixed(4), mat.id
);
```

---

## 3. Variável de Ambiente

**Arquivo:** `.env` ou `.env.local` ou configuração do servidor

```env
# ANTES (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# DEPOIS (MySQL)
DATABASE_URL=mysql://user:pass@host:3306/db
```

---

## 4. Migrações (OPCIONAL - se quiser manter histórico)

**Pasta:** `prisma/migrations/`

**Opções:**
- **Opção A:** Deletar pasta `migrations/` e criar novas migrações do zero
- **Opção B:** Manter histórico e criar nova migração inicial para MySQL
- **Opção C:** Adaptar manualmente as migrações existentes (não recomendado)

**Recomendação:** Opção A (mais limpo)

---

## 5. Comandos a Executar

```bash
# 1. Atualizar schema
# (editar prisma/schema.prisma manualmente)

# 2. Regenerar Prisma Client
npx prisma generate

# 3. Criar nova migração inicial
npx prisma migrate dev --name init_mysql

# 4. Ou resetar tudo (CUIDADO: apaga dados!)
npx prisma migrate reset
```

---

## Resumo

- **1 arquivo** de schema (mudança simples)
- **7 arquivos** com queries SQL (precisam adaptação)
- **1 variável** de ambiente (mudança simples)
- **Migrações** (recriar do zero ou adaptar)

**Total:** ~8-9 arquivos para alterar

