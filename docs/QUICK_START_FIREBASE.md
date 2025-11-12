# 🚀 Quick Start - Firebase Authentication

## Configuração Rápida (5 minutos)

### 1. Criar Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em **Add Project**
3. Preencha nome do projeto
4. Continue com as configurações padrão

### 2. Habilitar Authentication

1. No menu lateral, clique em **Authentication**
2. Clique em **Get Started**
3. Vá em **Sign-in method**
4. Habilite **Email/Password**
5. Clique em **Save**

### 3. Obter Credenciais

#### Client SDK (Frontend):
1. Vá em **Project Settings** (ícone de engrenagem)
2. Role até **Your apps**
3. Clique no ícone **Web** (</>)
4. Registre o app (pode usar qualquer nome)
5. Copie as credenciais do objeto `firebaseConfig`

#### Admin SDK (Backend):
1. Vá em **Project Settings** > **Service Accounts**
2. Clique em **Generate New Private Key**
3. Baixe o arquivo JSON
4. Abra o arquivo e copie todo o conteúdo

### 4. Configurar Variáveis de Ambiente

Crie arquivo `.env.local` na raiz do projeto:

```env
# Firebase Client SDK (do passo 3)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin SDK (cole o JSON completo do passo 3)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

### 5. Criar Usuário de Teste

1. No Firebase Console, vá em **Authentication** > **Users**
2. Clique em **Add User**
3. Preencha:
   - Email: `admin@teste.com`
   - Senha: `senha123`
4. Clique em **Add User**

### 6. Definir Role do Usuário

```bash
npx tsx scripts/set-user-role.ts admin@teste.com ADMIN
```

### 7. Testar Login

1. Inicie o servidor: `npm run dev`
2. Acesse `http://localhost:3000/login`
3. Faça login com:
   - Email: `admin@teste.com`
   - Senha: `senha123`
4. Você deve ser redirecionado e ver o role "ADMIN"

---

## ✅ Pronto!

O sistema está configurado com Firebase Authentication. 

**Nota:** O sistema mantém um **modo de desenvolvimento** como fallback. Se não configurar o Firebase, você ainda pode usar o sistema escolhendo um role diretamente na página de login.

---

## 📚 Documentação Completa

Veja `docs/FIREBASE_AUTH_SETUP.md` para documentação detalhada.

