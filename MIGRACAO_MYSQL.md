# Migração de PostgreSQL para MySQL - Análise

## Resposta Curta

**Sim, é possível mudar para MySQL, mas requer trabalho de adaptação.** Não é trivial, mas também não é extremamente complicado. O Prisma suporta MySQL nativamente, então a maior parte do código funcionará automaticamente.

---

## Principais Desafios Encontrados

### 1. **Tipos de Dados JSON/JSONB** ⚠️

**PostgreSQL:** Usa `JSONB` (binary JSON, mais eficiente)
**MySQL:** Usa apenas `JSON` (sem versão binary)

**Impacto:**
- No schema Prisma, campos `Json` funcionam em ambos
- Mas as migrações SQL criadas para PostgreSQL usam `JSONB`
- **Solução:** Prisma gerará automaticamente `JSON` para MySQL nas novas migrações

**Campos afetados:**
- `Quote.params` (Json)
- `Quote.breakdown` (Json)
- `CalcLog.inputs` (Json)
- `CalcLog.outputs` (Json)
- `Product.attributesSchema` (Json?)
- `ProductOptionChoice.overrideAttrs` (Json?)

### 2. **Queries SQL Nativas com Sintaxe PostgreSQL** 🔴

Encontrei **7 locais** com queries SQL nativas que usam sintaxe PostgreSQL:

#### a) `app/api/admin/materials/route.ts` (linha 53-56)
```typescript
// PostgreSQL: usa ::text e $1
const raw = await prisma.$queryRawUnsafe(
  `SELECT "supplierUnitCost"::text as "supplierUnitCost" FROM "Material" WHERE "id" = $1`,
  m.id
);
```

**Adaptação MySQL:**
```typescript
// MySQL: usa CAST e ?
const raw = await prisma.$queryRawUnsafe(
  `SELECT CAST(supplierUnitCost AS CHAR) as supplierUnitCost FROM Material WHERE id = ?`,
  m.id
);
```

#### b) `app/api/admin/materials/[id]/route.ts` (linhas 37-39, 83-87)
```typescript
// PostgreSQL
await prisma.$queryRawUnsafe(
  `SELECT "supplierUnitCost"::text as "supplierUnitCost" FROM "Material" WHERE "id" = $1`,
  id
);

await prisma.$executeRawUnsafe(
  `UPDATE "Material" SET "supplierUnitCost" = $1::numeric WHERE "id" = $2`,
  supplierUnitCostToSet, id
);
```

**Adaptação MySQL:**
```typescript
// MySQL
await prisma.$queryRawUnsafe(
  `SELECT CAST(supplierUnitCost AS CHAR) as supplierUnitCost FROM Material WHERE id = ?`,
  id
);

await prisma.$executeRawUnsafe(
  `UPDATE Material SET supplierUnitCost = ? WHERE id = ?`,
  supplierUnitCostToSet, id
);
```

#### c) `prisma/patch.alveolar.supplier_costs.from_sheet.ts` (linha 63-67)
```typescript
// PostgreSQL
await prisma.$executeRawUnsafe(
  `UPDATE "Material" SET "supplierUnitCost" = $1::numeric WHERE "id" = $2`,
  row.costPerM2.toFixed(4), mat.id
);
```

**Adaptação MySQL:**
```typescript
// MySQL
await prisma.$executeRawUnsafe(
  `UPDATE Material SET supplierUnitCost = ? WHERE id = ?`,
  row.costPerM2.toFixed(4), mat.id
);
```

#### d) `prisma/patch.suppliers.rename.vinil.ts` (linha 18)
```typescript
// PostgreSQL
await prisma.$executeRawUnsafe(
  `UPDATE "Material" SET "supplierId" = $1 WHERE "supplierId" = $2`,
  dst.id, src.id
);
```

**Adaptação MySQL:**
```typescript
// MySQL
await prisma.$executeRawUnsafe(
  `UPDATE Material SET supplierId = ? WHERE supplierId = ?`,
  dst.id, src.id
);
```

#### e) `prisma/patch.fix-finishes-costs-final.ts` (linha 63-65) ⚠️ **MAIS COMPLEXO**
```typescript
// PostgreSQL: usa função específica para enums
const finishTypes = await prisma.$queryRaw<Array<{ name: string }>>`
  SELECT unnest(enum_range(NULL::"FinishCalcType"))::text as name
`.catch(() => []);
```

**Adaptação MySQL:**
```typescript
// MySQL: precisa usar informação_schema ou valores hardcoded
const finishTypes = await prisma.$queryRaw<Array<{ name: string }>>`
  SELECT COLUMN_TYPE as name 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Finish' 
    AND COLUMN_NAME = 'calcType'
