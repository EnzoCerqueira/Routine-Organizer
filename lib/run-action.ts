import "server-only";
import { refresh } from "next/cache";
import type { z } from "zod";
import { requireUser } from "@/lib/dal/user";
import { DomainError, type ActionResult } from "@/lib/errors";

/**
 * Esqueleto comum de toda Server Action:
 * 1. Sessão primeiro (sem sessão -> redirect; usuário anônimo não recebe nem erro de validação)
 * 2. Valida a entrada com zod (o argumento vem do cliente: nunca confiar no tipo TS)
 * 3. Executa a regra de negócio da camada de dados
 * 4. refresh(): a resposta da action já traz a página re-renderizada com os dados novos
 *
 * Erros esperados (DomainError / validação) voltam como { ok: false } para a tela exibir.
 * Qualquer outro erro é relançado: o Next oculta a mensagem em produção e loga no servidor.
 */
export async function runAction<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  fn: (data: z.output<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  // Fora do try: o redirect lança NEXT_REDIRECT, que não pode ser capturado aqui
  await requireUser();

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  let data: T;
  try {
    data = await fn(parsed.data);
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, code: err.code, error: err.message };
    throw err;
  }

  refresh();
  return { ok: true, data };
}
