# Configuração na Vercel

Este documento explica como configurar as variáveis de ambiente necessárias na Vercel para que o sistema funcione corretamente.

## Variáveis de Ambiente Obrigatórias

### 1. DATABASE_URL

A URL de conexão do seu banco de dados Neon PostgreSQL.

**Como obter:**
1. Acesse o [Neon Console](https://console.neon.tech/)
2. Selecione seu projeto
3. Vá em "Connection Details" ou "Connection String"
4. Copie a connection string (formato: `postgresql://user:password@host/database?sslmode=require`)

**Como configurar na Vercel:**
1. Acesse o painel da Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione uma nova variável:
   - **Name:** `DATABASE_URL`
   - **Value:** Cole a connection string do Neon
   - **Environments:** Selecione Production, Preview e Development (ou apenas Production se preferir)
4. Clique em **Save**

### 2. Variáveis do Firebase (se aplicável)

Se você estiver usando Firebase Authentication, configure também:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

**Como obter:**
1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Vá em **Project Settings** → **Service Accounts**
3. Clique em **Generate New Private Key**
4. Use os valores do arquivo JSON gerado

**Como configurar na Vercel:**
1. Vá em **Settings** → **Environment Variables**
2. Adicione cada variável separadamente
3. Para `FIREBASE_PRIVATE_KEY`, cole o valor completo (incluindo `\n` se houver quebras de linha)

## Verificação

Após configurar as variáveis:

1. Faça um novo deploy na Vercel
2. Verifique os logs do build para garantir que não há erros
3. Teste o acesso ao site
4. Verifique se os dados do banco estão carregando

## Troubleshooting

### Erro: "DATABASE_URL não está configurada"

- Verifique se a variável foi adicionada corretamente na Vercel
- Certifique-se de que selecionou o ambiente correto (Production, Preview, etc.)
- Faça um novo deploy após adicionar a variável

### Erro: "Connection timeout" ou "Can't reach database server"

- Verifique se a connection string está correta
- Verifique se o banco Neon está ativo (não em pausa)
- Verifique as configurações de firewall do Neon (deve permitir conexões de qualquer IP)

### Erro: "Prisma Client could not locate the Query Engine for runtime 'rhel-openssl-3.0.x'"

Este erro ocorre quando o Prisma não gera os binários corretos para o ambiente Linux da Vercel.

**Solução:**
O problema foi corrigido no código com as seguintes mudanças:

1. **`prisma/schema.prisma`**: Adicionado `binaryTargets = ["native", "rhel-openssl-3.0.x", "debian-openssl-3.0.x"]` no generator
2. **`package.json`**: Adicionado script `postinstall: "prisma generate"` e atualizado `build` para incluir `prisma generate`
3. **`vercel.json`**: Criado para garantir que o Prisma seja gerado durante o build na Vercel
4. **`next.config.ts`**: Configurado `outputFileTracingIncludes` para incluir os binários do Prisma no bundle

**Passos para resolver:**
1. Certifique-se de que fez commit de TODAS as mudanças:
   - `prisma/schema.prisma`
   - `package.json`
   - `vercel.json`
   - `next.config.ts`
2. Faça um novo deploy na Vercel
3. Verifique os logs do build para confirmar que `prisma generate` foi executado
4. O Prisma Client será gerado automaticamente durante o build com os binários corretos para Linux

**Se o erro persistir:**
- Verifique os logs do build na Vercel para ver se `prisma generate` está sendo executado
- Certifique-se de que todas as mudanças foram commitadas e enviadas para o repositório
- Tente fazer um redeploy forçado (deletar e criar novo deployment)

### Dados não carregam

- Verifique os logs da Vercel em **Deployments** → **Functions** → **View Function Logs**
- Verifique se há erros de conexão com o banco
- Teste a connection string localmente usando `psql` ou um cliente PostgreSQL

## Exemplo de Connection String do Neon

```
postgresql://usuario:senha@ep-xxxxx-xxxxx.us-east-2.aws.neon.tech/banco?sslmode=require
```

**Importante:** 
- Não compartilhe sua connection string publicamente
- Use variáveis de ambiente sempre
- Não commite arquivos `.env` com credenciais no Git

