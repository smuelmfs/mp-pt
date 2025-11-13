import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyIdToken } from "@/lib/auth";

export default async function QuotesLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const idToken = cookieStore.get("firebase-token")?.value;
  const devRole = cookieStore.get("role")?.value;

  if (devRole === "ADMIN") {
    redirect("/products");
  }

  if (devRole === "COMMERCIAL") {
    return <>{children}</>;
  }

  if (!idToken) {
    redirect("/login?redirect=/quotes");
  }

  try {
    const decoded = await verifyIdToken(idToken);
    if (decoded.role === "ADMIN") {
      redirect("/products");
    }
    if (decoded.role !== "COMMERCIAL") {
      redirect("/login?redirect=/quotes");
    }
    return <>{children}</>;
  } catch {
    redirect("/login?redirect=/quotes");
  }
}


