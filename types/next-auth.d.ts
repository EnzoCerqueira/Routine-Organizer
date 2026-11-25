import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  // Campo customizado da tabela User (vem do banco via adapter)
  interface User {
    timezone: string;
  }

  interface Session {
    user: {
      id: string;
      timezone: string;
    } & DefaultSession["user"];
  }
}
