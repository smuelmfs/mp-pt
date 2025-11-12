// Utilitários de autenticação
import { adminAuth } from "./firebase-admin";
import { DecodedIdToken } from "firebase-admin/auth";

export interface UserClaims {
  role?: "ADMIN" | "COMMERCIAL";
  email?: string;
  name?: string;
}

/**
 * Verifica um token ID do Firebase e retorna os dados do usuário
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken & UserClaims> {
  try {
    if (!adminAuth) {
      throw new Error("Firebase Admin não inicializado");
    }
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken as DecodedIdToken & UserClaims;
  } catch (error: any) {
    const errorMessage = error?.code === "auth/id-token-expired" 
      ? "Token expirado"
      : error?.code === "auth/argument-error"
      ? "Token inválido"
      : error?.message || "Token inválido ou expirado";
    throw new Error(errorMessage);
  }
}

/**
 * Define claims customizados para um usuário (ex: role)
 */
export async function setCustomUserClaims(uid: string, claims: UserClaims): Promise<void> {
  await adminAuth.setCustomUserClaims(uid, claims);
}

/**
 * Obtém os dados do usuário do Firebase
 */
export async function getUserByUid(uid: string) {
  return await adminAuth.getUser(uid);
}

/**
 * Obtém o role do usuário a partir do token
 */
export async function getUserRole(idToken: string): Promise<"ADMIN" | "COMMERCIAL" | null> {
  try {
    const decoded = await verifyIdToken(idToken);
    return decoded.role || null;
  } catch {
    return null;
  }
}

// Re-export adminAuth para uso em scripts
export { adminAuth };

