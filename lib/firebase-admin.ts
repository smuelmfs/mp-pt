import * as dotenv from "dotenv";
import * as path from "path";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

if (typeof window === "undefined") {
  dotenv.config({ path: path.join(process.cwd(), ".env.local") });
}

let app: App;
let adminAuth: Auth;

if (getApps().length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccount) {
    try {
      const serviceAccountJson = JSON.parse(serviceAccount);
      app = initializeApp({
        credential: cert(serviceAccountJson),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } catch (error) {
      console.error("Erro ao inicializar Firebase Admin:", error);
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (projectId && clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn("⚠️  Firebase Admin SDK: Credenciais não encontradas. Configure as variáveis de ambiente.");
      app = initializeApp({
        projectId: projectId || "default-project",
      });
    }
  }
  
  adminAuth = getAuth(app);
} else {
  app = getApps()[0];
  adminAuth = getAuth(app);
}

export { adminAuth };
export default app;

