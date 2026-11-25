// Erros de regra de negócio e o formato de retorno das Server Actions.
// Sem "server-only": o tipo ActionResult também é usado pelos Client Components.

export type DomainErrorCode = "BAD_REQUEST" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT";

/**
 * Erro esperado (equivalente aos 400/403/404/409 da API antiga).
 * A camada de dados lança; runAction converte em { ok: false } para a tela exibir.
 * Erros lançados que NÃO são DomainError chegam ao cliente com a mensagem ocultada em produção.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: DomainErrorCode | "VALIDATION"; error: string };
