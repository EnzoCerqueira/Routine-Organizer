import "server-only";
import { Prisma } from "@/generated/prisma/client";

/**
 * Códigos usados:
 * - P2002: violação de unique (duas requisições criando o mesmo registro ao mesmo tempo)
 * - P2003: violação de foreign key (pai apagado entre a checagem e o insert)
 * - P2025: registro não encontrado (já apagado por outra requisição)
 */
export function isPrismaError(err: unknown, code: "P2002" | "P2003" | "P2025"): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}
