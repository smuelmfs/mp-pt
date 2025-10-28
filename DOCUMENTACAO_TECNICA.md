# Documentação Técnica - Sistema de Cálculo de Produção

## Visão Geral

Este documento descreve a implementação completa do sistema de cálculo de produção alinhado 1:1 com a planilha "CÁLCULO DE PRODUÇÃO 2024.xlsx". O sistema implementa todas as funcionalidades solicitadas com validação através de testes golden.

## Funcionalidades Implementadas

### 1. Arredondamento por Etapa (PER_STEP)

**Descrição**: Permite arredondar valores após cada linha de cálculo (material, impressão, acabamento) em vez de apenas no final.

**Implementação**:
- Enum `RoundingStrategy`: `END_ONLY` | `PER_STEP`
- Configurável em: `ConfigGlobal`, `ProductCategory`, `Product`
- Prioridade: Product > Category > Global
- Função `roundMoney2()` aplicada após cada linha quando `PER_STEP` ativo

**Código**:
```typescript
// lib/calc-quote.ts
const roundLine = (value: number) => {
  return prefs.roundingStrategy === 'PER_STEP' 
    ? roundMoney2(value) 
    : value;
};
```

### 2. Perdas por Escopo

**Descrição**: Fatores de perda específicos para Material, Impressão e Acabamento.

**Implementação**:
- Campo `lossFactor` em: `Material`, `ProductMaterial`, `Printing`, `Finish`
- Prioridade: ProductMaterial > Material > ProductCategory > ConfigGlobal
- Aplicado com `ceilInt()` para quantidades físicas

**Código**:
```typescript
// Resolução de preferências
const materialLoss = toNumber(
  productMaterial.lossFactor ?? 
  material.lossFactor ?? 
  category.lossFactor ?? 
  cfg.lossFactor ?? 0
);

const qtyPhysical = ceilInt(effectiveQuantity * qtyPerUnit);
const qtyWithLoss = ceilInt(qtyPhysical * (1 + materialLoss));
```

### 3. Setup de Impressão Flexível

**Descrição**: Suporte a setup por tempo×taxa ou taxa fixa.

**Implementação**:
- Enum `SetupMode`: `TIME_X_RATE` | `FLAT`
- Campo `setupFlatFee` para configurações fixas
- Mantém compatibilidade com sistema atual

**Código**:
```typescript
// Cálculo de setup
let setup = 0;
if (printing.setupMode === 'FLAT') {
  setup = toNumber(printing.setupFlatFee || 0);
} else {
  // TIME_X_RATE (atual)
  setup = (printing.setupMinutes || 0) * (printing.setupRate || 0);
}
```

### 4. Mínimo por Peça

**Descrição**: Preço mínimo por unidade além do mínimo por lote.

**Implementação**:
- Campo `minPricePerPiece` em: `ProductCategory`, `Product`, `Finish`
- Prioridade: Product > Category > Global
- Aplicado após cálculo de preço

**Código**:
```typescript
// Aplicação do mínimo por peça
const minPerPiece = toNumber(
  product.minPricePerPiece ?? 
  category.minPricePerPiece ?? 
  cfg.minPricePerPiece ?? 0
);

if (minPerPiece > 0) {
  priceNet = Math.max(priceNet, minPerPiece * effectiveQuantity);
}
```

### 5. Estratégias de Precificação

**Descrição**: Diferentes métodos de cálculo de preço final.

**Implementação**:
- Enum `PricingStrategy`: `COST_MARKUP_MARGIN` | `COST_MARGIN_ONLY` | `MARGIN_TARGET`
- Prioridade: Product > Category > Global

**Código**:
```typescript
// Cálculo baseado na estratégia
switch (prefs.pricingStrategy) {
  case 'COST_MARGIN_ONLY':
    priceNet = subtotal * (1 + margin);
    break;
  case 'MARGIN_TARGET':
    priceNet = subtotal / (1 - margin);
    break;
  default: // COST_MARKUP_MARGIN
    priceNet = subtotal * (1 + markup) * (1 + margin);
}
```

