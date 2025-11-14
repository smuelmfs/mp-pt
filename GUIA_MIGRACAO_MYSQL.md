# Guia de Migração: PostgreSQL → MySQL

## 📋 Resumo Executivo

**Tempo estimado:** 3-5 horas  
**Complexidade:** Média  
**Arquivos a alterar:** ~8-9 arquivos  
**Risco:** Baixo (Prisma gerencia a maior parte)

---

## 🎯 Pontos Principais

### 1. **Mudança no Schema Prisma** (1 linha)
- Alterar `provider = "postgresql"` para `provider = "mysql"` no `schema.prisma`
- Prisma gerencia automaticamente as diferenças de tipos (JSONB → JSON, etc.)

### 2. **Queries SQL Nativas** (7 arquivos)
- PostgreSQL usa `$1, $2` como placeholders → MySQL usa `?`
- PostgreSQL usa `::text, ::numeric` para casting → MySQL usa `CAST()`
- Uma query específica usa função PostgreSQL de enum → precisa ser reescrita

### 3. **Variável de Ambiente**
- Mudar `DATABASE_URL` de formato PostgreSQL para MySQL

### 4. **Migrações**
- Recriar migrações do zero (recomendado) ou adaptar existentes

---

## 🔄 Simulação Passo a Passo

### **PASSO 1: Backup e Preparação** (15 min)

```bash
# 1. Fazer backup do banco PostgreSQL atual
pg_dump -h host -U user -d database > backup_postgres.sql

# 2. Criar novo banco MySQL no servidor
# (via cPanel ou linha de comando)
mysql -u root -p -e "CREATE DATABASE mp_pt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

### **PASSO 2: Alterar Schema Prisma** (2 min)

**Arquivo:** `prisma/schema.prisma`

```prisma
// ANTES
datasource db {
  provider     = "postgresql"  // ← MUDAR AQUI
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}

// DEPOIS
datasource db {
  provider     = "mysql"  // ← NOVO
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}
```

---

### **PASSO 3: Atualizar Variável de Ambiente** (2 min)

**Arquivo:** `.env.local` ou configuração do servidor

```env
# ANTES (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# DEPOIS (MySQL)
DATABASE_URL=mysql://user:password@host:3306/mp_pt
```

**Nota:** MySQL geralmente não precisa de SSL na URL, mas pode adicionar `?sslaccept=strict` se necessário.

---

### **PASSO 4: Adaptar Queries SQL** (30-60 min)

#### **Arquivo 1:** `app/api/admin/materials/route.ts`

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

**Mudanças:**
- `$1` → `?` (placeholder)
- `"Material"` → `Material` (sem aspas duplas)
- `::text` → `CAST(... AS CHAR)` (casting)

---

#### **Arquivo 2:** `app/api/admin/materials/[id]/route.ts`

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

**Mudanças:**
- `$1, $2` → `?` (placeholders)
- `::numeric` → removido (MySQL aceita decimal diretamente)
- Aspas duplas removidas dos nomes de tabelas

---

#### **Arquivo 3:** `prisma/patch.alveolar.supplier_costs.from_sheet.ts`

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

---

#### **Arquivo 4:** `prisma/patch.suppliers.rename.vinil.ts`

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

---

#### **Arquivo 5:** `prisma/patch.fix-finishes-costs-final.ts` ⚠️ **QUERY ESPECIAL**

```typescript
// ANTES (PostgreSQL) - QUERY COMPLEXA
const finishTypes = await prisma.$queryRaw<Array<{ name: string }>>`
  SELECT unnest(enum_range(NULL::"FinishCalcType"))::text as name
`.catch(() => []);

// DEPOIS (MySQL) - OPÇÃO 1: Valores hardcoded (RECOMENDADO)
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

**Explicação:** Esta query usa `unnest(enum_range(...))` que é específica do PostgreSQL. Como o código só verifica se os valores existem e depois cria com "PER_UNIT" hardcoded, a solução mais simples é usar valores hardcoded.

---

#### **Arquivo 6:** `prisma/patch.paper.supplier_costs.from_sheet.ts`

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

### **PASSO 5: Regenerar Prisma Client** (2 min)

```bash
# Regenerar o Prisma Client com o novo provider
npx prisma generate
```

**O que acontece:**
- Prisma gera novos tipos TypeScript compatíveis com MySQL
- JSONB é automaticamente convertido para JSON
- Tipos DECIMAL continuam funcionando igual

---

### **PASSO 6: Recriar Migrações** (1-2 horas)

**Opção A: Recriar do Zero (RECOMENDADO)**

```bash
# 1. Deletar pasta de migrações antigas
rm -rf prisma/migrations

# 2. Criar nova migração inicial para MySQL
npx prisma migrate dev --name init_mysql

# 3. Aplicar no banco de produção
npx prisma migrate deploy
```

**Opção B: Manter Histórico (se necessário)**

```bash
# Criar nova migração que adapta tudo
npx prisma migrate dev --name convert_to_mysql --create-only

# Editar manualmente a migração criada
# (não recomendado, muito trabalhoso)
```

---

