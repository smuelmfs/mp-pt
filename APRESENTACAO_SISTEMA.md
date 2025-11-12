# 📋 Apresentação do Sistema MyPrint.pt
## Sistema de Orçamentação Gráfica

---

## 📑 Índice

1. [Visão Geral do Sistema](#visão-geral)
2. [Nomenclaturas e Unidades de Medida](#nomenclaturas)
3. [Arredondamentos](#arredondamentos)
4. [Margens](#margens)
5. [Configurações do Sistema](#configurações)
6. [Exemplos Práticos](#exemplos)
7. [Área Administrativa vs Comercial](#areas)

---

## 🎯 Visão Geral do Sistema {#visão-geral}

O **MyPrint.pt** é um sistema completo de orçamentação gráfica que calcula automaticamente o preço final de produtos gráficos considerando:

- **Materiais** (papel, vinil, PVC, etc.)
- **Impressão** (offset, digital, UV, grande formato)
- **Acabamentos** (laminação, verniz, corte, dobra, etc.)
- **Margens** (fixas e dinâmicas)
- **Arredondamentos** configuráveis
- **IVA** e impostos

O sistema possui duas áreas principais:
- **Área Administrativa (ADMIN)**: Configuração de produtos, materiais, margens e parâmetros globais
- **Área Comercial (COMMERCIAL)**: Criação e gerenciamento de orçamentos

---

## 📏 Nomenclaturas e Unidades de Medida {#nomenclaturas}

O sistema utiliza **5 unidades de medida** diferentes, dependendo do tipo de insumo:

### 1. **UNIT** (Unidade)
- **Uso**: Produtos contados por unidade (ex: pastas, encadernações)
- **Exemplo**: 100 pastas = 100 unidades
- **Cálculo**: `Quantidade × Custo por Unidade`

### 2. **M2** (Metro Quadrado)
- **Uso**: Materiais vendidos por área (ex: vinil, papel em rolo)
- **Exemplo**: Vinil a €2,50/m² para um cartaz de 1m × 0,5m = 0,5m² = €1,25
- **Cálculo**: `Área (m²) × Custo por m²`
- **Conversão**: `(Largura (mm) × Altura (mm)) / 1.000.000 = Área (m²)`

### 3. **SHEET** (Folha)
- **Uso**: Papéis vendidos por folha (ex: papel A4, A3, formatos específicos)
- **Exemplo**: Papel Couché 300g a €0,15/folha para 500 folhas = €75,00
- **Cálculo**: `Quantidade de Folhas × Custo por Folha`
- **Imposição**: O sistema calcula automaticamente quantas peças cabem em cada folha

### 4. **LOT** (Lote)
- **Uso**: Serviços ou materiais vendidos por lote fixo
- **Exemplo**: Corte especial a €50,00/lote (independente da quantidade)
- **Cálculo**: `Custo Fixo por Lote` (não multiplica pela quantidade)

### 5. **HOUR** (Hora)
- **Uso**: Serviços cobrados por tempo (ex: acabamentos manuais, montagem)
- **Exemplo**: Acabamento manual a €30,00/hora para 2 horas = €60,00
- **Cálculo**: `Horas × Custo por Hora`

### 📐 Dimensões

As dimensões dos produtos são sempre em **milímetros (mm)**:
- **Largura (widthMm)**: Largura do produto em mm
- **Altura (heightMm)**: Altura do produto em mm
- **Área em m²**: `(Largura × Altura) / 1.000.000`

**Exemplo**:
- Produto: 210mm × 297mm (A4)
- Área: `(210 × 297) / 1.000.000 = 0,06237 m²`

---

## 🔢 Arredondamentos {#arredondamentos}

O sistema possui **duas estratégias de arredondamento**:

### 1. **END_ONLY** (Arredondamento apenas no final)
- **Como funciona**: Calcula tudo com precisão e arredonda apenas o preço final
- **Uso**: Quando você quer ver valores intermediários exatos
- **Exemplo**:
  ```
  Material: €45,67
  Impressão: €12,34
  Acabamento: €8,91
  Subtotal: €66,92
  Com margem: €86,99
  Arredondado: €87,00 (se degrau = 0,05)
  ```

### 2. **PER_STEP** (Arredondamento por etapa)
- **Como funciona**: Arredonda cada linha de custo para 2 casas decimais durante o cálculo
- **Uso**: Quando você quer valores "limpos" em cada etapa (como em planilhas)
- **Exemplo**:
  ```
  Material: €45,67 → €45,67
  Impressão: €12,34 → €12,34
  Acabamento: €8,91 → €8,91
  Subtotal: €66,92 (já arredondado)
  Com margem: €86,99 → €87,00
  ```

### 🎚️ Degrau de Arredondamento (Rounding Step)

O **degrau** define em quais múltiplos o preço final será arredondado:

- **0,05**: Arredonda para múltiplos de 5 centavos (€10,00; €10,05; €10,10; €10,15...)
- **0,10**: Arredonda para múltiplos de 10 centavos (€10,00; €10,10; €10,20...)
- **0,50**: Arredonda para múltiplos de 50 centavos (€10,00; €10,50; €11,00...)
- **1,00**: Arredonda para múltiplos de 1 euro (€10,00; €11,00; €12,00...)

**Exemplo com degrau 0,05**:
- Preço calculado: €87,23
- Arredondado: €87,25 (próximo múltiplo de 0,05)

**Exemplo com degrau 0,10**:
- Preço calculado: €87,23
- Arredondado: €87,20 (próximo múltiplo de 0,10)

### 📍 Hierarquia de Configuração de Arredondamento

O sistema busca o degrau na seguinte ordem (primeiro encontrado é usado):

1. **Produto** (configuração específica do produto)
2. **Categoria** (configuração da categoria do produto)
3. **Global** (configuração global do sistema)

---

## 💰 Margens {#margens}

O sistema possui **dois tipos de margens**:

### 1. **Margem Fixa** (MarginRule)

Aplicada sempre que as condições forem atendidas.

**Características**:
- Percentual fixo (ex: 30%)
- Pode ter período de vigência (data início/fim)
- Pode ser aplicada a:
  - **GLOBAL**: Todos os produtos
  - **CATEGORY**: Uma categoria específica
  - **PRODUCT**: Um produto específico
  - **CUSTOMER**: Um cliente específico
  - **CUSTOMER_GROUP**: Um grupo de clientes

**Exemplo**:
- Regra: Margem fixa de 30% para categoria "Flyers"
- Produto: Flyer A4
- Custo: €100,00
- Preço: €100,00 × 1,30 = €130,00

### 2. **Margem Dinâmica** (MarginRuleDynamic)

Ajusta a margem baseado em condições (quantidade, valor total, etc.).

**Características**:
- **Ajuste percentual**: Pode aumentar ou diminuir a margem (ex: -5% = desconto)
- **Condições**:
  - **MinSubtotal**: Aplica se o subtotal for maior que X euros
  - **MinQuantity**: Aplica se a quantidade for maior que X unidades
- **Prioridade**: Menor número = maior prioridade
- **Acumulável**: Pode ser aplicada junto com outras regras (se `stackable = true`)
- **Ajuste máximo**: Limite máximo do ajuste em euros

**Exemplo 1 - Desconto por quantidade**:
- Regra: -5% de ajuste se quantidade ≥ 500 unidades
- Produto: Flyer A4, quantidade: 1000 unidades
- Margem base: 30%
- Margem ajustada: 30% - 5% = 25%
- Custo: €100,00
- Preço: €100,00 × 1,25 = €125,00

**Exemplo 2 - Desconto por valor**:
- Regra: -3% de ajuste se subtotal ≥ €500,00
- Produto: Cartaz grande, subtotal: €600,00
- Margem base: 30%
- Margem ajustada: 30% - 3% = 27%
- Preço: €600,00 × 1,27 = €762,00

**Exemplo 3 - Regras acumuláveis**:
- Regra 1: -2% se quantidade ≥ 1000 (stackable = true)
- Regra 2: -3% se subtotal ≥ €500,00 (stackable = true)
- Produto: Flyer, quantidade: 1500, subtotal: €800,00
- Margem base: 30%
- Margem ajustada: 30% - 2% - 3% = 25%
- Preço: €800,00 × 1,25 = €1.000,00

### 📊 Ordem de Prioridade das Margens Dinâmicas

O sistema busca regras na seguinte ordem (primeira encontrada é aplicada):

1. **CUSTOMER** (cliente específico)
2. **CUSTOMER_GROUP** (grupo de clientes)
3. **PRODUCT** (produto específico)
4. **CATEGORY** (categoria)
5. **GLOBAL** (global)

### 🧮 Estratégias de Precificação

O sistema suporta **3 estratégias de cálculo de preço**:

#### 1. **COST_MARKUP_MARGIN** (Padrão)
```
Preço = Subtotal × (1 + Markup) × (1 + Margem + Ajuste Dinâmico)
```

**Exemplo**:
- Subtotal: €100,00
- Markup: 20% (0,20)
- Margem: 30% (0,30)
- Ajuste dinâmico: -5% (-0,05)
- Preço: €100,00 × 1,20 × 1,25 = €150,00

#### 2. **COST_MARGIN_ONLY** (Apenas Margem)
```
Preço = Subtotal × (1 + Margem + Ajuste Dinâmico)
```

**Exemplo**:
- Subtotal: €100,00
- Margem: 30% (0,30)
- Ajuste dinâmico: -5% (-0,05)
- Preço: €100,00 × 1,25 = €125,00

#### 3. **MARGIN_TARGET** (Margem Alvo)
```
Preço = Subtotal / (1 - Margem - Ajuste Dinâmico)
```

**Exemplo**:
- Subtotal: €100,00
- Margem alvo: 30% (0,30)
- Ajuste dinâmico: -5% (-0,05)
- Preço: €100,00 / (1 - 0,25) = €100,00 / 0,75 = €133,33

---

## ⚙️ Configurações do Sistema {#configurações}

### 🔧 Configurações Globais (Admin)

Acessível em: **Admin → Configuração**

#### 1. **Margem Padrão (marginDefault)**
- **Descrição**: Margem padrão aplicada quando não há regra específica
- **Formato**: Decimal (ex: 0,30 = 30%)
- **Padrão**: 30% (0,30)
- **Uso**: Base para todos os cálculos de preço

#### 2. **Markup Operacional (markupOperational)**
- **Descrição**: Markup adicional para cobrir custos operacionais
- **Formato**: Decimal (ex: 0,20 = 20%)
- **Padrão**: 20% (0,20)
- **Uso**: Aplicado antes da margem (se estratégia = COST_MARKUP_MARGIN)

#### 3. **Degrau de Arredondamento (roundingStep)**
- **Descrição**: Múltiplo para arredondamento do preço final
- **Formato**: Decimal (ex: 0,05 = 5 centavos)
- **Padrão**: 0,05
- **Uso**: Arredonda preços para múltiplos de 5 centavos

#### 4. **Perda Global (lossFactor)**
- **Descrição**: Percentual de perda/refugo aplicado em materiais e impressão
- **Formato**: Decimal (ex: 0,03 = 3%)
- **Padrão**: 3% (0,03)
- **Uso**: Adiciona quantidade extra para cobrir refugos

#### 5. **Tempo de Setup (setupTimeMin)**
- **Descrição**: Tempo padrão de setup da impressão em minutos
- **Formato**: Inteiro (minutos)
- **Padrão**: 15 minutos
- **Uso**: Calcula custo de setup da impressão

#### 6. **Custo por Hora (printingHourCost)**
- **Descrição**: Custo horário da impressão (para cálculo de setup)
- **Formato**: Decimal (ex: 60,00 = €60/hora)
- **Padrão**: €60,00/hora
- **Uso**: `Custo Setup = (Tempo Setup / 60) × Custo por Hora`

#### 7. **IVA (vatPercent)**
- **Descrição**: Percentual de IVA aplicado ao preço final
- **Formato**: Decimal (ex: 0,23 = 23%)
- **Padrão**: 23% (0,23)
- **Uso**: `Preço com IVA = Preço Final × (1 + IVA)`

#### 8. **Estratégia de Arredondamento (roundingStrategy)**
- **Opções**:
  - `END_ONLY`: Arredonda apenas no final
  - `PER_STEP`: Arredonda por etapa
- **Padrão**: PER_STEP

#### 9. **Estratégia de Precificação (pricingStrategy)**
- **Opções**:
  - `COST_MARKUP_MARGIN`: Markup + Margem
  - `COST_MARGIN_ONLY`: Apenas Margem
  - `MARGIN_TARGET`: Margem Alvo
- **Padrão**: COST_MARKUP_MARGIN

### 📦 Configurações por Produto

Cada produto pode ter configurações específicas que sobrescrevem as globais:

- **Margem Padrão**: Margem específica do produto
- **Markup Padrão**: Markup específico do produto
- **Degrau de Arredondamento**: Degrau específico do produto
- **Estratégia de Arredondamento**: Estratégia específica do produto
- **Estratégia de Precificação**: Estratégia específica do produto
- **Preço Mínimo por Peça**: Valor mínimo por unidade
- **Quantidade Mínima**: Quantidade mínima de pedido
- **Valor Mínimo**: Valor mínimo do pedido

### 👥 Configurações por Cliente

Cada cliente pode ter preços e configurações personalizadas:

- **Preços de Material**: Preço específico por material
- **Preços de Impressão**: Preço específico por impressão
- **Preços de Acabamento**: Preço específico por acabamento
- **Overrides de Produto**: Margem, markup, degrau específicos por produto

---

## 📝 Exemplos Práticos {#exemplos}

### Exemplo 1: Flyer A4 Simples

**Produto**: Flyer A4
**Quantidade**: 1000 unidades
**Dimensões**: 210mm × 297mm (A4)
**Material**: Papel Couché 300g
**Impressão**: Digital 4/0 (4 cores frente, 0 verso)
**Acabamento**: Nenhum

#### Cálculo:

1. **Material (SHEET)**:
   - Custo por folha: €0,15
   - Quantidade: 1000 folhas
   - Perda: 3% → 1000 × 1,03 = 1030 folhas
   - Custo: 1030 × €0,15 = €154,50

2. **Impressão (UNIT)**:
   - Custo por tiro: €0,05
   - Yield: 1 (1 tiro = 1 unidade)
   - Tiros necessários: 1000 / 1 = 1000 tiros
   - Perda: 3% → 1000 × 1,03 = 1030 tiros
   - Custo impressão: 1030 × €0,05 = €51,50
   - Setup: 15 min × (€60/hora / 60) = €15,00
   - Custo total impressão: €51,50 + €15,00 = €66,50

3. **Subtotal**:
   - Material: €154,50
   - Impressão: €66,50
   - **Subtotal: €221,00**

4. **Aplicação de Margem**:
   - Markup: 20% → €221,00 × 1,20 = €265,20
   - Margem: 30% → €265,20 × 1,30 = €344,76

5. **Arredondamento**:
   - Degrau: 0,05
   - Arredondado: €344,75

6. **IVA**:
   - IVA: 23% → €344,75 × 0,23 = €79,29
   - **Preço Final: €424,04**

---

### Exemplo 2: Cartaz Grande Formato com Desconto

**Produto**: Cartaz Grande Formato
**Quantidade**: 50 unidades
**Dimensões**: 1000mm × 1500mm
**Material**: Vinil Adesivo
**Impressão**: Grande Formato UV
**Acabamento**: Laminação Brilho

#### Cálculo:

1. **Material (M2)**:
   - Área por unidade: (1000 × 1500) / 1.000.000 = 1,5 m²
   - Custo por m²: €2,50
   - Quantidade total: 50 × 1,5 = 75 m²
   - Perda: 3% → 75 × 1,03 = 77,25 m²
   - Custo: 77,25 × €2,50 = €193,13

2. **Impressão (M2)**:
   - Custo por m²: €8,00
   - Área: 77,25 m²
   - Custo impressão: 77,25 × €8,00 = €618,00
   - Setup: €20,00 (fixo)
   - Custo total impressão: €638,00

3. **Acabamento - Laminação (PER_M2)**:
   - Custo por m²: €1,50
   - Área: 77,25 m²
   - Custo: 77,25 × €1,50 = €115,88

4. **Subtotal**:
   - Material: €193,13
   - Impressão: €638,00
   - Acabamento: €115,88
   - **Subtotal: €947,01**

5. **Aplicação de Margem Dinâmica**:
   - Regra: -5% se subtotal ≥ €500,00
   - Subtotal: €947,01 (≥ €500,00) ✅
   - Margem base: 30%
   - Ajuste: -5%
   - Margem final: 25%
   - Markup: 20% → €947,01 × 1,20 = €1.136,41
   - Margem: 25% → €1.136,41 × 1,25 = €1.420,51

6. **Arredondamento**:
   - Degrau: 0,05
   - Arredondado: €1.420,50

7. **IVA**:
   - IVA: 23% → €1.420,50 × 0,23 = €326,72
   - **Preço Final: €1.747,22**

---

### Exemplo 3: Produto com Mínimo por Valor

**Produto**: Cartão de Visita
**Quantidade**: 100 unidades
**Valor Mínimo do Pedido**: €50,00

#### Cálculo:

1. **Material**: €5,00
2. **Impressão**: €8,00
3. **Subtotal**: €13,00

4. **Aplicação de Mínimo**:
   - Subtotal: €13,00
   - Mínimo: €50,00
   - **Subtotal ajustado: €50,00** (aplicado o mínimo)

5. **Aplicação de Margem**:
   - Markup: 20% → €50,00 × 1,20 = €60,00
   - Margem: 30% → €60,00 × 1,30 = €78,00

6. **Arredondamento**:
   - Degrau: 0,05
   - Arredondado: €78,00

7. **IVA**:
   - IVA: 23% → €78,00 × 0,23 = €17,94
   - **Preço Final: €95,94**

---

## 🏢 Área Administrativa vs Comercial {#areas}

### 👨‍💼 Área Administrativa (ADMIN)

**Acesso**: Usuários com role `ADMIN`

**Funcionalidades**:

1. **Produtos** (`/products`)
   - Criar, editar e gerenciar produtos
   - Configurar materiais, impressão e acabamentos
   - Definir dimensões padrão
   - Configurar mínimos (quantidade, valor)
   - Configurar margens e arredondamentos por produto

2. **Materiais** (`/materials`)
   - Cadastrar materiais (papel, vinil, PVC, etc.)
   - Definir custos por unidade
   - Criar variantes (ex: diferentes formatos de papel)
   - Associar fornecedores

3. **Impressão** (`/printing`)
   - Cadastrar tipos de impressão
   - Configurar custos, yield, setup
   - Definir tecnologias (offset, digital, UV, grande formato)

4. **Acabamentos** (`/finishes`)
   - Cadastrar acabamentos (laminação, verniz, corte, dobra)
   - Definir tipo de cálculo (por unidade, m², lote, hora)
   - Configurar custos e taxas mínimas

5. **Categorias** (`/categories`)
   - Organizar produtos em categorias
   - Configurar arredondamentos por categoria
   - Definir fatores de perda por categoria

6. **Margens** (`/margins`)
   - Criar regras de margem fixa
   - Criar regras de margem dinâmica
   - Configurar escopos (global, categoria, produto, cliente)
   - Definir períodos de vigência

7. **Configuração** (`/config`)
   - Configurações globais do sistema
   - Margem padrão, markup, degrau
   - IVA, custos de impressão
   - Estratégias de arredondamento e precificação

8. **Clientes** (`/customers`)
   - Cadastrar clientes
   - Criar grupos de clientes
   - Configurar preços personalizados
   - Definir overrides por produto

9. **Fornecedores** (`/suppliers`)
   - Cadastrar fornecedores
   - Associar fornecedores a materiais
   - Configurar preços de fornecedor

### 💼 Área Comercial (COMMERCIAL)

**Acesso**: Usuários com role `COMMERCIAL`

**Funcionalidades**:

1. **Orçamentos** (`/quotes`)
   - Visualizar todos os orçamentos
   - Buscar e filtrar orçamentos
   - Ver detalhes de cada orçamento
   - Exportar orçamentos

2. **Criar Orçamento** (`/quotes/categories`)
   - Selecionar categoria de produto
   - Escolher produto
   - Configurar quantidade e dimensões
   - Selecionar material, impressão e acabamentos
   - Visualizar cálculo em tempo real
   - Salvar orçamento

3. **Visualizar Orçamento** (`/quotes/[id]`)
   - Ver detalhamento completo do cálculo
   - Ver breakdown (material, impressão, acabamento)
   - Ver aplicação de margens
   - Ver preço final com IVA

---

## 📊 Resumo das Nomenclaturas

| Termo | Significado | Exemplo |
|-------|-------------|---------|
| **UNIT** | Unidade | 100 pastas = 100 unidades |
| **M2** | Metro quadrado | 1m × 0,5m = 0,5 m² |
| **SHEET** | Folha | 500 folhas de papel A4 |
| **LOT** | Lote | Corte especial a €50/lote |
| **HOUR** | Hora | Acabamento a €30/hora |
| **Margin** | Margem | 30% = 0,30 |
| **Markup** | Markup operacional | 20% = 0,20 |
| **Rounding Step** | Degrau de arredondamento | 0,05 = múltiplos de 5 centavos |
| **Loss Factor** | Fator de perda | 3% = 0,03 |
| **Yield** | Rendimento | 1 tiro = 1 unidade |
| **Setup** | Preparação | 15 minutos de setup |
| **VAT** | IVA | 23% = 0,23 |

---

## 🎓 Dicas de Uso

### Para Administradores:

1. **Configure primeiro as configurações globais** antes de criar produtos
2. **Use margens dinâmicas** para criar promoções automáticas
3. **Configure preços por cliente** para clientes especiais
4. **Teste os cálculos** com diferentes quantidades antes de ativar produtos
5. **Use variantes de material** para diferentes formatos do mesmo material

### Para Comerciais:

1. **Sempre selecione o cliente** para aplicar preços personalizados
2. **Verifique os mínimos** antes de criar o orçamento
3. **Use as dimensões padrão** quando disponíveis
4. **Revise o breakdown** para entender o cálculo
5. **Salve os orçamentos** para histórico e referência

---

## 📞 Suporte

Para dúvidas ou problemas, consulte:
- Documentação técnica do sistema
- Equipe de desenvolvimento
- Manual de usuário

---

**Versão**: 1.0  
**Última atualização**: 2024  
**Sistema**: MyPrint.pt - Sistema de Orçamentação Gráfica

