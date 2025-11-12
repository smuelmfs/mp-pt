# 🔐 Configuração de Autenticação Firebase

**Data:** 11/11/2025  
**Status:** ✅ Implementado

---

## 📋 Pré-requisitos

1. Projeto Firebase criado no [Firebase Console](https://console.firebase.google.com/)
2. Firebase Authentication habilitado no projeto
3. Método de autenticação "Email/Password" habilitado

---

## 🔧 Configuração

### 1. **Variáveis de Ambiente**

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Firebase Configuration (Client SDK)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK
# Opção 1: Service Account JSON (recomendado)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Opção 2: Variáveis individuais
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2. **Obter Credenciais do Firebase**

#### Client SDK (Frontend):
1. No Firebase Console, vá em **Project Settings** > **General**
2. Na seção "Your apps", clique em **Web** (</>)
3. Copie as credenciais e adicione ao `.env.local`

#### Admin SDK (Backend):
1. No Firebase Console, vá em **Project Settings** > **Service Accounts**
2. Clique em **Generate New Private Key**
3. Baixe o arquivo JSON
4. Opção A: Cole o conteúdo JSON completo na variável `FIREBASE_SERVICE_ACCOUNT_KEY`
5. Opção B: Extraia `project_id`, `client_email` e `private_key` para variáveis individuais

---

## 👥 Gerenciamento de Usuários

### Criar Usuário no Firebase Console

1. Acesse **Authentication** > **Users** no Firebase Console
2. Clique em **Add User**
3. Preencha email e senha
4. Clique em **Add User**

### Definir Role de Usuário

Use o script fornecido para definir roles (ADMIN ou COMMERCIAL):

```bash
npx tsx scripts/set-user-role.ts <email> <role>
```

**Exemplos:**
```bash
# Definir usuário como ADMIN
npx tsx scripts/set-user-role.ts admin@example.com ADMIN

# Definir usuário como COMMERCIAL
npx tsx scripts/set-user-role.ts comercial@example.com COMMERCIAL
```

**⚠️ Importante:** Após definir um role, o usuário precisa fazer **logout e login novamente** para que as mudanças tenham efeito.

---

## 🏗️ Arquitetura

### Frontend (`lib/firebase.ts`)
- Inicializa Firebase Client SDK
- Usado para autenticação no navegador
- Exporta `auth` para uso em componentes React

### Backend (`lib/firebase-admin.ts`)
- Inicializa Firebase Admin SDK
- Usado para verificar tokens no servidor
- Exporta `adminAuth` para uso em API routes

### Utilitários (`lib/auth.ts`)
- `verifyIdToken()`: Verifica token e retorna dados do usuário
- `setCustomUserClaims()`: Define roles customizados
- `getUserRole()`: Obtém role do usuário

### API Routes
- `/api/auth/verify`: Verifica token e retorna dados do usuário
- `/api/auth/session`: Obtém sessão atual do usuário
- `/api/me`: Retorna informações do usuário autenticado

### Middleware (`middleware.ts`)
- Verifica token Firebase em cookies
- Protege rotas admin (requer role ADMIN)
- Redireciona para login se não autenticado

---

## 🔄 Fluxo de Autenticação

1. **Login:**
   - Usuário preenche email/senha na página `/login`
   - Firebase Auth autentica e retorna token
   - Token é armazenado em cookie `firebase-token`
   - Token é verificado no backend para obter role

2. **Proteção de Rotas:**
   - Middleware verifica token no cookie
   - Se token válido, permite acesso
   - Se token inválido ou ausente, redireciona para `/login`

3. **Logout:**
   - Usuário clica em "Sair"
   - Firebase Auth faz sign out
   - Cookie `firebase-token` é removido

---

## 🛠️ Modo Desenvolvimento

O sistema mantém um **modo de desenvolvimento** como fallback:

- Na página de login, há um toggle "Modo Desenvolvimento"
- Quando ativado, permite login sem Firebase (apenas escolher role)
- Útil para desenvolvimento local sem configurar Firebase

---

## 📝 Próximos Passos

1. ✅ Configuração básica - **CONCLUÍDO**
2. ⏳ Criar usuários no Firebase Console
3. ⏳ Definir roles dos usuários usando script
4. ⏳ Testar login/logout
5. ⏳ Testar proteção de rotas admin
6. ⏳ (Opcional) Adicionar mais métodos de autenticação (Google, etc.)

---

## ⚠️ Notas Importantes

1. **Segurança:** Nunca commite o arquivo `.env.local` no Git
2. **Roles:** Roles são armazenados como Custom Claims no Firebase
3. **Tokens:** Tokens expiram após 1 hora (renovação automática)
4. **Cookies:** Token é armazenado em cookie HTTP-only para segurança

---

**Status:** ✅ Implementação Completa - Aguardando Configuração do Firebase