### **PASSO 7: Migrar Dados** (30 min - 2 horas)

**Opção A: Export/Import via Prisma (se possível)**

```bash
# Exportar dados do PostgreSQL
npx prisma db pull --schema=postgresql_schema.prisma
# (criar script de exportação)

# Importar no MySQL
# (criar script de importação)
```

**Opção B: Script de Migração Manual**

```typescript
// scripts/migrate-postgres-to-mysql.ts
import { PrismaClient as PostgresClient } from '@prisma/postgresql-client';
import { PrismaClient as MySQLClient } from '@prisma/mysql-client';

const postgres = new PostgresClient();
const mysql = new MySQLClient();

async function migrate() {
  // Migrar Users
  const users = await postgres.user.findMany();
  for (const user of users) {
    await mysql.user.create({ data: user });
  }

  // Migrar Products
  const products = await postgres.product.findMany();
  for (const product of products) {
    await mysql.product.create({ data: product });
  }

  // ... (repetir para todas as tabelas)
}

migrate();
```

**Opção C: Export SQL e Adaptar**

```bash
# Exportar do PostgreSQL
pg_dump -h host -U user -d database --data-only > data.sql

# Adaptar manualmente o SQL (remover sintaxe PostgreSQL)
# Importar no MySQL
mysql -u user -p database < data_adapted.sql
```

---

### **PASSO 8: Testar** (1-2 horas)

```bash
# 1. Testar conexão
npx prisma db pull

# 2. Testar queries básicas
# (criar script de teste)

# 3. Testar aplicação completa
npm run dev
```

**Checklist de Testes:**
- [ ] Login funciona
- [ ] Listagem de materiais funciona
- [ ] Criação de material funciona
- [ ] Cálculo de orçamentos funciona
- [ ] Queries SQL nativas funcionam
- [ ] Migrações aplicadas corretamente

---

## 📊 Comparação de Sintaxe

| Aspecto | PostgreSQL | MySQL |
|---------|-----------|-------|
| **Placeholders** | `$1, $2, $3` | `?` |
| **Casting** | `::text`, `::numeric` | `CAST(... AS CHAR)`, `CAST(... AS DECIMAL)` |
| **Nomes de Tabelas** | `"Material"` (aspas) | `Material` (sem aspas) |
| **JSON** | `JSONB` (binário) | `JSON` (texto) |
| **Enums** | Função `enum_range()` | Não tem, usar valores hardcoded |
| **DECIMAL** | `DECIMAL(12,4)` | `DECIMAL(12,4)` (igual) |

---

## ⚠️ Pontos de Atenção

1. **JSONB → JSON**: Prisma gerencia automaticamente, mas performance pode ser ligeiramente diferente
2. **Enums**: MySQL não tem função equivalente ao `enum_range()` do PostgreSQL
3. **Case Sensitivity**: MySQL é case-insensitive por padrão (diferente do PostgreSQL)
4. **Transações**: Sintaxe similar, mas comportamento pode variar
5. **Índices**: Funcionam igual, mas sintaxe pode variar

---

## ✅ Checklist Final

- [ ] Schema Prisma alterado para `mysql`
- [ ] Variável `DATABASE_URL` atualizada
- [ ] 7 queries SQL adaptadas
- [ ] Prisma Client regenerado
- [ ] Migrações recriadas
- [ ] Dados migrados (se necessário)
- [ ] Testes realizados
- [ ] Aplicação funcionando

---

## 🎯 Resumo dos Arquivos

1. ✅ `prisma/schema.prisma` - Mudar provider
2. ✅ `.env.local` - Atualizar DATABASE_URL
3. ✅ `app/api/admin/materials/route.ts` - Adaptar query
4. ✅ `app/api/admin/materials/[id]/route.ts` - Adaptar 2 queries
5. ✅ `prisma/patch.alveolar.supplier_costs.from_sheet.ts` - Adaptar query
6. ✅ `prisma/patch.suppliers.rename.vinil.ts` - Adaptar query
7. ✅ `prisma/patch.fix-finishes-costs-final.ts` - Reescrever query
8. ✅ `prisma/patch.paper.supplier_costs.from_sheet.ts` - Adaptar query
9. ✅ `prisma/migrations/` - Recriar migrações

**Total:** 9 arquivos/pastas

---

## 💡 Dicas Finais

1. **Faça backup antes de começar**
2. **Teste em ambiente de desenvolvimento primeiro**
3. **Use valores hardcoded para enums** (mais simples que queries complexas)
4. **MySQL é mais permissivo** com tipos, então algumas conversões são automáticas
5. **Prisma abstrai a maior parte** das diferenças, facilitando muito a migração

---

## 🚀 Comandos Rápidos

```bash
# Sequência completa de migração
npx prisma generate                    # Regenerar client
npx prisma migrate dev --name init_mysql  # Criar migração
npx prisma migrate deploy              # Aplicar em produção
npx prisma db pull                     # Verificar estrutura
```

---

**Tempo Total Estimado:** 3-5 horas  
**Complexidade:** Média  
**Risco:** Baixo (com backup e testes)

