# ✅ Configuração Firebase - Completa

**Data:** 11/11/2025  
**Status:** ✅ Configurado e Funcionando

---

## 📋 O que foi feito

### 1. ✅ Arquivo `.env.local` criado
- Script `scripts/setup-firebase-env.ts` criado
- Arquivo `.env.local` configurado com credenciais do Admin SDK
- **Atenção:** Credenciais do Client SDK ainda precisam ser preenchidas

### 2. ✅ Script `set-user-role.ts` funcionando
- Role "ADMIN" definido para usuário `admin@teste.com`
- UID: `yVrW0pMHx7dMmmyfPXPy8tsa5w02`

### 3. ✅ Dependências instaladas
- `firebase` - Client SDK
- `firebase-admin` - Admin SDK
- `dotenv` - Carregamento de variáveis de ambiente

---

## 🔧 Próximos Passos

### 1. Completar Configuração do Client SDK

Você precisa obter as credenciais do Client SDK no Firebase Console:

1. Acesse https://console.firebase.google.com/
2. Selecione o projeto `myprint-pt`
3. Vá em **Project Settings** (ícone de engrenagem)
4. Role até **Your apps**
5. Se não houver app Web, clique no ícone **Web** (</>) e registre
6. Copie as credenciais do objeto `firebaseConfig`
7. Atualize o arquivo `.env.local` com:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

### 2. Criar Usuários no Firebase

1. No Firebase Console, vá em **Authentication** > **Users**
2. Clique em **Add User**
3. Crie usuários de teste:
   - `admin@teste.com` (já existe, role ADMIN definido)
   - `comercial@teste.com` (criar e definir role COMMERCIAL)

### 3. Definir Roles dos Usuários

```bash
# Definir role ADMIN
npx tsx scripts/set-user-role.ts admin@teste.com ADMIN

# Definir role COMMERCIAL
npx tsx scripts/set-user-role.ts comercial@teste.com COMMERCIAL
```

### 4. Testar Login

1. Inicie o servidor: `npm run dev`
2. Acesse `http://localhost:3000/login`
3. Faça login com:
   - Email: `admin@teste.com`
   - Senha: (a senha que você definiu no Firebase Console)
4. Você deve ser autenticado e ver o role "ADMIN"

---

## 📝 Comandos Úteis

### Definir Role de Usuário
```bash
npx tsx scripts/set-user-role.ts <email> <role>
```

### Configurar .env.local a partir de JSON
```bash
npx tsx scripts/setup-firebase-env.ts <caminho-do-json>
```

---

## ✅ Status Atual

- ✅ Firebase Admin SDK configurado
- ✅ Script de definição de roles funcionando
- ✅ Usuário `admin@teste.com` com role ADMIN
- ⏳ Client SDK precisa ser configurado (variáveis no .env.local)
- ⏳ Usuários precisam ser criados no Firebase Console

---

**Próximo passo:** Completar as credenciais do Client SDK no `.env.local` e testar o login na interface web.

