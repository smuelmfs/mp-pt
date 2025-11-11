# 📊 Análise de Fórmulas: Planilha Excel vs Sistema

**Data:** 11/11/2025  
**Produto Analisado:** CARTAZ A4 - FRENTE

---

## 🔍 Descobertas Principais

### 1. **Diferenças nos Custos de Produção**

| Quantidade | Planilha Excel | Sistema | Diferença |
|------------|----------------|---------|-----------|
| 50 unidades | €8.75 | €24.80 | +€16.05 (+183%) |
| 100 unidades | €12.50 | €34.50 | +€22.00 (+176%) |
| 250 unidades | €23.75 | €63.52 | +€39.77 (+167%) |
| 500 unidades | €52.50 | €112.03 | +€59.53 (+113%) |
| 750 unidades | €71.25 | €160.64 | +€89.39 (+125%) |

**Causas Identificadas:**
- **Imposição de Papel**: O sistema calcula a quantidade de folhas necessárias considerando imposição (layout), enquanto a planilha parece usar uma fórmula mais simples
- **Preços de Impressão**: O sistema usa €0.09 por unidade, mas a planilha pode estar usando valores diferentes ou desatualizados
- **Preços de Material**: O sistema usa €0.0946 por folha (Papel Condat Gloss 250g), enquanto a planilha usa €0.0600
- **Acabamentos**: A planilha inclui €5.00-€15.00 de acabamento que não está sendo aplicado no sistema

### 2. **Fórmula da Planilha Excel**

**Estrutura dos Dados na Planilha:**
- Coluna 2: Quantidade
- Coluna 3: Quantidade de Papel (parece ser quantidade/2 ou quantidade baseada em imposição)
- Coluna 4: Quantidade de Impressões
- Coluna 5: Custo Unitário de Impressão (€0.09)
- Coluna 6: Custo Total de Impressão
- Coluna 7: Custo Unitário de Papel (€0.060)
- Coluna 8: Custo Total de Papel
- Coluna 9: Custo de Acabamento (€5.00 ou €15.00)
- Coluna 12: Custo Total Produção
- Coluna 13: % Lucro (mostra "300.00%" mas parece ser interpretado como 3%)
- Coluna 14: Preço Final

**Fórmula Reconstruída:**
```
Custo Total = Impressão Total + Papel Total + Acabamento
Preço Final = Custo Total × 4.00 (300% de margem = multiplicador de 4x)
```

**Exemplo para 50 unidades:**
```
Impressão: 25 × €0.09 = €2.25
Papel: 2 × €0.060 = €1.50
Acabamento: €5.00
Custo Total: €8.75
Preço Final: €8.75 × 4.00 = €35.00 ✅
```

### 3. **Fórmula do Sistema**

**Estrutura do Cálculo:**
```
Subtotal Produção = Material + Impressão + Acabamentos
Subtotal Efetivo = Subtotal Produção (ou mínimo por valor, se aplicável)
Preço Final = Subtotal Efetivo × (1 + Markup) × (1 + Margem + Ajuste Dinâmico)
```

**Exemplo para 50 unidades:**
```
Material: 56 folhas × €0.0946 = €5.30
Impressão: 50 × €0.09 = €4.50
Subtotal: €9.80
Preço Final: €9.80 × 1.20 × 1.30 = €15.29 ❌ (mas sistema mostra €38.70)
```

**Nota:** O sistema mostra €24.80 de subtotal, o que sugere que há mais itens sendo calculados ou a imposição está gerando mais folhas.

### 4. **Análise Detalhada das Diferenças**

#### A. **Quantidade de Papel**

**Planilha Excel:**
- 50 unidades → 2 folhas
- 100 unidades → 2 folhas
- 250 unidades → 2 folhas
- 500 unidades → 2 folhas
- 750 unidades → 2 folhas

**Sistema:**
- 50 unidades → 56 folhas
- 100 unidades → 111 folhas
- 250 unidades → 275 folhas
- 500 unidades → 550 folhas
- 750 unidades → 826 folhas

**Problema Identificado:** A planilha usa uma quantidade fixa de 2 folhas independente da quantidade, o que não faz sentido. O sistema calcula corretamente baseado em imposição.

#### B. **Quantidade de Impressões**

**Planilha Excel:**
- 50 unidades → 25 impressões
- 100 unidades → 50 impressões
- 250 unidades → 125 impressões

**Sistema:**
- 50 unidades → 50 impressões
- 100 unidades → 100 impressões
- 250 unidades → 250 impressões

