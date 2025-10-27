"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar para categorias por padrão
    router.replace("/quotes/categories");
  }, [router]);

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Redirecionando...</h1>
        <p className="text-gray-600">Você será redirecionado para a página de categorias.</p>
      </div>
    </main>
  );
}