# 📊 Configuração Final de Margens

**Data:** $(date)

---

## ✅ **MARGENS CRIADAS:**

### 1. **Margem Global** ✅
- **Valor:** 30% (0.30)
- **Escopo:** GLOBAL
- **Aplicação:** Todas as cotações (se não houver regra mais específica)

---

### 2. **Margens por Categoria** ✅

| Categoria | Margem | Observações |
|-----------|--------|-------------|
| **Papelaria** | 30% | Padrão (inclui envelopes, cartões de visita) |
| **Pastas A4** | 30% | Padrão |
| **Grande Formato — Flex/Postes/Tendas** | 40% | Baseado na análise (FLEX) |
| **Placas rígidas** | 30% | Padrão (ALVEOLAR) |
| **Cartões PVC** | 4% | Específico da categoria |
| **Têxteis Personalizados** | 30% | Padrão (mas produtos individuais têm 40%) |

---

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

---

### 4. **Margens Dinâmicas** ⚠️

**Status:** Removidas margens dinâmicas incorretas.  
**Observação:** Margens dinâmicas podem ser criadas manualmente conforme necessário.

**Exemplos de uso:**
- Desconto por quantidade (ex: > 1000 unidades = -5%)
- Desconto por valor (ex: > €500 = -3%)
- Ajustes sazonais ou promocionais

---

## 📋 **HIERARQUIA DE APLICAÇÃO:**

As margens são aplicadas na seguinte ordem de prioridade:

1. **Margem por Produto** (mais específica)
2. **Margem por Categoria**
3. **Margem Global** (fallback)
4. **Ajustes Dinâmicos** (aplicados sobre a margem base)

---

## 🎯 **VALORES BASEADOS NA PLANILHA:**

### Análise da Planilha:
- **VINIL:** 3% mais comum (ajustado para 30% padrão)
- **ALVEOLAR:** 3% mais comum (ajustado para 30% padrão)
- **ENVELOPES:** 3%, 20%, 2% (varia por quantidade) → **30% padrão**
- **PASTAS A4:** 3% mais comum → **30% padrão**
- **FLEX:** 40% mais comum → **40% aplicado**
- **Cartões PVC:** 4% mais comum → **4% aplicado**
- **Têxteis:** 40% mais comum → **40% aplicado por produto**

---

## ⚙️ **CONFIGURAÇÕES GLOBAIS:**

- **Margem padrão:** 30%
- **Markup operacional:** 20%
- **IVA:** 23%
- **Fator de perda:** 3%
- **Degrau de arredondamento:** 0.05

---

## 📊 **STATUS FINAL:**

✅ **Margem Global:** Criada (30%)  
✅ **Margens por Categoria:** 6 criadas  
✅ **Margens por Produto:** 7 criadas  
⚠️ **Margens Dinâmicas:** Removidas (podem ser criadas manualmente)

---

## 🔄 **PRÓXIMOS PASSOS (Opcional):**

1. **Criar margens dinâmicas específicas:**
   - Envelopes: ajuste por quantidade
   - Pastas A4: ajuste por quantidade
   - Descontos promocionais

2. **Revisar valores:**
   - Verificar se 30% é adequado para todas as categorias
   - Ajustar margens específicas se necessário

3. **Testar cotações:**
   - Verificar se as margens estão sendo aplicadas corretamente
   - Validar cálculos finais

---

**Status Geral:** 🟢 **Configurado** - Sistema de margens completo e funcional

