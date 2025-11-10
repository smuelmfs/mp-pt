# 🔧 Ajustes Realizados no Sistema

**Data:** $(date)

---

## ✅ **AJUSTES DE CUSTOS:**

### **1. Acabamentos - Pastas A4:**

| Acabamento | Custo Anterior | Custo Ajustado | Observação |
|------------|----------------|----------------|------------|
| **CORTE NORMAL** | €5.00 | €0.02 | Por unidade |
| **Plastificação 1 Face** | €85.00 | €0.50 | Por unidade |
| **Dobra** | €17.50 | €0.07 | Por unidade |
| **Foil 1 Face** | €170.00 | €1.00 | Por unidade |
| **Bolsa** | Não existia | €0.50 | Criado |
| **Ferragem** | Não existia | €0.50 | Criado |

### **2. Materiais - Pastas A4:**

- **qtyPerUnit** ajustado de `0.0624` para `1.0000` (1 SHEET por unidade)

### **3. Envelopes:**

- **Envelope DL 90 Janela**: Custo ajustado de €0.0000 para €0.05 por unidade
- **Impressão DL**: Já estava correta (€0.12)

---

## 📊 **RESULTADOS DOS TESTES (APÓS AJUSTES):**

### **PASTAS A4:**

1. **Pasta A4 50 (Qtd: 25)**
   - Planilha: €66.00
   - Sistema: €54.05
   - Diferença: -€11.95 (-18.11%)
   - **Status:** ⚠️ Melhorou significativamente (antes era +6,293%)

2. **Pasta A4 80 (Qtd: 40)**
   - Planilha: €105.60
   - Sistema: €72.30
   - Diferença: -€33.30 (-31.53%)
   - **Status:** ⚠️ Melhorou significativamente (antes era +6,280%)

3. **Pasta A4 SRA3 (Qtd: 50)**
   - Planilha: €25.00
   - Sistema: €84.70
   - Diferença: +€59.70 (+238.80%)
   - **Status:** ⚠️ "SRA3" é formato, não produto completo

### **ENVELOPES:**

- **Envelope DL 90 JANELA (Qtd: 50)**
   - Planilha: €0.68 unitário (€34.00 total)
   - Sistema: €0.28 unitário (€13.75 total)
   - Diferença: -€20.25 (-59.56%)
   - **Status:** ⚠️ Sistema calculando menos que a planilha

---

## 🔍 **PROBLEMAS IDENTIFICADOS:**

### **1. Margem na Planilha vs Sistema:**

- **Planilha:** Usa "% LUCRO" que parece ser multiplicador (300% = 3.0)
- **Sistema:** Usa margem de 30% (0.30)
- **Diferença:** A planilha pode estar usando margem maior

### **2. Cálculo de Envelopes:**

- **Planilha:** Custo Total Prod. €8.50 → Total €34.00 (margem 300%)
- **Sistema:** Subtotal €8.74 → Total €13.75 (margem 30%)
- **Problema:** Sistema está usando margem menor

### **3. Produtos vs Formatos:**

- "SRA3", "50", "80" são formatos/dimensões, não produtos completos
- A planilha tem produtos com descrições completas como "PASTAS A4 IMP. 1 LADO PLASTI 1 LADO BOLSA"

---

## 📋 **PRÓXIMOS PASSOS:**

1. ✅ Verificar se a margem está sendo aplicada corretamente
2. ✅ Verificar se os produtos estão associados corretamente aos acabamentos
3. ✅ Comparar breakdown detalhado (material, impressão, acabamento)
4. ✅ Ajustar margens dinâmicas se necessário

---

**Status:** 🟡 **Melhorou Significativamente** - Valores muito mais próximos da planilha, mas ainda há diferenças a investigar

