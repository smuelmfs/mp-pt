# 📊 Plano de Importação do Excel "CÁLCULO DE PRODUÇÃO 2024.xlsx"

## 📋 Resumo das Abas Encontradas

### ✅ **1. IMPRESSÃO** (1000 linhas, 3 colunas)
**Estrutura:**
- FORMATO IMPRESSÃO (ex: A4, SRA4, A3, SRA3, 33x48)
- COR (ex: K)
- PREÇO POR IMPRESSÃO (ex: 0.05)

**Mapeamento para o Sistema:**
- → `Printing` model
- `formatLabel` = FORMATO IMPRESSÃO
- `technology` = DIGITAL (assumir)
- `unitPrice` = PREÇO POR IMPRESSÃO
- `colors` = COR (K = 1 cor, CMYK = 4 cores, etc.)

---

### ✅ **2. PAPEL** (1000 linhas, 8 colunas)
**Estrutura:**
- MARCA (INAPA, ANTALIS)
- GLOSS / SILK
- GRAMAGEM PAPEL
- QUANTIDADE
- PREÇO
- PREÇO / FOLHA

**Status:** ✅ Já importado parcialmente
**Ação:** Verificar se há novos materiais ou atualizações

---

### ✅ **3. ACABAMENTO** (1014 linhas, 14 colunas)
**Estrutura:**
- CUSTO DE CORTE
- FORMATO
- VALOR
- QUANTIDADE
- VALOR TOTAL

**Mapeamento para o Sistema:**
- → `Finish` model
- `name` = FORMATO (ex: NORMAL, A5, A4, A3)
- `category` = CORTE
- `baseCost` = VALOR
- `unit` = UNIT ou SHEET
- `calcType` = PER_UNIT

---

### ✅ **4. CARTÕES DE VISITA** (1013 linhas, 19 colunas)
**Estrutura:**
- QUANTIDADE ATÉ (X) Unid.
- VALOR (preço base)
- CORTE (ATÉ 1000 UNID., etc.)
- PLASTIFICAÇÃO (1 FACE, 2 FACES)
- FOIL (1 FACE, 2 FACES)
- 300m (quantidade, custo)

**Mapeamento para o Sistema:**
- → `Product` model (categoria: Cartões de Visita)
- → `ProductMaterial` (papel)
- → `ProductFinish` (corte, plastificação, foil)
- Preços por quantidade (tiers)

---

### ✅ **5. IMPRESSÕES SINGULARES** (854 linhas, 17 colunas)
**Estrutura:**
- FORMATO DE IMPRESSÃO (ex: SRA3 CMYK FRENTE)
- CUSTO DE IMPRESSÃO
- FORMATO (papel)
- GRAMAGEM
- CUSTO UNITÁRIO (papel)
- CORTE
- PLASTIFICAÇÃO
- VINCO

**Mapeamento para o Sistema:**
- → `Printing` model (impressões específicas)
- → `Material` model (papel com gramagem)
- → `Finish` model (corte, plastificação, vinco)

---

### ✅ **6. CÁLCULO CATALOGOS** (894 linhas, 21 colunas)
**Estrutura:**
- FORMATO DE IMPRESSÃO
- CUSTO DE IMPRESSÃO
- PAPEL (formato, gramagem, custo unitário)
- CORTE
- PLASTIFICAÇÃO (com margem de lucro)
- LAMINAÇÃO FOIL (com margem de lucro)

**Mapeamento para o Sistema:**
- → `Product` model (categoria: Catálogos)
- → `ProductMaterial`, `ProductPrinting`, `ProductFinish`
- Margens de lucro específicas

---

### ✅ **7. IMP. GRANDE FORMATO** (1002 linhas, 10 colunas)
**Estrutura:**
- IMPRESSÃO (ex: Caixas de Luz, Impressão de Lona)
- FORNECEDOR (Leiripantone, NHM, BE EXPO.)
- Preço m²
- Quant. m²
- CUSTO PRODUÇÃO
- % LUCRO
- TOTAL

**Status:** ✅ Já temos alguns (Tela 85×200, etc.)
**Ação:** Verificar se há novos fornecedores/impressões

---

### ✅ **8. ENVELOPES** (979 linhas, 12 colunas)
**Estrutura:**
- IMPRESSÃO (FORMATO DE IMPRESSÃO, CUSTO)
- ENVELOPES (FORMATO, TIPO, CUSTO UNITÁRIO)
- Ex: DL 90, DL 120 (JANELA, S JANELA)

**Mapeamento para o Sistema:**
- → `Product` model (categoria: Envelopes)
- → `Material` model (envelopes)
- → `ProductMaterial`, `ProductPrinting`

---

### ✅ **9. PASTAS PARA A4** (1004 linhas, 20 colunas)
**Estrutura:**
- IMPRESSÃO
- PAPEL (formato, gramagem, custo)
- CORTE
- PLASTIFICAÇÃO
- DOBRA

**Mapeamento para o Sistema:**
- → `Product` model (categoria: Pastas A4)
- → `ProductMaterial`, `ProductPrinting`, `ProductFinish`

---

### ✅ **10. FLEX** (1002 linhas, 18 colunas)
**Estrutura:**
- Medida (ex: 10x10, 21x10)
- Custo Unitário
- PERSONALIZAÇÃO (Nr de logos, FACES, LOGOS tamanho)
- PREÇO Material
- mao obra tempo
- PREÇO Material (2 faces)

