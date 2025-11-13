# Informações para Deploy no cPanel

## Tecnologias e Stack do Sistema

### Framework e Linguagem
- **Next.js 16.0.0** (Framework React)
- **React 19.2.0**
- **TypeScript 5.x**
- **Node.js** (versão recomendada: 18.x ou superior)

### Banco de Dados
- **PostgreSQL** (atualmente usando Neon PostgreSQL)
- **Prisma ORM** (versão 6.17.1) para gerenciamento do banco

### Autenticação
- **Firebase Authentication** (autenticação de usuários)

### Outras Dependências Principais
- Tailwind CSS (estilização)
- Radix UI (componentes)
- Várias bibliotecas de UI e utilitários

---

## Requisitos do Servidor cPanel

### Obrigatórios:
1. **Node.js** instalado (versão 18 ou superior)
   - Verificar se o cPanel suporta Node.js
   - Muitos cPanels têm suporte via "Setup Node.js App"

2. **PostgreSQL** disponível
   - Pode ser o banco do próprio cPanel ou externo (como Neon)
   - Necessário acesso para criar banco de dados e executar migrações

3. **npm** ou **yarn** para instalação de dependências

4. **Espaço em disco** suficiente para:
   - `node_modules` (pode ser grande, ~500MB+)
   - Build do Next.js
   - Arquivos do projeto

### Recomendados:
- **PM2** ou similar para gerenciar o processo Node.js
- **SSL/HTTPS** configurado
- **Domínio** apontado para o cPanel

---

## Variáveis de Ambiente Necessárias

### 1. Banco de Dados (OBRIGATÓRIO)
```
DATABASE_URL=postgresql://usuario:senha@host:porta/banco?sslmode=require
```
- Formato da connection string PostgreSQL
- Atualmente configurado para Neon PostgreSQL, mas pode usar qualquer PostgreSQL

### 2. Firebase - Client SDK (OBRIGATÓRIO)
```
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=id_do_projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=app_id
```

### 3. Firebase - Admin SDK (OBRIGATÓRIO para autenticação no backend)
**Opção A - Usando Service Account JSON:**
```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

**Opção B - Usando variáveis separadas:**
```
FIREBASE_PROJECT_ID=id_do_projeto
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

---

## Processo de Build

### Comandos necessários:
```bash
# 1. Instalar dependências
npm install

# 2. Gerar Prisma Client (obrigatório antes do build)
npx prisma generate

# 3. Executar migrações do banco (se necessário)
npx prisma migrate deploy

# 4. Build do Next.js
npm run build

# 5. Iniciar servidor de produção
npm start
```

### Scripts disponíveis no package.json:
- `npm run build` - Executa `prisma generate && next build`
- `npm start` - Inicia servidor de produção (`next start`)
- `npm run dev` - Modo desenvolvimento (não usar em produção)

---

## Considerações Importantes para cPanel

### ⚠️ Desafios Comuns:

1. **Next.js Standalone Mode**
   - Next.js pode precisar ser configurado em modo standalone para cPanel
   - Adicionar no `next.config.ts`:
   ```typescript
   output: 'standalone'
   ```

2. **Porta do Servidor**
   - cPanel geralmente define a porta automaticamente
   - Pode precisar configurar variável `PORT` ou usar a porta fornecida pelo cPanel

3. **Prisma Binary Targets**
   - O schema já está configurado com binários para Linux
   - Verificar se o servidor cPanel é Linux (geralmente é)

4. **Variáveis de Ambiente**
   - Configurar no cPanel em "Environment Variables" ou no arquivo `.env`
   - Variáveis `NEXT_PUBLIC_*` são expostas ao cliente

5. **Build Time vs Runtime**
   - Prisma precisa ser gerado durante o build
   - Migrações podem precisar ser executadas manualmente

### ✅ Vantagens do cPanel:
- Interface gráfica para gerenciar variáveis de ambiente
- Fácil configuração de domínio e SSL
- Logs acessíveis via interface

---

## Passos Sugeridos para Deploy

1. **Preparação:**
   - Verificar se o cPanel tem Node.js disponível
   - Criar banco PostgreSQL (ou usar externo como Neon)
   - Obter todas as credenciais do Firebase

2. **Upload do Código:**
   - Fazer upload dos arquivos via FTP/File Manager
   - OU conectar repositório Git (se cPanel suportar)

3. **Configuração:**
   - Instalar dependências (`npm install`)
   - Configurar variáveis de ambiente no cPanel
   - Executar `prisma generate`
   - Executar migrações se necessário

4. **Build:**
   - Executar `npm run build`
   - Verificar se build foi bem-sucedido

5. **Iniciar Aplicação:**
   - Configurar Node.js App no cPanel
   - Definir comando de start: `npm start`
   - Verificar porta e domínio

6. **Testes:**
   - Acessar o site
   - Testar login
   - Verificar conexão com banco

---

## Arquivos Importantes para Revisar

- `package.json` - Dependências e scripts
- `next.config.ts` - Configuração do Next.js
- `prisma/schema.prisma` - Schema do banco de dados
- `vercel.json` - Configuração de build (pode não ser necessário no cPanel)

---

## Suporte e Documentação

- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Prisma Deployment:** https://www.prisma.io/docs/guides/deployment
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup

---

## Resumo Rápido para Responder

**Tecnologias:**
- Next.js 16 (React 19) + TypeScript
- PostgreSQL (via Prisma ORM)
- Firebase Authentication

**Requisitos:**
- Node.js 18+
- PostgreSQL
- Variáveis de ambiente configuradas

**Processo:**
- `npm install` → `prisma generate` → `npm run build` → `npm start`

**Variáveis necessárias:**
- DATABASE_URL
- NEXT_PUBLIC_FIREBASE_* (6 variáveis)
- FIREBASE_SERVICE_ACCOUNT_KEY ou FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY

