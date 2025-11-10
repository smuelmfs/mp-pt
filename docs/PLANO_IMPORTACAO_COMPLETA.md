# 📦 Plano de Importação Completa

**Data:** $(date)

---

## 📊 **Status Atual:**

- ✅ **5 produtos** (Cartões de Visita)
- ✅ **13 clientes** ativos
- ✅ **8 fornecedores** ativos
- ✅ **42 materiais** ativos
- ✅ **56 impressões** ativas
- ✅ **21 acabamentos** ativos

---

## 🎯 **Plano de Ação:**

### **FASE 1: Verificar e Criar Scripts de Extração** ⭐⭐⭐

Muitos scripts de importação existem mas precisam de arquivos JSON normalizados. Vou criar scripts de extração do Excel para cada tipo de produto.

#### Produtos que precisam de extração:
1. ⏳ **Envelopes** - Script de importação existe, precisa de `data/normalized/envelopes.json`
2. ⏳ **Pastas A4** - Script de importação existe, precisa de `data/normalized/products.folders-a4.json`
3. ⏳ **Flex** - Script de importação existe, precisa de `data/normalized/products.flex.json`
4. ⏳ **Alveolar** - Script de importação existe, precisa de `data/normalized/products.alveolar.json`
5. ⏳ **Cartões PVC** - Script de importação existe, precisa de `data/normalized/products.cards-pvc.json`
6. ⏳ **Têxteis** - Script de importação existe, precisa de `data/normalized/products.textiles.json`
7. ⏳ **Catálogos** - Script de importação NÃO existe, precisa criar tudo

---

### **FASE 2: Importar Produtos** ⭐⭐⭐

Após criar os arquivos normalizados, executar as importações:

```bash
# Envelopes
npm run import:envelopes

# Pastas A4
npm run import:products:folders-a4

# Flex
npm run import:flex

# Alveolar
npm run import:alveolar

# Cartões PVC
npm run import:products:cards-pvc

# Têxteis
npm run import:textiles
```

---

### **FASE 3: Verificar Clientes e Fornecedores** ⭐⭐

#### Clientes:
- ✅ 13 clientes já importados
- ⏳ Verificar se há mais clientes no Excel que não foram importados
- ⏳ Validar se todos os clientes têm preços configurados

#### Fornecedores:
- ✅ 8 fornecedores já importados (INAPA, ANTALIS, genéricos)
- ⏳ Verificar se há mais fornecedores no Excel
- ⏳ Validar se todos os materiais têm fornecedores associados

---

## 🚀 **Ordem de Execução Recomendada:**

1. **Criar scripts de extração** para cada tipo de produto
2. **Extrair dados do Excel** para JSON normalizado
3. **Importar produtos** um por um, validando cada importação
4. **Verificar clientes** e importar novos se necessário
5. **Verificar fornecedores** e importar novos se necessário
6. **Validar dados** importados (materiais, acabamentos, preços)

---

## 📋 **Checklist:**

- [ ] Scripts de extração criados
- [ ] Arquivos JSON normalizados gerados
- [ ] Produtos Envelopes importados
- [ ] Produtos Pastas A4 importados
- [ ] Produtos Flex importados
- [ ] Produtos Alveolar importados
- [ ] Produtos Cartões PVC importados
- [ ] Produtos Têxteis importados
- [ ] Produtos Catálogos criados e importados
- [ ] Clientes validados e atualizados
- [ ] Fornecedores validados e atualizados
- [ ] Validação final dos dados

---

**Status:** 🟡 **Em Progresso** - Preparando scripts de extração