`.catch(() => []);
// OU simplesmente usar valores hardcoded:
const finishTypes = [
  { name: "PER_UNIT" },
  { name: "PER_M2" },
  { name: "PER_LOT" },
  { name: "PER_HOUR" }
];
```

### 3. **Migrações Existentes** ⚠️

As migrações em `prisma/migrations/` foram criadas para PostgreSQL e usam:
- `SERIAL` (PostgreSQL) → Prisma converte para `AUTO_INCREMENT` no MySQL
- `JSONB` → Prisma converte para `JSON` no MySQL
- `TIMESTAMP(3)` → MySQL suporta, mas pode precisar ajustes
- Nomes de tabelas com aspas duplas `"Material"` → MySQL usa backticks ou sem aspas

**Solução:**
- Opção 1: Criar novas migrações do zero para MySQL
- Opção 2: Adaptar as migrações existentes manualmente
- Opção 3: Usar `prisma migrate dev` que gerará migrações compatíveis

### 4. **Tipos DECIMAL** ✅

**Boa notícia:** Ambos PostgreSQL e MySQL suportam `DECIMAL` com precisão, então os campos `@db.Decimal(12,4)` funcionarão sem mudanças.

### 5. **Enums** ✅

Prisma gerencia enums de forma compatível entre PostgreSQL e MySQL, então não há problema aqui.

---

## Passos para Migração

### 1. **Atualizar Schema Prisma**

```prisma
datasource db {
  provider     = "mysql"  // mudar de "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}
```

### 2. **Atualizar DATABASE_URL**

```env
# PostgreSQL (atual)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# MySQL (novo)
DATABASE_URL=mysql://user:pass@host:3306/db
```

### 3. **Adaptar Queries SQL Nativas**

- Substituir `$1, $2` por `?` (placeholders MySQL)
- Remover `::text`, `::numeric` (casting PostgreSQL)
- Remover aspas duplas de nomes de tabelas (ou usar backticks)
- Adaptar a query de enum (linha 63-65 do patch.fix-finishes-costs-final.ts)

### 4. **Regenerar Prisma Client**

```bash
npx prisma generate
```

### 5. **Criar Novas Migrações**

```bash
# Opção A: Resetar e criar do zero (PERDE DADOS!)
npx prisma migrate reset

# Opção B: Criar migração inicial
npx prisma migrate dev --name init_mysql

# Opção C: Se já tem dados, fazer dump e importar
```

### 6. **Testar Tudo**

- Testar todas as funcionalidades
- Verificar queries SQL nativas
- Verificar campos JSON
- Verificar cálculos com DECIMAL

---

## Estimativa de Trabalho

| Tarefa | Tempo Estimado | Dificuldade |
|--------|---------------|-------------|
| Mudar schema e config | 5 min | Fácil |
| Adaptar 7 queries SQL | 30-60 min | Médio |
| Criar/adaptar migrações | 1-2 horas | Médio-Alto |
| Testes e ajustes | 1-2 horas | Médio |
| **TOTAL** | **3-5 horas** | **Médio** |

---

## Recomendações

### ✅ **Fazer a migração se:**
- O cPanel só oferece MySQL (não PostgreSQL)
- Prefere MySQL por questões de custo/familiaridade
- Tem tempo para testar tudo (3-5 horas)

### ⚠️ **Considerar manter PostgreSQL se:**
- Já tem dados importantes no banco atual
- Não quer risco de perda de dados
- PostgreSQL está funcionando bem

### 💡 **Alternativa:**
- Manter PostgreSQL no Neon (gratuito, funciona bem)
- Fazer deploy no cPanel apenas do frontend/backend
- Conectar ao PostgreSQL externo via DATABASE_URL

---

## Checklist de Migração

- [ ] Fazer backup completo do banco PostgreSQL atual
- [ ] Atualizar `prisma/schema.prisma` (provider = "mysql")
- [ ] Adaptar todas as queries SQL nativas (7 locais)
- [ ] Atualizar DATABASE_URL para MySQL
- [ ] Regenerar Prisma Client (`npx prisma generate`)
- [ ] Criar novas migrações ou adaptar existentes
- [ ] Testar todas as funcionalidades principais
- [ ] Verificar campos JSON funcionando
- [ ] Verificar cálculos com DECIMAL
- [ ] Testar queries SQL nativas
- [ ] Fazer deploy de teste
- [ ] Migrar dados (se necessário)

---

## Conclusão

**É viável mudar para MySQL**, mas requer:
1. Adaptar 7 queries SQL nativas
2. Recriar migrações
3. Testar tudo cuidadosamente

**Não é extremamente complicado**, mas também não é trivial. Se o cPanel oferece PostgreSQL, seria mais fácil manter PostgreSQL. Se só oferece MySQL, a migração é totalmente viável com o trabalho descrito acima.

