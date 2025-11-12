import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { adminAuth } from "../lib/auth";

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Uso: npx tsx scripts/set-user-role.ts <email> <role>");
    console.error("Exemplo: npx tsx scripts/set-user-role.ts admin@example.com ADMIN");
    process.exit(1);
  }

  const email = args[0];
  const role = args[1].toUpperCase();

  if (role !== "ADMIN" && role !== "COMMERCIAL") {
    console.error("Role deve ser ADMIN ou COMMERCIAL");
    process.exit(1);
  }

  try {
    const user = await adminAuth.getUserByEmail(email);
    
    await adminAuth.setCustomUserClaims(user.uid, { role });
    
    console.log(`✅ Role "${role}" definido para usuário ${email} (UID: ${user.uid})`);
    console.log(`⚠️  O usuário precisa fazer logout e login novamente para que as mudanças tenham efeito.`);
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      console.error(`❌ Usuário com email ${email} não encontrado no Firebase`);
    } else {
      console.error(`❌ Erro: ${error.message}`);
    }
    process.exit(1);
  }
}

main();

