# 🚀 Próximos Passos - Importação do Excel

## ✅ O que já foi feito:

1. **Análise completa do Excel** - 15 abas identificadas e mapeadas
2. **Validação de materiais**:
   - ✅ PAPEL - Validado (15 materiais, preços corretos)
   - ✅ VINIL - Importado via seed (12 materiais)
   - ✅ ALVEOLAR - Importado via seed (6 materiais)
3. **Correção de preços** - Verificado (já estavam corretos)

---

## 📋 Próximos Passos Sugeridos (em ordem de prioridade):

### **Fase 1: Impressões e Acabamentos** (Fundamental)

#### 1.1. Importar Impressões Básicas (Aba "IMPRESSÃO")
**Prioridade: ALTA** ⭐⭐⭐

- **O que fazer:**
  - Importar impressões básicas (A4, SRA4, A3, SRA3, etc.)
  - Mapear para `Printing` model
  - Campos: `formatLabel`, `technology` (DIGITAL), `unitPrice`, `colors` (K, CMYK)

- **Dados:**
  - ~1000 linhas
  - Colunas: FORMATO IMPRESSÃO, COR, PREÇO POR IMPRESSÃO

- **Script sugerido:** `prisma/seed.printings.basic.ts`

---

#### 1.2. Importar Acabamentos (Aba "ACABAMENTO")
**Prioridade: ALTA** ⭐⭐⭐

- **O que fazer:**
  - Importar custos de corte (NORMAL, A5, A4, A3, etc.)
  - Mapear para `Finish` model
  - Campos: `name`, `category` (CORTE), `baseCost`, `unit`

- **Dados:**
  - ~1014 linhas
  - Colunas: FORMATO, VALOR, QUANTIDADE, VALOR TOTAL

- **Script sugerido:** `prisma/seed.finishes.cuts.ts`

---

### **Fase 2: Impressões Específicas** (Importante)

#### 2.1. Importar Impressões Singulares (Aba "IMPRESSÕES SINGULARES")
**Prioridade: MÉDIA** ⭐⭐

- **O que fazer:**
  - Importar impressões específicas com papel, gramagem, cortes, plastificação, vinco
  - Criar `Printing` com configurações específicas
  - Associar com `Material` e `Finish`

- **Dados:**
  - ~854 linhas
  - Estrutura complexa com múltiplas colunas

- **Script sugerido:** `prisma/seed.printings.singular.ts`

---

#### 2.2. Importar Impressões Grande Formato (Aba "IMP. GRANDE FORMATO")
**Prioridade: MÉDIA** ⭐⭐

- **O que fazer:**
  - Validar/atualizar impressões de grande formato existentes
  - Adicionar novos fornecedores se necessário
  - Atualizar preços por m²

- **Dados:**
  - ~1002 linhas
  - Colunas: IMPRESSÃO, FORNECEDOR, Preço m², % LUCRO

- **Script sugerido:** `prisma/patch.printings.grande-formato.ts`

---

#### 2.3. Importar Impressões UV (Aba "IMPRESSÃO UV")
**Prioridade: MÉDIA** ⭐⭐

- **O que fazer:**
  - Importar materiais e impressões UV
  - Configurar cálculos de m² e gabaritos
  - Criar `Printing` com technology UV

- **Dados:**
  - ~33 linhas
  - Estrutura complexa com cálculos

- **Script sugerido:** `prisma/seed.printings.uv.ts`

---

### **Fase 3: Produtos** (Completa o sistema)

#### 3.1. Importar Cartões de Visita (Aba "CARTÕES DE VISITA")
**Prioridade: MÉDIA** ⭐⭐

- **O que fazer:**
  - Criar `Product` categoria "Cartões de Visita"
  - Configurar preços por quantidade (tiers)
  - Associar acabamentos (corte, plastificação, foil)

- **Dados:**
  - ~1013 linhas
  - Estrutura complexa com múltiplas opções

- **Script sugerido:** `prisma/seed.products.business-cards.ts`

---

#### 3.2. Importar Catálogos (Aba "CÁLCULO CATALOGOS")
**Prioridade: MÉDIA** ⭐⭐

- **O que fazer:**
  - Criar `Product` categoria "Catálogos"
  - Configurar impressão, papel, cortes, plastificação, laminação foil
  - Aplicar margens de lucro específicas