**Mapeamento para o Sistema:**
- → `Product` model (categoria: Flex)
- → `Material` model (flex)
- Preços por medida e personalização

---

### ✅ **11. CARTOES PVC** (15 linhas, 15 colunas)
**Estrutura:**
- CARTÃO (TIPO: BRANCO SIMPLES, BRANCO BANDA MAG, BRANCO CHIP, TRANSPARENTE)
- CUSTO UNITÁRIO
- CARTUXO (COR: CMYK, K)
- CUSTO CARTUXO
- TEMPO PRODUÇÃO (FACES, TEMPO MÉDIO)
- VALORES DE MERCADO (concorrente, valor unit.)

**Mapeamento para o Sistema:**
- → `Product` model (categoria: Cartões PVC)
- → `Material` model (cartão PVC)
- → `Printing` model (cartuxo)
- Tempo de produção

---

### ✅ **12. ALVEOLAR** (22 linhas, 17 colunas)
**Estrutura:**
- TIPO (ex: Dipac Light White PP Multiwall Sheet)
- LARGURA (M)
- COMPRIMENTO (M)
- CUSTO FORNECEDOR
- CUSTO M / 2
- DIMENSÃO (LARGURA, ALTURA, M²)
- % LUCRO
- TOTAL UNITÁRIO

**Status:** ✅ Já importado parcialmente
**Ação:** Verificar se há novos materiais ou atualizações

---

### ✅ **13. VINIL** (24 linhas, 15 colunas)
**Estrutura:**
- TIPO (ex: Suptac S5001B Polar White Gloss)
- LARGURA (M)
- COMPRIMENTO (M)
- CUSTO FORNECEDOR
- CUSTO M / 2
- DIMENSÃO (LARGURA, ALTURA, M²)
- % LUCRO
- TOTAL UNITÁRIO

**Status:** ✅ Já importado parcialmente
**Ação:** Verificar se há novos materiais ou atualizações

---

### ✅ **14. IMPRESSÃO UV** (33 linhas, 18 colunas)
**Estrutura:**
- Material (ex: DTF Uv, Impressão UV)
- Custo Unitário
- Calculo m² placas
- Medida m²
- Un. por gabarito
- CALCULO suporte imp. (PVC 3050x1220x3)
- Nr. Placas
- tamanho corte
- qt. por placa
- preço corte
- total

**Mapeamento para o Sistema:**
- → `Printing` model (technology: UV)
- → `Material` model (materiais UV)
- Cálculos complexos de m² e gabaritos

---

### ✅ **15. PRODUTOS PUBLICITÁRIOS** (1000 linhas, 11 colunas)
**Estrutura:**
- CLIENTE (TECOFIX, RODRIGUES & GONÇALVES, WMG, ISCF, Abbott)
- PRODUTO (ROLL UP, Bandeira Gota, BALCÃO PANEL TRACK, etc.)
- SUPORTE (Base Roll Up Weddt, Estrutua Weddt, Balcaão WEDDT, etc.)
- CUSTO SUPORTE
- IMPRESSÃO (Tela 85x200 Leiripantone, Impressão e Acabamento Publifast, etc.)
- CUSTO IMPRESSÃO
- CUSTO PRODUÇÃO UNITÁRIO
- % LUCRO
- TOTAL UNITÁRIO

**Status:** ✅ Já temos alguns produtos e clientes
**Ação:** Verificar se há novos produtos, clientes ou configurações

---

## 🎯 Plano de Ação

### Fase 1: Materiais e Fornecedores ✅ (Parcialmente feito)
- [x] PAPEL - Verificar se está completo
- [x] VINIL - Verificar se está completo
- [x] ALVEOLAR - Verificar se está completo
- [ ] IMPRESSÃO UV - Materiais UV

### Fase 2: Impressões
- [ ] IMPRESSÃO - Impressões básicas (DIGITAL)
- [ ] IMPRESSÕES SINGULARES - Impressões específicas
- [ ] IMP. GRANDE FORMATO - Verificar/atualizar
- [ ] IMPRESSÃO UV - Impressões UV

### Fase 3: Acabamentos
- [ ] ACABAMENTO - Cortes
- [ ] Plastificação (de várias abas)
- [ ] Vinco
- [ ] Dobra
- [ ] Laminação Foil

### Fase 4: Produtos
- [ ] CARTÕES DE VISITA
- [ ] CÁLCULO CATALOGOS
- [ ] ENVELOPES
- [ ] PASTAS PARA A4
- [ ] FLEX
- [ ] CARTOES PVC
- [ ] PRODUTOS PUBLICITÁRIOS (atualizar/verificar)

### Fase 5: Clientes e Preços Específicos
- [ ] PRODUTOS PUBLICITÁRIOS - Preços por cliente
- [ ] Margens de lucro por produto/cliente

---

## 📝 Notas Importantes

1. **Formato de dados:** Algumas células têm fórmulas (#DIV/0!, etc.) que precisam ser tratadas
2. **Headers:** Algumas abas têm headers em múltiplas linhas ou mescladas
3. **Valores nulos:** Muitas células vazias que precisam ser tratadas
4. **Fornecedores:** Identificar e criar todos os fornecedores mencionados
5. **Categorias:** Criar categorias de produtos se não existirem
6. **Margens:** Extrair margens de lucro e aplicar aos produtos

---

## 🚀 Próximos Passos

1. Criar scripts de importação específicos para cada aba
2. Validar dados antes de importar
3. Mapear corretamente para o schema Prisma
4. Criar seeds/patches idempotentes
5. Testar importação incremental

