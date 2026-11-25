import "server-only";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors";
import { requireUser } from "./user";

const NOT_FOUND = "Meta não encontrada";

export type GoalDto = { id: string; title: string; description: string | null };
export type GoalWithCountDto = GoalDto & { projectCount: number };

const goalSelect = { id: true, title: true, description: true } as const;

/** Metas do usuário, com a contagem de projetos (a tela avisa antes de excluir). */
export async function getGoals(): Promise<GoalWithCountDto[]> {
  const user = await requireUser();
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    select: { ...goalSelect, _count: { select: { projects: true } } },
    orderBy: { createdAt: "asc" },
  });
  return goals.map(({ _count, ...goal }) => ({ ...goal, projectCount: _count.projects }));
}

export async function createGoal(input: { title: string; description?: string }): Promise<GoalDto> {
  const user = await requireUser();
  return prisma.goal.create({
    // Dono sempre da sessão
    data: { title: input.title, description: input.description || null, userId: user.id },
    select: goalSelect,
  });
}

export async function renameGoal(input: { id: string; title: string }): Promise<GoalDto> {
  const user = await requireUser();
  // Filtro de dono no próprio where: count 0 = inexistente ou de outro usuário -> "não encontrada"
  const { count } = await prisma.goal.updateMany({
    where: { id: input.id, userId: user.id },
    data: { title: input.title },
  });
  if (count === 0) throw new DomainError("NOT_FOUND", NOT_FOUND);

  return prisma.goal.findUniqueOrThrow({ where: { id: input.id }, select: goalSelect });
}

/**
 * Meta -> Projeto -> Tarefa não têm cascade no schema: apaga de baixo para cima, tudo-ou-nada.
 * (TaskLog tem cascade a partir de Task.) As tarefas são filtradas pela relação dentro da
 * transação, então um projeto criado no meio do caminho não fica de fora nem quebra a FK.
 */
export async function deleteGoal(input: { id: string }) {
  const user = await requireUser();
  const goal = await prisma.goal.findFirst({
    where: { id: input.id, userId: user.id },
    select: { id: true },
  });
  if (!goal) throw new DomainError("NOT_FOUND", NOT_FOUND);

  const [{ count: deletedTasks }, { count: deletedProjects }] = await prisma.$transaction([
    prisma.task.deleteMany({ where: { project: { goalId: goal.id } } }),
    prisma.project.deleteMany({ where: { goalId: goal.id } }),
    prisma.goal.delete({ where: { id: goal.id } }),
  ]);

  return { id: goal.id, deletedProjects, deletedTasks };
}
