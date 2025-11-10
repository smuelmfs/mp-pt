# 🎨 Plano de Melhorias de UI/UX - Fase 1

## 📊 Comparação: Materiais vs Impressões vs Acabamentos

### ✅ **Página de Materiais** (Referência - Já tem tudo)
- ✅ Busca com debounce
- ✅ Filtros múltiplos (tipo, unidade, ativo/inativo, fornecedor)
- ✅ Ordenação (nome, custo, tipo)
- ✅ Modal de criação completo:
  - Fornecedor (input com datalist - cria dinamicamente)
  - Custo do fornecedor
  - Campos para cálculo automático (rolo/pack)
  - Resumo de custos em tempo real
- ✅ Cards mostrando fornecedor e custo
- ✅ Página de detalhe com:
  - Edição completa
  - Variantes
  - Resumo de custos (incluindo variantes)

---

### ⚠️ **Página de Impressões** (Precisa melhorias)

#### **Listagem (`/printing/page.tsx`):**
- ❌ **Sem busca** - Precisa adicionar
- ❌ **Sem filtros** - Precisa adicionar (tecnologia, ativo/inativo)
- ❌ **Sem ordenação** - Precisa adicionar
- ✅ Modal de criação básico (OK)
- ✅ Cards básicos (OK, mas pode melhorar)

#### **Detalhe (`/printing/[id]/page.tsx`):**
- ✅ Mostra preços por cliente (já tem)
- ❌ **Sem fornecedor** - Se houver fornecedor de impressão, mostrar
- ❌ **Sem resumo de custos** - Pode adicionar se relevante
- ✅ Edição básica (OK)

---

### ⚠️ **Página de Acabamentos** (Precisa melhorias)

#### **Listagem (`/finishes/page.tsx`):**
- ❌ **Sem busca** - Precisa adicionar
- ❌ **Sem filtros** - Precisa adicionar (categoria, unidade, ativo/inativo)
- ❌ **Sem ordenação** - Precisa adicionar
- ✅ Modal de criação básico (OK)
- ✅ Cards básicos (OK, mas pode melhorar)

#### **Detalhe (`/finishes/[id]/page.tsx`):**
- ❌ **Sem preços por cliente** - Precisa adicionar (mesmo padrão de impressões)
- ❌ **Sem resumo de custos** - Pode adicionar se relevante
- ✅ Edição básica (OK)

---

## 🎯 Melhorias Propostas

### **1. Página de Impressões - Listagem**

#### Adicionar:
- [ ] **Busca** com debounce (por `formatLabel`, `technology`, `colors`)
- [ ] **Filtros:**
  - Tecnologia (OFFSET, DIGITAL, UV, GRANDE_FORMATO)
  - Estado (Ativo/Inativo/Todos)
- [ ] **Ordenação:**
  - Por nome (`formatLabel`)
  - Por tecnologia
  - Por preço unitário
- [ ] **Melhorias nos cards:**
  - Mostrar fornecedor (se houver)
  - Melhor formatação de preços

---

### **2. Página de Impressões - Detalhe**

#### Adicionar:
- [ ] **Seção de Fornecedor** (se houver no schema)
- [ ] **Resumo de Custos** (se relevante)
- [ ] **Melhorar visualização de preços por cliente:**
  - Tabela mais clara
  - Links para clientes
  - Indicadores visuais

---

### **3. Página de Acabamentos - Listagem**

#### Adicionar:
- [ ] **Busca** com debounce (por `name`, `category`)
- [ ] **Filtros:**
  - Categoria (LAMINACAO, VERNIZ, CORTE, DOBRA, OUTROS)
  - Unidade (UNIT, M2, SHEET, etc.)
  - Estado (Ativo/Inativo/Todos)
- [ ] **Ordenação:**
  - Por nome
  - Por categoria
  - Por custo base
- [ ] **Melhorias nos cards:**
  - Melhor formatação de preços
  - Indicadores visuais

---

### **4. Página de Acabamentos - Detalhe**

#### Adicionar:
- [ ] **Seção de Preços por Cliente** (mesmo padrão de impressões):
  - Tabela com clientes
  - Adicionar/editar/remover preços
  - Links para clientes
- [ ] **Resumo de Custos** (se relevante)
- [ ] **Melhorar layout geral**

---

## 📋 Ordem de Implementação Sugerida:

### **Sprint 1 (Essencial):**
1. ✅ Adicionar busca e filtros na listagem de Impressões
2. ✅ Adicionar busca e filtros na listagem de Acabamentos
3. ✅ Adicionar preços por cliente na página de detalhe de Acabamentos

### **Sprint 2 (Melhorias):**
4. ✅ Melhorar cards e visualização
5. ✅ Adicionar ordenação
6. ✅ Melhorar página de detalhe de Impressões

---

## 🔍 Verificações Necessárias:

1. **Schema de Impressões:**
   - Verificar se há campo `supplierId` ou similar
   - Verificar se há relacionamento com fornecedores

2. **Schema de Acabamentos:**
   - Verificar se há campo `supplierId` ou similar
   - Verificar estrutura de `FinishCustomerPrice`

3. **APIs:**
   - Verificar se `/api/admin/printing` suporta filtros
   - Verificar se `/api/admin/finishes` suporta filtros
   - Verificar se `/api/admin/customer-prices/finishes` está funcionando

---

## ✅ Próximo Passo:

Começar pela **Sprint 1** - Adicionar busca e filtros nas listagens e preços por cliente em acabamentos.

