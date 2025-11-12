import { adminAuth } from "./firebase-admin";
import { DecodedIdToken } from "firebase-admin/auth";

export interface UserClaims {
  role?: "ADMIN" | "COMMERCIAL";
  email?: string;
  name?: string;
}

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

export async function setCustomUserClaims(uid: string, claims: UserClaims): Promise<void> {
  await adminAuth.setCustomUserClaims(uid, claims);
}

export async function getUserByUid(uid: string) {
  return await adminAuth.getUser(uid);
}

export async function getUserRole(idToken: string): Promise<"ADMIN" | "COMMERCIAL" | null> {
  try {
    const decoded = await verifyIdToken(idToken);
    return decoded.role || null;
  } catch {
    return null;
  }
}

export { adminAuth };

