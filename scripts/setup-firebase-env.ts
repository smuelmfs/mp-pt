import * as fs from "fs";
import * as path from "path";

function main() {
  const jsonPath = process.argv[2];
  
  if (!jsonPath) {
    console.error("❌ Uso: npx tsx scripts/setup-firebase-env.ts <caminho-do-json>");
    console.error("Exemplo: npx tsx scripts/setup-firebase-env.ts \"C:\\Users\\RED MARKETING\\Downloads\\myprint-pt-firebase-adminsdk-fbsvc-138f449022.json\"");
    process.exit(1);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Arquivo não encontrado: ${jsonPath}`);
    process.exit(1);
  }

  try {
    const jsonContent = fs.readFileSync(jsonPath, "utf-8");
    const serviceAccount = JSON.parse(jsonContent);

    const envPath = path.join(process.cwd(), ".env.local");
    
    let existingEnv = "";
    if (fs.existsSync(envPath)) {
      existingEnv = fs.readFileSync(envPath, "utf-8");
    }

    const envLines: string[] = [];
    
    if (existingEnv) {
      const lines = existingEnv.split("\n");
      for (const line of lines) {
        if (!line.trim().startsWith("FIREBASE_") && !line.trim().startsWith("NEXT_PUBLIC_FIREBASE_")) {
          envLines.push(line);
        }
      }
    }

    envLines.push("");
    envLines.push("# Firebase Admin SDK");
    envLines.push(`FIREBASE_SERVICE_ACCOUNT_KEY=${JSON.stringify(serviceAccount)}`);
    envLines.push("");

    envLines.push("# Firebase Client SDK (obtenha no Firebase Console > Project Settings > General > Your apps)");
    envLines.push("NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here");
    envLines.push(`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${serviceAccount.project_id}.firebaseapp.com`);
    envLines.push(`NEXT_PUBLIC_FIREBASE_PROJECT_ID=${serviceAccount.project_id}`);
    envLines.push(`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${serviceAccount.project_id}.appspot.com`);
    envLines.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id");
    envLines.push("NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id");
    envLines.push("");

    fs.writeFileSync(envPath, envLines.join("\n"), "utf-8");

    console.log("✅ Arquivo .env.local criado/atualizado com sucesso!");
    console.log("");
    console.log("⚠️  IMPORTANTE: Você ainda precisa preencher as credenciais do Client SDK:");
    console.log("   1. Acesse https://console.firebase.google.com/");
    console.log("   2. Vá em Project Settings > General");
    console.log("   3. Na seção 'Your apps', clique no ícone Web (</>)");
    console.log("   4. Copie as credenciais e atualize o arquivo .env.local");
    console.log("");
    console.log(`📁 Arquivo criado em: ${envPath}`);
  } catch (error: any) {
    console.error(`❌ Erro: ${error.message}`);
    process.exit(1);
  }
}

main();

