# ✅ Atualização: Preços por Cliente

## 📋 O que foi feito:

### 1. **Scripts de Importação de Clientes**
- ✅ `prisma/seed.customers.from-excel.ts` - Extrai e adiciona clientes do Excel
- ✅ Todos os 5 clientes já existiam no sistema (TECOFIX, ISCF, RODRIGUES & GONÇALVES, WMG, Abbott)

### 2. **Scripts de Importação de Preços por Cliente**
- ✅ `prisma/patch.printings.customer-prices.ts` - Importa preços de impressão por cliente do Excel
- ✅ 7 preços importados/atualizados:
  - TECOFIX → Tela 85×200 – Leiripantone: €35.00
  - TECOFIX → Impressão e Acabamento – Publifast: €32.39
  - RODRIGUES & GONÇALVES → Impressão NHM – Balcão Panel Track: €45.00
  - WMG → Impressão NHM (Peça 1 + Peça 2): €72.00
  - ISCF → Tela 85×200 – Leiripantone: €30.00
  - Abbott → Tela 85×200 – Leiripantone: €30.00

### 3. **Atualizações na UI**

#### Página de Detalhes de Impressão (`app/(admin)/printing/[id]/page.tsx`)
- ✅ Adicionada seção "Preços por Cliente"
- ✅ Exibe tabela com:
  - Nome do cliente (link para página do cliente)
  - Lados (sides)
  - Preço unitário
  - Prioridade
  - Estado (Ativo/Inativo)
- ✅ Mensagem quando não há preços configurados

#### API de Preços por Cliente (`app/api/admin/customer-prices/printing/route.ts`)
- ✅ Atualizada para aceitar `printingId` como parâmetro
- ✅ Retorna dados incluindo informações do cliente e impressão
- ✅ Suporta busca por `customerId` ou `printingId`

### 4. **Estrutura Existente (já estava implementada)**
- ✅ `PrintingCustomerPrice` model no Prisma
- ✅ `FinishCustomerPrice` model no Prisma
- ✅ `MaterialCustomerPrice` model no Prisma
- ✅ Página de detalhes do cliente (`app/(admin)/customers/[id]/page.tsx`) com abas para gerenciar preços
- ✅ APIs para criar/editar/deletar preços por cliente

---

## 🎯 Scripts Disponíveis:

```bash
# Importar clientes do Excel
npm run seed:customers:from-excel

# Importar preços de impressão por cliente do Excel
npm run patch:printings:customer-prices
```

---

## 📝 Notas:

1. **Preços por Cliente já podem ser gerenciados:**
   - Na página do cliente (`/customers/[id]`) → Aba "Prices"
   - Na página de detalhes da impressão (`/printing/[id]`) → Seção "Preços por Cliente" (somente visualização)

2. **Para adicionar preços por cliente:**
   - Acesse a página do cliente
   - Vá para a aba "Prices"
   - Selecione "Impressão" e adicione o preço

3. **Campos não removidos:**
   - Todos os campos existentes são necessários e estão sendo utilizados
   - Não há campos desnecessários para remover

---

## ✅ Status: Completo

Todos os clientes foram identificados e os preços por cliente foram importados do Excel. A UI foi atualizada para exibir preços por cliente nas páginas de detalhes de impressão.

