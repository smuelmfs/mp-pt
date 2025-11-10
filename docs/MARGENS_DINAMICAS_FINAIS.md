# 📊 Configuração Final de Margens (Incluindo Dinâmicas)

**Data:** $(date)

---

## ✅ **MARGENS FIXAS:**

### 1. **Margem Global** ✅
- **Valor:** 30% (0.30)
- **Aplicação:** Todas as cotações (fallback)

### 2. **Margens por Categoria** ✅

| Categoria | Margem | Observações |
|-----------|--------|-------------|
| **Papelaria** | 30% | Padrão |
| **Pastas A4** | 30% | Padrão |
| **Grande Formato — Flex/Postes/Tendas** | 40% | Específico |
| **Placas rígidas** | 30% | Padrão |
| **Cartões PVC** | 4% | Específico |
| **Têxteis Personalizados** | 30% | Padrão (produtos individuais têm 40%) |

### 3. **Margens por Produto** ✅

#### **Têxteis (40%):**
- T-SHIRT_BASIC: 40%
- POLO_BASIC: 40%
- SWEAT_BASIC: 40%

#### **Cartões PVC (4%):**
- Cartão PVC BRANCO SIMPLES CMYK Frente: 4%
- Cartão PVC BRANCO BANDA MAGNETICA K Frente: 4%
- Cartão PVC BRANCO CHIP CMYK F/V: 4%
- Cartão PVC CLIENTE CMYK Frente: 4%

#### **Envelopes DL (3% base):**
- Envelope DL 90 JANELA: 3% (com ajustes dinâmicos)

---

## 🔄 **MARGENS DINÂMICAS:**

### **Por Quantidade:**

#### **1. ENVELOPES DL (Produto específico):**
- **Base:** 3%
- **Qtd >= 50:** +1% (total 4%)
- **Qtd >= 200:** +17% (total 20%)

#### **2. PASTAS A4 (Categoria):**
- **Base:** 30%
- **Qtd >= 100:** -1% (total 29%)
- **Qtd >= 250:** -2% (total 28%)
- **Qtd >= 500:** -3% (total 27%)

#### **3. PAPELARIA (Categoria):**
- **Base:** 30%
- **Qtd >= 100:** -1% (total 29%)
- **Qtd >= 500:** -2% (total 28%)
- **Qtd >= 1000:** -3% (total 27%)

### **Por Subtotal:**

#### **4. GRANDE FORMATO (Categoria):**
- **Base:** 40%
- **Subtotal >= €100:** -2% (total 38%)
- **Subtotal >= €500:** -5% (total 35%)
- **Subtotal >= €1000:** -8% (total 32%)

#### **5. PLACAS RÍGIDAS (Categoria):**
- **Base:** 30%
- **Subtotal >= €200:** -2% (total 28%)
- **Subtotal >= €500:** -5% (total 25%)
- **Subtotal >= €1000:** -8% (total 22%)

---

## 📋 **HIERARQUIA DE APLICAÇÃO:**

1. **Margem por Produto** (mais específica)
2. **Ajustes Dinâmicos por Produto** (aplicados sobre margem do produto)
3. **Margem por Categoria**
4. **Ajustes Dinâmicos por Categoria** (aplicados sobre margem da categoria)
5. **Margem Global** (fallback)

**Ordem de Prioridade dos Ajustes Dinâmicos:**
- Menor número de prioridade = aplica primeiro
- Ajustes são cumulativos (se `stackable: false`, apenas o mais relevante aplica)

---

## 🎯 **VALORES BASEADOS NA PLANILHA:**

### Análise Detalhada:
- **ENVELOPES DL:** 3% base, 20% para qtd >= 200 ✅
- **PASTAS A4:** 3% base, ajustes por quantidade ✅
- **FLEX/Têxteis:** 40% ✅
- **Cartões PVC:** 4% ✅
- **Grande Formato:** 40% base, ajustes por subtotal ✅
- **Placas rígidas:** 30% base, ajustes por subtotal ✅

---

## ⚙️ **CONFIGURAÇÕES:**

- **Margem padrão global:** 30%
- **Markup operacional:** 20%
- **IVA:** 23%
- **Fator de perda:** 3%
- **Degrau de arredondamento:** 0.05

---

## 📊 **STATUS FINAL:**

✅ **Margem Global:** 1 criada (30%)  
✅ **Margens por Categoria:** 6 criadas  
✅ **Margens por Produto:** 8 criadas  
✅ **Margens Dinâmicas:** 14 criadas

**Total:** 29 regras de margem ativas

---

## 🔍 **EXEMPLOS DE CÁLCULO:**

### Exemplo 1: Envelope DL, Qtd 250
- Margem base (produto): 3%
- Ajuste dinâmico (Qtd >= 200): +17%
- **Margem final:** 20%

### Exemplo 2: Pasta A4, Qtd 300
- Margem base (categoria): 30%
- Ajuste dinâmico (Qtd >= 250): -2%
- **Margem final:** 28%

### Exemplo 3: Grande Formato, Subtotal €600
- Margem base (categoria): 40%
- Ajuste dinâmico (Subtotal >= €500): -5%
- **Margem final:** 35%

---

## ✅ **VALIDAÇÃO:**

- ✅ Valores ajustados conforme análise da planilha
- ✅ Margens dinâmicas criadas para produtos/categorias relevantes
- ✅ Ajustes conservadores (não muito agressivos)
- ✅ Hierarquia de aplicação correta
- ✅ Prioridades configuradas corretamente

---

**Status Geral:** 🟢 **Configurado e Validado** - Sistema completo de margens fixas e dinâmicas

