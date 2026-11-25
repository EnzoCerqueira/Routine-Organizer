import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Configuração usada só pela CLI do Prisma (migrate, generate, studio).
// A aplicação conecta pelo driver adapter em lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations precisam da conexão direta do Supabase (porta 5432), não do pooler
  datasource: { url: env("DIRECT_URL") },
});