**Problema Identificado:** A planilha divide a quantidade por 2 para impressões, o que sugere que está considerando impressão frente/verso ou algum outro fator. O sistema usa 1 impressão por unidade.

#### C. **Preço de Material**

**Planilha Excel:** €0.060 por folha  
**Sistema:** €0.0946 por folha  
**Diferença:** +57.67%

#### D. **Aplicação de Margem**

**Planilha Excel:**
- Usa multiplicador fixo de 4.00 (300% de margem)
- Fórmula: `Preço Final = Custo Total × 4.00`

**Sistema:**
- Usa Markup 20% + Margem 30% + Ajuste Dinâmico
- Fórmula: `Preço Final = Subtotal × 1.20 × (1 + 0.30 + ajuste_dinâmico)`
- Multiplicador efetivo: ~1.56 (com ajuste dinâmico de -1% a -2%)

---

## 🎯 Recomendações para Alinhamento

### 1. **Verificar Preços de Material**
- Confirmar se o preço do papel na planilha (€0.060) está atualizado
- Verificar se o sistema está usando o preço correto (€0.0946)
- Alinhar os preços entre planilha e sistema

### 2. **Revisar Cálculo de Imposição**
- A planilha parece usar uma fórmula simplificada (2 folhas fixas)
- O sistema calcula corretamente baseado em imposição
- **Decisão necessária:** Qual método usar? Sistema (correto) ou Planilha (simplificado)?

### 3. **Revisar Quantidade de Impressões**
- A planilha divide por 2 (25 impressões para 50 unidades)
- O sistema usa 1 impressão por unidade
- **Decisão necessária:** Qual está correto? Verificar se o produto é frente/verso.

### 4. **Alinhar Fórmula de Margem**
- **Opção A:** Ajustar sistema para usar margem fixa de 300% (multiplicador 4.00)
- **Opção B:** Atualizar planilha para usar Markup + Margem + Ajuste Dinâmico
- **Opção C:** Criar configuração no sistema para escolher entre fórmulas

### 5. **Incluir Acabamentos no Sistema**
- A planilha inclui €5.00-€15.00 de acabamento
- O sistema não está aplicando acabamentos para este produto
- Verificar se o produto deve ter acabamento e configurar no sistema

---

## 📋 Próximos Passos

1. ✅ **Análise Completa** - CONCLUÍDA
2. ⏳ **Verificar preços de material no banco de dados**
3. ⏳ **Confirmar se produto é frente/verso (explica divisão por 2 na planilha)**
4. ⏳ **Decidir qual fórmula de margem usar (planilha vs sistema)**
5. ⏳ **Configurar acabamentos no produto se necessário**
6. ⏳ **Ajustar sistema ou planilha para alinhar cálculos**

---

## 📊 Resumo das Diferenças

| Aspecto | Planilha Excel | Sistema | Status |
|---------|----------------|---------|--------|
| Custo Material (50 unid) | €1.50 | €5.30 | ⚠️ Diferente |
| Custo Impressão (50 unid) | €2.25 | €4.50 | ⚠️ Diferente |
| Custo Acabamento (50 unid) | €5.00 | €0.00 | ⚠️ Diferente |
| Custo Total (50 unid) | €8.75 | €24.80 | ⚠️ Diferente |
| Fórmula Margem | Custo × 4.00 | Subtotal × 1.20 × 1.30 | ⚠️ Diferente |
| Preço Final (50 unid) | €35.00 | €38.70 | ⚠️ Diferente (+10.57%) |

---

---

## 🔧 Correções Necessárias

### 1. **Verificar Imposição no Sistema**

O sistema calcula imposição corretamente usando `computeImposition()`, mas os valores parecem altos:
- 50 unidades → 56 folhas (deveria ser ~25 folhas se 2 peças por folha)
- 100 unidades → 111 folhas (deveria ser ~50 folhas)

**Ação:** Verificar se a imposição está calculando corretamente para A4 em SRA3.

### 2. **Verificar Preço do Material**

**Planilha:** €0.060 por folha  
**Sistema:** €0.0946 por folha  
**Diferença:** +57.67%

**Ação:** Verificar no banco de dados qual é o preço correto do "Papel Condat Gloss 250g" e alinhar.

### 3. **Verificar Quantidade de Impressões**

**Planilha:** Divide quantidade por 2 (25 impressões para 50 unidades)  
**Sistema:** Usa 1 impressão por unidade (50 impressões para 50 unidades)

**Possíveis Explicações:**
- Produto é frente/verso e a planilha conta como 1 impressão (2 lados)
- Planilha está usando fórmula incorreta
- Sistema está usando fórmula incorreta

