import { User } from "firebase/auth";

export interface UserInfo {
  uid: string;
  email: string | null;
  role: "ADMIN" | "COMMERCIAL" | null;
  name: string;
  authenticated: boolean;
}

export async function getCurrentUser(): Promise<UserInfo | null> {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    
    if (data.authenticated === false || !data.role) {
      return null;
    }
    
    return {
      uid: data.uid || "",
      email: data.email || null,
      role: data.role || null,
      name: data.name || "Usuário",
      authenticated: true,
    };
  } catch (error) {
    console.error("Erro ao obter usuário:", error);
    return null;
  }
}

export async function hasRole(requiredRole: "ADMIN" | "COMMERCIAL"): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === requiredRole;
}

export async function isAdmin(): Promise<boolean> {
  return await hasRole("ADMIN");
}

