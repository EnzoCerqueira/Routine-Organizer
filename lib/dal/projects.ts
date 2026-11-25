import "server-only";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors";
import { isPrismaError } from "./prisma-errors";
import { requireUser } from "./user";

const NOT_FOUND = "Projeto não encontrado";

export type ProjectDto = { id: string; title: string; goalId: string };
export type ProjectWithGoalDto = ProjectDto & {
  goal: { id: string; title: string };
  taskCount: number;
};

const projectSelect = { id: true, title: true, goalId: true } as const;

/** Projetos do usuário (Project -> Goal -> User), com o título da meta e a contagem de tarefas. */
export async function getProjects(): Promise<ProjectWithGoalDto[]> {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { goal: { userId: user.id } },
    select: {
      ...projectSelect,
      goal: { select: { id: true, title: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return projects.map(({ _count, ...project }) => ({ ...project, taskCount: _count.tasks }));
}

export async function createProject(input: { title: string; goalId: string }): Promise<ProjectDto> {
  const user = await requireUser();

  // A meta precisa pertencer ao usuário logado
  const goal = await prisma.goal.findFirst({
    where: { id: input.goalId, userId: user.id },
    select: { id: true },
  });
  if (!goal) throw new DomainError("NOT_FOUND", "Meta não encontrada");

  try {
    return await prisma.project.create({
      data: { title: input.title, goalId: goal.id },
      select: projectSelect,
    });
  } catch (err) {
    // Meta apagada entre a checagem e o insert
    if (isPrismaError(err, "P2003")) throw new DomainError("NOT_FOUND", "Meta não encontrada");
    throw err;
  }
}

export async function renameProject(input: { id: string; title: string }): Promise<ProjectDto> {
  const user = await requireUser();
  // Checagem de dono e update numa query só; count 0 = inexistente ou de outro usuário
  const { count } = await prisma.project.updateMany({
    where: { id: input.id, goal: { userId: user.id } },
    data: { title: input.title },
  });
  if (count === 0) throw new DomainError("NOT_FOUND", NOT_FOUND);

  return prisma.project.findUniqueOrThrow({ where: { id: input.id }, select: projectSelect });
}

/** Task.projectId é obrigatório e sem cascade: tarefas saem antes do projeto, tudo-ou-nada. */
export async function deleteProject(input: { id: string }) {
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id: input.id, goal: { userId: user.id } },
    select: { id: true },
  });
  if (!project) throw new DomainError("NOT_FOUND", NOT_FOUND);

  const [{ count: deletedTasks }] = await prisma.$transaction([
    prisma.task.deleteMany({ where: { projectId: project.id } }),
    prisma.project.delete({ where: { id: project.id } }),
  ]);

  return { id: project.id, deletedTasks };
}
