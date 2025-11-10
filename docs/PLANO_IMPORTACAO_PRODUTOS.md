# 📦 Plano de Importação de Produtos

## ✅ Status Atual

### Acabamentos ✅
- ✅ **13 acabamentos importados:**
  - Plastificação (1 Face, 2 Faces, por quantidade, Banner)
  - Foil (1 Face, 2 Faces, por quantidade)
  - Vinco
  - Dobra
  - Cortes (A3, A4, A5, NORMAL, etc.)

### Produtos ⚠️
- ⚠️ **0 produtos no sistema**
- ✅ Scripts de importação existem mas não foram executados

---

## 🎯 Próximos Passos - Importação de Produtos

### **Opção 1: Importar Cartões de Visita** ⭐⭐⭐ (RECOMENDADO)

**Por quê começar aqui?**
- É um produto simples e bem definido
- Tem estrutura clara no Excel
- Serve como base para outros produtos

**Script disponível:** `scripts/import-products-businesscards.ts`  
**Comando:** `npm run import:products:businesscards`

**Requisitos:**
- Arquivo `data/normalized/products.businesscards.json` deve existir
- Materiais de papel já importados ✅
- Impressões básicas já importadas ✅
- Acabamentos (corte, plastificação, foil) já importados ✅

---

### **Opção 2: Importar Produtos Flex** ⭐⭐

**Script disponível:** `scripts/import-products-flex.ts`  
**Comando:** `npm run import:flex`

**Requisitos:**
- Materiais FLEX já importados ✅
- Impressões Grande Formato já importadas ✅

---

### **Opção 3: Importar Produtos Alveolar** ⭐⭐

**Script disponível:** `scripts/import-products-alveolar.ts`  
**Comando:** `npm run import:alveolar`

**Requisitos:**
- Materiais Alveolar já importados ✅
- Impressões UV já importadas ✅

---

### **Opção 4: Importar Outros Produtos**

- **Cartões PVC:** `npm run import:products:cards-pvc`
- **Pastas A4:** `npm run import:products:folders-a4`
- **Têxteis:** `npm run import:textiles`

---

## 📋 Checklist de Preparação

Antes de importar produtos, verificar:

- [x] Materiais importados (PAPEL, VINIL, ALVEOLAR, FLEX)
- [x] Impressões importadas (DIGITAL, GRANDE_FORMATO, UV)
- [x] Acabamentos importados (CORTE, LAMINACAO, DOBRA, OUTROS)
- [ ] Dados normalizados existem (`data/normalized/`)
- [ ] Categorias de produtos criadas
- [ ] Scripts de importação funcionando

---

## 🚀 Recomendação

**Começar com Cartões de Visita** porque:
1. É um produto comum e bem definido
2. Tem estrutura clara
3. Serve como teste para outros produtos
4. Todos os requisitos já estão atendidos

**Próximo passo:** Verificar se `data/normalized/products.businesscards.json` existe e executar a importação.