- **Dados:**
  - ~894 linhas

- **Script sugerido:** `prisma/seed.products.catalogs.ts`

---

#### 3.3. Importar Envelopes (Aba "ENVELOPES")
**Prioridade: BAIXA** ⭐

- **O que fazer:**
  - Criar `Product` categoria "Envelopes"
  - Configurar formatos (DL 90, DL 120) e tipos (JANELA, S JANELA)
  - Associar impressões e materiais

- **Dados:**
  - ~979 linhas

- **Script sugerido:** `prisma/seed.products.envelopes.ts`

---

#### 3.4. Importar Pastas A4 (Aba "PASTAS PARA A4")
**Prioridade: BAIXA** ⭐

- **O que fazer:**
  - Criar `Product` categoria "Pastas A4"
  - Configurar papel, gramagem, corte, plastificação, dobra

- **Dados:**
  - ~1004 linhas

- **Script sugerido:** `prisma/seed.products.folders-a4.ts`

---

#### 3.5. Importar Flex (Aba "FLEX")
**Prioridade: BAIXA** ⭐

- **O que fazer:**
  - Criar `Product` categoria "Flex"
  - Configurar medidas e personalização (logos, faces)

- **Dados:**
  - ~1002 linhas

- **Script sugerido:** `prisma/seed.products.flex.ts`

---

#### 3.6. Importar Cartões PVC (Aba "CARTOES PVC")
**Prioridade: BAIXA** ⭐

- **O que fazer:**
  - Criar `Product` categoria "Cartões PVC"
  - Configurar tipos, cartuxo, tempo de produção

- **Dados:**
  - ~15 linhas (pequeno)

- **Script sugerido:** `prisma/seed.products.cards-pvc.ts`

---

### **Fase 4: Validação e Ajustes Finais**

#### 4.1. Validar/Atualizar Produtos Publicitários (Aba "PRODUTOS PUBLICITÁRIOS")
**Prioridade: ALTA** ⭐⭐⭐

- **O que fazer:**
  - Validar produtos existentes
  - Adicionar novos produtos se necessário
  - Atualizar preços por cliente
  - Verificar margens de lucro

- **Dados:**
  - ~1000 linhas
  - Colunas: CLIENTE, PRODUTO, SUPORTE, IMPRESSÃO, % LUCRO

- **Script sugerido:** `prisma/patch.products.publicitarios.ts`

---

#### 4.2. Criar Relatório de Validação Final
**Prioridade: MÉDIA** ⭐⭐

- **O que fazer:**
  - Comparar todos os dados importados com o Excel
  - Gerar relatório de diferenças
  - Identificar gaps e inconsistências

- **Script sugerido:** `scripts/validate-all-imports.ts`

---

## 🎯 Recomendação de Ordem de Execução:

### **Sprint 1 (Essencial - 1-2 dias):**
1. ✅ Importar Impressões Básicas
2. ✅ Importar Acabamentos (Cortes)
3. ✅ Validar Produtos Publicitários

### **Sprint 2 (Importante - 2-3 dias):**
4. ✅ Importar Impressões Singulares
5. ✅ Importar Impressões Grande Formato
6. ✅ Importar Impressões UV

### **Sprint 3 (Completar - 3-5 dias):**
7. ✅ Importar Cartões de Visita
8. ✅ Importar Catálogos
9. ✅ Importar demais produtos (Envelopes, Pastas, Flex, PVC)

### **Sprint 4 (Validação - 1 dia):**
10. ✅ Relatório de Validação Final
11. ✅ Ajustes finais

---

## 📝 Notas Importantes:

1. **Idempotência:** Todos os scripts devem ser idempotentes (poder rodar múltiplas vezes sem duplicar dados)

2. **Validação:** Sempre validar dados antes de importar (formato, tipos, valores nulos)

3. **Fornecedores:** Criar fornecedores automaticamente se não existirem

4. **Categorias:** Criar categorias de produtos se não existirem

5. **Margens:** Extrair e aplicar margens de lucro corretamente

6. **Testes:** Testar cada importação em ambiente de desenvolvimento antes de produção

---

## 🚀 Começar Agora?

**Sugestão:** Começar pela **Fase 1** (Impressões Básicas e Acabamentos), pois são fundamentais para o sistema funcionar.

Posso criar os scripts de importação para qualquer uma dessas fases. Qual você prefere começar?

