import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { localDateOf, safeTimeZone } from "@/lib/dates";

// Página de login (a home "/" é o dashboard e exige sessão)
export const SIGN_IN_PATH = "/login";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  timeZone: string;
  /** "Hoje" (YYYY-MM-DD) no fuso do usuário, calculado uma vez por requisição */
  today: string;
};

/**
 * Único ponto de entrada da identidade do usuário na camada de dados.
 * Todas as funções de lib/dal/* chamam isto em vez de receber um userId de fora:
 * assim nenhuma delas pode ser usada para ler ou alterar dados de outra pessoa.
 *
 * cache() do React: com session strategy "database" cada auth() consulta o banco;
 * aqui isso acontece no máximo uma vez por requisição.
 *
 * Sem sessão -> redirect (lança NEXT_REDIRECT; funciona em páginas e em Server Actions).
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  // Cache Components: o auth() do Auth.js usa crypto.getRandomValues() antes de ler os cookies,
  // e o Next acusa "unstable value while prerendering". connection() marca o trecho como
  // dependente da requisição antes disso.
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect(SIGN_IN_PATH);

  const timeZone = safeTimeZone(session.user.timezone);
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    timeZone,
    today: localDateOf(new Date(), timeZone),
  };
});
