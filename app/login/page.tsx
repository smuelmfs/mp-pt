"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function LoginPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const redirect = sp.get("redirect") || "/";

  const [role, setRole] = useState<"ADMIN"|"COMMERCIAL"|"">("");
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  async function loadMe() {
    const res = await fetch("/api/me");
    const j = await res.json();
    setCurrentRole(j.role || null);
  }

  useEffect(() => { loadMe(); }, []);

  async function login() {
    if (!role) { alert("Escolha um papel"); return; }
    const res = await fetch("/api/dev/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) router.replace(redirect);
    else alert("Falha ao logar");
  }

  async function logout() {
    await fetch("/api/dev/logout", { method: "POST" });
    loadMe();
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Login (Dev)</h1>

      <div className="border rounded-xl p-4 space-y-3">
        <div className="text-sm text-gray-600">
          Papel atual: <b>{currentRole ?? "Não autenticado"}</b>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            className={`px-4 py-2 rounded border ${role==="COMMERCIAL" ? "bg-black text-white" : ""}`}
            onClick={() => setRole("COMMERCIAL")}
          >
            Entrar como Comercial
          </button>
          <button
            className={`px-4 py-2 rounded border ${role==="ADMIN" ? "bg-black text-white" : ""}`}
            onClick={() => setRole("ADMIN")}
          >
            Entrar como Admin
          </button>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={login}>
            Continuar
          </button>
          <button className="px-4 py-2 rounded border" onClick={logout}>
            Sair
          </button>
        </div>
        <div className="text-xs text-gray-500">
          Após integrar Firebase Auth, esta página deixa de existir: o middleware vai ler o token do Firebase e mapear `role`.
        </div>
      </div>

      <div className="text-sm">
        Áreas:
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li><a className="underline" href="/quotes">Comercial – Orçamentos</a></li>
          <li><a className="underline" href="/products">Admin – Produtos</a></li>
          <li><a className="underline" href="/materials">Admin – Materiais</a></li>
          <li><a className="underline" href="/printing">Admin – Impressões</a></li>
          <li><a className="underline" href="/finishes">Admin – Acabamentos</a></li>
          <li><a className="underline" href="/margins">Admin – Margens</a></li>
        </ul>
      </div>
    </main>
  );
}
