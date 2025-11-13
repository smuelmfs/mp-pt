# Resposta para a Conversa sobre Deploy no cPanel

## Resposta Sugerida:

---

Olá! Sim, consigo fazer o deploy no cPanel. Deixa-me explicar o que é necessário:

**O sistema está feito em:**
- **Next.js 16** (framework React com TypeScript)
- **PostgreSQL** como banco de dados (atualmente usando Neon, mas pode ser qualquer PostgreSQL)
- **Firebase** para autenticação de utilizadores
- **Node.js** (precisa versão 18 ou superior)

**O que preciso para fazer o deploy:**

1. **Acesso ao cPanel** com:
   - Node.js disponível (geralmente via "Setup Node.js App")
   - PostgreSQL disponível (pode ser do próprio cPanel ou externo)
   - Acesso para configurar variáveis de ambiente

2. **Credenciais necessárias:**
   - **Banco de dados:** Connection string PostgreSQL (formato: `postgresql://user:pass@host/db`)
   - **Firebase:** 6 variáveis de ambiente do Firebase (API Key, Project ID, etc.)
   - **Firebase Admin:** Credenciais do service account para autenticação no backend

3. **Processo de deploy:**
   - Upload do código (ou conectar Git se o cPanel suportar)
   - Instalar dependências (`npm install`)
   - Configurar variáveis de ambiente
   - Build do projeto (`npm run build`)
   - Iniciar servidor (`npm start`)

**Nota importante:** Next.js no cPanel pode precisar de algumas configurações especiais (como modo standalone), mas isso consigo resolver quando tiver acesso.

Quando quiseres, podes dar-me acesso e eu faço a análise completa e o deploy. Preciso mesmo é de:
- Acesso ao cPanel
- Credenciais do banco de dados
- Credenciais do Firebase

Está tudo documentado no projeto, por isso consigo fazer sem problemas! 👍

---

## Informações Técnicas Detalhadas (para referência):

### Variáveis de Ambiente Obrigatórias:

**Banco de Dados:**
- `DATABASE_URL` - Connection string PostgreSQL

**Firebase Client (6 variáveis):**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Firebase Admin (1 de 2 opções):**
- Opção A: `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON completo)
- Opção B: `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`

### Comandos de Build:
```bash
npm install
npx prisma generate
npm run build
npm start
```

### Requisitos Mínimos:
- Node.js 18+
- PostgreSQL
- ~1GB espaço em disco (para node_modules + build)