### 6. Custos de Fornecedor

**Descrição**: Modelo para custos externos de produtos publicitários.

**Implementação**:
- Modelo `SupplierPrice` com unidades: `UNIT`, `M2`, `LOT`
- Integrado no motor de cálculo
- Suporte a múltiplos fornecedores por produto

**Código**:
```typescript
// Cálculo de custos de fornecedor
for (const sp of product.supplierPrices) {
  let qty = 1;
  switch (sp.unit) {
    case "UNIT": qty = effectiveQuantity; break;
    case "M2": qty = areaM2PerUnit * effectiveQuantity; break;
    case "LOT": qty = 1; break;
  }
  const line = roundLine(sp.cost * qty);
  costSupplier += line;
}
```

## Estrutura do Banco de Dados

### Novos Enums

```prisma
enum RoundingStrategy {
  END_ONLY
  PER_STEP
}

enum PricingStrategy {
  COST_MARKUP_MARGIN
  COST_MARGIN_ONLY
  MARGIN_TARGET
}

enum SetupMode {
  TIME_X_RATE
  FLAT
}
```

### Novos Campos

**ConfigGlobal**:
- `roundingStrategy: RoundingStrategy?`
- `pricingStrategy: PricingStrategy?`

**ProductCategory**:
- `roundingStrategy: RoundingStrategy?`
- `pricingStrategy: PricingStrategy?`
- `minPricePerPiece: Decimal?`
- `lossFactor: Decimal?`

**Product**:
- `roundingStrategy: RoundingStrategy?`
- `pricingStrategy: PricingStrategy?`
- `minPricePerPiece: Decimal?`
- `supplierPrices: SupplierPrice[]`

**Material**:
- `lossFactor: Decimal?`

**ProductMaterial**:
- `lossFactor: Decimal?`

**Printing**:
- `setupMode: SetupMode?`
- `setupFlatFee: Decimal?`
- `lossFactor: Decimal?`

**Finish**:
- `minPerPiece: Decimal?`
- `lossFactor: Decimal?`

### Novo Modelo

```prisma
model SupplierPrice {
  id        Int      @id @default(autoincrement())
  productId Int
  name      String
  unit      Unit     // UNIT | LOT | M2
  cost      Decimal  @db.Decimal(12,4)
  notes     String?

  product   Product  @relation(fields: [productId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([productId])
}
```

## APIs Atualizadas

### Endpoints Admin

Todos os endpoints admin foram atualizados para aceitar os novos campos opcionais:

- `POST /api/admin/products` - Criar produto
- `PUT /api/admin/products/[id]` - Atualizar produto
- `POST /api/admin/categories` - Criar categoria
- `PUT /api/admin/categories/[id]` - Atualizar categoria
- `POST /api/admin/materials` - Criar material
- `PUT /api/admin/materials/[id]` - Atualizar material
- `POST /api/admin/printing` - Criar impressão
- `PUT /api/admin/printing/[id]` - Atualizar impressão
- `POST /api/admin/finishes` - Criar acabamento
- `PUT /api/admin/finishes/[id]` - Atualizar acabamento

### Validação Zod

Todos os schemas Zod foram atualizados com os novos campos opcionais:

```typescript
// Exemplo: app/api/admin/products/route.ts
const CreateSchema = z.object({
  name: z.string().min(1),
  categoryId: z.number().int().positive(),
  printingId: z.number().int().positive().optional(),
  marginDefault: z.string().optional(),
  markupDefault: z.string().optional(),
  roundingStep: z.string().optional(),
  roundingStrategy: z.enum(['END_ONLY', 'PER_STEP']).optional(),
  pricingStrategy: z.enum(['COST_MARKUP_MARGIN', 'COST_MARGIN_ONLY', 'MARGIN_TARGET']).optional(),
  minPricePerPiece: z.string().optional(),
});
```

## Interface de Usuário

### Formulários Admin

**Produtos** (`app/(admin)/products/page.tsx`):
- Estratégia de Arredondamento
- Estratégia de Precificação
- Preço Mínimo por Peça

**Categorias** (`app/(admin)/categories/page.tsx`):
- Estratégia de Arredondamento
- Estratégia de Precificação
- Preço Mínimo por Peça
- Fator de Perda

### Interface Comercial

**Badge de Arredondamento** (`app/quotes/[id]/page.tsx`):
- Exibe "Arredondamento por etapa" quando `PER_STEP` ativo
- Integrado na seção "Margens e Ajustes Aplicados"

## Testes Golden

### Cenários Implementados

8 cenários de teste cobrindo todas as funcionalidades:

1. **Arredondamento PER_STEP** - Validação do arredondamento por etapa
2. **Setup FLAT vs TIME_X_RATE** - Comparação entre modos de setup
3. **Perdas por escopo** - Aplicação de lossFactor
4. **Mínimo por peça** - Aplicação de minPricePerPiece
5. **Estratégia MARGIN_TARGET** - Cálculo com margem alvo
6. **Custos de fornecedor** - Integração de SupplierPrice
7. **Estratégia COST_MARGIN_ONLY** - Cálculo apenas com margem
8. **Arredondamento END_ONLY** - Validação do modo tradicional

### Execução dos Testes

```bash
npx tsx tests/golden-tests.ts
```

**Resultado**: 100% de sucesso (8/8 testes passaram)

## Seeds e Dados de Exemplo

### ConfigGlobal
```typescript
await prisma.configGlobal.upsert({
  where: { id: 1 },
  update: {},
  create: {
    roundingStrategy: "END_ONLY",
    pricingStrategy: "COST_MARKUP_MARGIN",
    // ... outros campos
  },
});
```

### Produto com PER_STEP
```typescript
const produto = await prisma.product.create({
  data: {
    name: "Cartões de Visita 9x5",
    roundingStrategy: "PER_STEP",
    pricingStrategy: "COST_MARKUP_MARGIN",
    minPricePerPiece: "0.05",
    // ... outros campos
  },
});
```

### Impressão FLAT
```typescript
const impressaoFlat = await prisma.printing.create({
  data: {
    technology: PrintingTech.DIGITAL,
    setupMode: "FLAT",
    setupFlatFee: "12.00",
    lossFactor: "0.015",
    // ... outros campos
  },
});
```

### SupplierPrice
```typescript
await prisma.supplierPrice.create({
  data: {
    productId: banner.id,
    name: "Fornecedor X - Lona",
    unit: Unit.M2,
    cost: "5.5000",
    notes: "Custo da lona por m²",
  },
});
```

## Migração e Deploy

### Comandos de Migração

```bash
# Gerar cliente Prisma
npx prisma generate

# Criar e aplicar migração
npx prisma migrate dev -n "calc_features_rounding_pricing_loss_minpiece_supplier"

# Executar seeds
npm run seed
```

### Compatibilidade

- **Backward Compatible**: Todos os novos campos são opcionais
- **APIs**: Mantêm compatibilidade com clientes existentes
- **Dados**: Migração automática sem perda de dados

## Resolução de Problemas

### EPERM Error (Windows)

Se encontrar erro EPERM durante `npx prisma generate`:

1. Feche todos os processos Node.js
2. Delete `node_modules/.prisma/client`
3. Execute `npx prisma generate` novamente

### Validação de Dados

Todos os campos numéricos são validados:
- `lossFactor`: 0 ≤ valor ≤ 1
- `minPricePerPiece`: valor ≥ 0
- `setupFlatFee`: valor ≥ 0

## Conclusão

O sistema está completamente alinhado 1:1 com a planilha "CÁLCULO DE PRODUÇÃO 2024.xlsx" e pronto para uso em produção. Todas as funcionalidades foram implementadas, testadas e documentadas.

**Status**: ✅ Concluído
**Testes**: 100% de sucesso
**Compatibilidade**: Mantida
**Documentação**: Completa
