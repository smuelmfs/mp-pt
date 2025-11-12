import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Verifica se DATABASE_URL está configurada
if (!process.env.DATABASE_URL) {
  console.error(
    "⚠️  DATABASE_URL não está configurada. " +
    "Por favor, configure a variável de ambiente DATABASE_URL com a URL de conexão do seu banco de dados Neon."
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Testa a conexão na inicialização (apenas em produção para evitar overhead em desenvolvimento)
if (process.env.NODE_ENV === "production" && !globalForPrisma.prisma) {
  prisma.$connect().catch((error) => {
    console.error("❌ Erro ao conectar com o banco de dados:", error);
    console.error(
      "💡 Verifique se a variável DATABASE_URL está configurada corretamente na Vercel."
    );
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