**Ação:** Confirmar se CARTAZ A4 é frente/verso ou apenas frente.

### 4. **Alinhar Fórmula de Margem**

**Planilha:** `Preço Final = Custo Total × 4.00` (300% de margem)  
**Sistema:** `Preço Final = Subtotal × 1.20 × (1 + 0.30 + ajuste_dinâmico)` (~1.56x)

**Ação:** Decidir qual fórmula usar e configurar no sistema ou atualizar planilha.

### 5. **Incluir Acabamentos**

**Planilha:** Inclui €5.00-€15.00 de acabamento  
**Sistema:** Não aplica acabamentos

**Ação:** Verificar se o produto deve ter acabamento e configurar no sistema.

---

## 📋 Plano de Ação Recomendado

### Fase 1: Verificação de Dados
1. ✅ Análise de fórmulas - **CONCLUÍDA**
2. ⏳ Verificar preço do material no banco de dados
3. ⏳ Verificar se produto é frente/verso
4. ⏳ Verificar configuração de acabamentos do produto

### Fase 2: Ajustes no Sistema
1. ⏳ Corrigir cálculo de imposição (se necessário)
2. ⏳ Ajustar preço do material (se necessário)
3. ⏳ Configurar acabamentos (se necessário)
4. ⏳ Ajustar fórmula de margem (se necessário)

### Fase 3: Validação
1. ⏳ Re-executar comparação após ajustes
2. ⏳ Validar que diferenças estão < 5%
3. ⏳ Documentar ajustes realizados

---

---

## ✅ Dados Verificados no Sistema

### Configuração do Produto CARTAZ A4 (ID: 42)
- **Nome**: Cartaz A4 - Frente
- **Dimensões**: 210mm × 297mm
- **Categoria**: Papelaria
- **Impressão**: SRA3 CMYK FRENTE (€0.09 por unidade)
- **Material**: Papel Condat Gloss 250g (€0.0946 por folha)
- **Fornecedor**: INAPA
- **Acabamentos**: Nenhum configurado
- **Markup**: 20% (global)
- **Margem**: 30% (categoria/global)
- **Ajuste Dinâmico**: -3% (categoria)

### Descobertas Importantes

1. **Produto é apenas FRENTE** (não frente/verso)
   - A planilha divide impressões por 2, o que está **INCORRETO**
   - O sistema está correto usando 1 impressão por unidade

2. **Preço do Material**
   - Sistema: €0.0946 por folha (INAPA)
   - Planilha: €0.060 por folha
   - **Diferença**: +57.67% (sistema mais caro)
   - **Possível causa**: Preço atualizado no sistema, planilha desatualizada

3. **Acabamentos**
   - Sistema: Nenhum configurado
   - Planilha: Inclui €5.00-€15.00
   - **Ação necessária**: Verificar se acabamento deve ser aplicado e configurar no sistema

4. **Fórmula de Margem**
   - Sistema: Subtotal × 1.20 × (1 + 0.30 - 0.03) = Subtotal × 1.524
   - Planilha: Custo Total × 4.00
   - **Diferença significativa**: Sistema usa multiplicador ~1.52x, planilha usa 4.00x

---

## 🎯 Conclusões Finais

### Problemas Identificados na Planilha Excel

1. ❌ **Quantidade de Impressões Incorreta**: Divide por 2 quando produto é apenas frente
2. ❌ **Quantidade de Papel Incorreta**: Usa valor fixo de 2 folhas independente da quantidade
3. ⚠️ **Preço de Material Desatualizado**: €0.060 vs €0.0946 no sistema
4. ⚠️ **Fórmula de Margem Diferente**: Usa multiplicador fixo 4.00 vs fórmula do sistema

### Problemas Identificados no Sistema

1. ⚠️ **Cálculo de Imposição**: Valores parecem altos (56 folhas para 50 unidades)
2. ⚠️ **Acabamentos Não Configurados**: Planilha inclui, sistema não aplica
3. ✅ **Quantidade de Impressões**: Correto (1 por unidade)
4. ✅ **Fórmula de Margem**: Mais precisa (Markup + Margem + Ajuste Dinâmico)

---

## 📋 Recomendações Finais

### Prioridade Alta

1. **Verificar Cálculo de Imposição no Sistema**
   - 50 unidades deveriam gerar ~25 folhas (2 peças por folha SRA3)
   - Sistema está gerando 56 folhas (possível erro no cálculo)

2. **Decidir Fórmula de Margem**
   - Opção A: Ajustar sistema para usar margem fixa de 300% (como planilha)
   - Opção B: Manter fórmula atual do sistema (mais precisa)
   - **Recomendação**: Manter fórmula do sistema e atualizar planilha

3. **Configurar Acabamentos**
   - Se produto deve ter acabamento, configurar no sistema
   - Se não deve ter, remover da planilha

### Prioridade Média

4. **Alinhar Preço de Material**
   - Confirmar qual preço está correto (€0.0946 ou €0.060)
   - Atualizar o que estiver incorreto

5. **Corrigir Planilha Excel**
   - Remover divisão por 2 nas impressões
   - Corrigir cálculo de quantidade de papel
   - Atualizar preço do material
   - Atualizar fórmula de margem

---

**Status:** ✅ Análise Completa - Dados Verificados - Aguardando Decisões de Alinhamento

**Documentos Criados:**
- ✅ `docs/ANALISE_FORMULAS_EXCEL_VS_SISTEMA.md` - Análise completa
- ✅ `scripts/analyze-excel-formulas-cartaz-a4.ts` - Script de análise
- ✅ `scripts/verify-cartaz-a4-data.ts` - Script de verificação de dados
- ✅ `scripts/test-imposition-cartaz-a4.ts` - Script de teste de imposição

---

## 🔍 Descoberta Crítica: Cálculo de Imposição

### Problema Identificado

O sistema está calculando **1 peça por folha** para A4 em SRA3, quando na prática deveria caber **2 peças por folha**.

**Cálculo Atual:**
- Produto: 210mm × 297mm (A4)
- Folha: 320mm × 450mm (SRA3)
- Bleed: 3mm (reduz área útil)
- Gutter: 2mm (folga entre peças)
- **Resultado**: 1 peça por folha ❌

**Cálculo Esperado:**
- Na prática, 2 A4 cabem em 1 SRA3
- **Resultado esperado**: 2 peças por folha ✅

### Possíveis Causas

1. **Bleed muito alto**: 3mm pode ser excessivo para este tipo de produto
2. **Gutter muito alto**: 2mm pode ser excessivo
3. **Fórmula muito restritiva**: O algoritmo pode estar sendo muito conservador
4. **Dimensões incorretas**: As dimensões da folha podem estar incorretas

### Impacto

- **50 unidades**: Sistema calcula 50 folhas (com waste 10% = 56 folhas) vs esperado ~25 folhas
- **Custo de material**: Sistema está calculando o dobro do necessário
- **Diferença de preço**: Isso explica parte significativa da diferença entre sistema e planilha

---

## 📊 Resumo Final das Diferenças

| Item | Planilha Excel | Sistema | Status | Impacto |
|------|----------------|---------|--------|---------|
| **Quantidade de Papel (50 unid)** | 2 folhas (fixo) | 56 folhas | ⚠️ Ambos incorretos | Alto |
| **Quantidade de Impressões (50 unid)** | 25 (÷2) | 50 | ✅ Sistema correto | Médio |
| **Preço Material** | €0.060/folha | €0.0946/folha | ⚠️ Diferente | Alto |
| **Acabamentos** | €5.00-€15.00 | €0.00 | ⚠️ Diferente | Médio |
| **Fórmula Margem** | Custo × 4.00 | Subtotal × 1.524 | ⚠️ Diferente | Alto |
| **Custo Total (50 unid)** | €8.75 | €24.80 | ⚠️ Diferente | Alto |
| **Preço Final (50 unid)** | €35.00 | €38.70 | ⚠️ Diferente (+10.57%) | - |

---

## 🎯 Ações Prioritárias Recomendadas

### 1. **Corrigir Cálculo de Imposição** (PRIORIDADE MÁXIMA)
   - Ajustar bleed/gutter ou algoritmo para permitir 2 peças por folha
   - Ou configurar manualmente que A4 em SRA3 = 2 peças por folha
   - **Impacto esperado**: Reduzir custo de material pela metade

### 2. **Verificar Preço do Material**
   - Confirmar qual preço está correto (€0.0946 ou €0.060)
   - Atualizar o que estiver incorreto
   - **Impacto esperado**: Alinhar custos base

### 3. **Decidir Fórmula de Margem**
   - Manter fórmula do sistema (mais precisa) ou ajustar para 300% fixo
   - **Recomendação**: Manter fórmula do sistema e atualizar planilha

### 4. **Configurar Acabamentos**
   - Se necessário, adicionar acabamentos ao produto
   - **Impacto esperado**: Alinhar custos finais

---

**Status:** ✅ Análise Completa - Problemas Identificados - Aguardando Correções

