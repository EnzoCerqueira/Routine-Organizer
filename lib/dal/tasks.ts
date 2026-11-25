import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { fromDbDate, localDateOf, toDbDate, weekdayOf } from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import { isPrismaError } from "./prisma-errors";
import { requireUser, type CurrentUser } from "./user";

// ==========================================
// TIPOS E SELECTS
// ==========================================

const taskSelect = {
  id: true,
  title: true,
  date: true,
  dayOfWeek: true,
  endedAt: true,
  createdAt: true,
  projectId: true,
  project: { select: { id: true, title: true } },
} satisfies Prisma.TaskSelect;

const logSelect = { completed: true, pomodoroMinutes: true } satisfies Prisma.TaskLogSelect;

type TaskRow = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;
type LogRow = Prisma.TaskLogGetPayload<{ select: typeof logSelect }>;

/** Formato único devolvido à tela (listagem e retorno de todas as mutações). */
export type TaskDto = {
  id: string;
  title: string;
  kind: "date" | "weekly";
  date: string | null;
  dayOfWeek: number | null;
  endedAt: string | null;
  projectId: string;
  project: { id: string; title: string };
  completed: boolean;
  pomodoroMinutes: number;
};

export type DayTasksDto = { date: string; today: string; tasks: TaskDto[] };
export type WeeklyRoutinesDto = { today: string; dayOfWeek: number; tasks: TaskDto[] };

const NOT_FOUND = "Tarefa não encontrada";
const NOT_TODAY = "Só é possível alterar tarefas do dia de hoje";
const CONFLICT = "A tarefa foi alterada ao mesmo tempo; tente novamente";

// ==========================================
// REGRAS
// ==========================================

// Só tarefas do usuário logado (Task -> Project -> Goal -> User)
function ownedBy(userId: string) {
  return { project: { goal: { userId } } } satisfies Prisma.TaskWhereInput;
}

/** A tarefa aparece neste dia? (strings YYYY-MM-DD comparam corretamente em ordem alfabética) */
function occursOn(task: TaskRow, day: string, timeZone: string): boolean {
  if (task.date) return fromDbDate(task.date) === day;

  if (task.dayOfWeek !== weekdayOf(day)) return false;
  // Sem passado fictício: a rotina não aparece em dias anteriores à criação (no fuso do usuário)
  if (localDateOf(task.createdAt, timeZone) > day) return false;
  // endedAt é inclusivo: a rotina ainda aparece no próprio dia do encerramento
  if (task.endedAt && fromDbDate(task.endedAt) < day) return false;
  return true;
}

function toTaskDto(task: TaskRow, log: LogRow | undefined): TaskDto {
  return {
    id: task.id,
    title: task.title,
    kind: task.date ? "date" : "weekly",
    date: task.date ? fromDbDate(task.date) : null,
    dayOfWeek: task.dayOfWeek,
    endedAt: task.endedAt ? fromDbDate(task.endedAt) : null,
    projectId: task.projectId,
    project: task.project,
    completed: log?.completed ?? false,
    pomodoroMinutes: log?.pomodoroMinutes ?? 0,
  };
}

// Pendentes primeiro (sort estável: mantém a ordem de criação dentro de cada grupo)
function sortTasks(tasks: TaskDto[]): TaskDto[] {
  return tasks.sort((a, b) => Number(a.completed) - Number(b.completed));
}

/** Barreira do "só hoje": a tarefa precisa ser do usuário e acontecer hoje (no fuso dele). */
async function loadTaskForToday(id: string, user: CurrentUser): Promise<TaskRow> {
  const task = await prisma.task.findFirst({
    where: { id, ...ownedBy(user.id) },
    select: taskSelect,
  });
  if (!task) throw new DomainError("NOT_FOUND", NOT_FOUND);
  if (!occursOn(task, user.today, user.timeZone)) throw new DomainError("FORBIDDEN", NOT_TODAY);
  return task;
}

// ==========================================
// LEITURAS
// ==========================================

/** Tarefas de um dia (sem data = hoje). Passado = histórico, futuro = planejamento. */
export async function getDayTasks(date?: string): Promise<DayTasksDto> {
  const user = await requireUser();
  const day = date ?? user.today;
  const dayDb = toDbDate(day);

  // Candidatas: avulsas do dia + rotinas daquele dia da semana não encerradas antes dele.
  // O filtro por createdAt (no fuso do usuário) é feito em occursOn.
  const candidates = await prisma.task.findMany({
    where: {
      ...ownedBy(user.id),
      OR: [
        { date: dayDb },
        { dayOfWeek: weekdayOf(day), OR: [{ endedAt: null }, { endedAt: { gte: dayDb } }] },
      ],
    },
    select: { ...taskSelect, logs: { where: { date: dayDb }, select: logSelect } },
    orderBy: { createdAt: "asc" },
  });

  const tasks = candidates
    .filter((task) => occursOn(task, day, user.timeZone))
    .map((task) => toTaskDto(task, task.logs[0]));

  return { date: day, today: user.today, tasks: sortTasks(tasks) };
}

/** Modelo da semana: rotinas ativas (hoje ou depois) naquele dia da semana, sem estado de conclusão. */
export async function getWeeklyRoutines(dayOfWeek: number): Promise<WeeklyRoutinesDto> {
  const user = await requireUser();
  const routines = await prisma.task.findMany({
    where: {
      ...ownedBy(user.id),
      dayOfWeek,
      OR: [{ endedAt: null }, { endedAt: { gte: toDbDate(user.today) } }],
    },
    select: taskSelect,
    orderBy: { createdAt: "asc" },
  });

  return { today: user.today, dayOfWeek, tasks: routines.map((task) => toTaskDto(task, undefined)) };
}

// ==========================================
// MUTAÇÕES
// ==========================================

export async function createTask(input: {
  title: string;
  projectId: string;
  date?: string;
  dayOfWeek?: number;
}): Promise<TaskDto> {
  const user = await requireUser();

  // Bloqueia criação no passado (comparação só de dia, no fuso do usuário)
  if (input.date !== undefined && input.date < user.today) {
    throw new DomainError("BAD_REQUEST", "Não é possível criar tarefas em dias que já passaram");
  }

  // O projeto precisa pertencer ao usuário logado
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, goal: { userId: user.id } },
    select: { id: true },
  });
  if (!project) throw new DomainError("NOT_FOUND", "Projeto não encontrado");

  try {
    const task = await prisma.task.create({
      data: {
        title: input.title,
        projectId: project.id,
        // O schema de validação garante que exatamente um dos dois veio
        ...(input.date !== undefined
          ? { date: toDbDate(input.date) }
          : { dayOfWeek: input.dayOfWeek ?? null }),
      },
      select: taskSelect,
    });
    return toTaskDto(task, undefined);
  } catch (err) {
    // Projeto apagado entre a checagem e o insert
    if (isPrismaError(err, "P2003")) throw new DomainError("NOT_FOUND", "Projeto não encontrado");
    throw err;
  }
}

/** Marca/desmarca a conclusão de hoje. */
export async function toggleTask(input: { id: string }): Promise<TaskDto> {
  const user = await requireUser();
  const task = await loadTaskForToday(input.id, user);
  const todayDb = toDbDate(user.today);

  const log = await prisma.taskLog.findUnique({
    where: { taskId_date: { taskId: task.id, date: todayDb } },
    select: { id: true, completed: true },
  });

  if (!log) {
    try {
      const created = await prisma.taskLog.create({
        data: { taskId: task.id, date: todayDb, completed: true },
        select: logSelect,
      });
      return toTaskDto(task, created);
    } catch (err) {
      // Outra requisição criou o registro de hoje ao mesmo tempo
      if (isPrismaError(err, "P2002")) throw new DomainError("CONFLICT", CONFLICT);
      throw err;
    }
  }

  // Compare-and-set: só inverte se o status ainda for o que lemos
  const { count } = await prisma.taskLog.updateMany({
    where: { id: log.id, completed: log.completed },
    data: { completed: !log.completed },
  });
  if (count === 0) throw new DomainError("CONFLICT", CONFLICT);

  const updated = await prisma.taskLog.findUniqueOrThrow({ where: { id: log.id }, select: logSelect });
  return toTaskDto(task, updated);
}

/** Soma minutos de pomodoro no registro de hoje (e opcionalmente define a conclusão). */
export async function addPomodoro(input: {
  id: string;
  minutes: number;
  completed?: boolean;
}): Promise<TaskDto> {
  const user = await requireUser();
  const task = await loadTaskForToday(input.id, user);
  const todayDb = toDbDate(user.today);
  const completed = input.completed !== undefined ? { completed: input.completed } : {};

  try {
    // Upsert: o incremento é feito pelo banco (sem read-modify-write)
    const log = await prisma.taskLog.upsert({
      where: { taskId_date: { taskId: task.id, date: todayDb } },
      create: { taskId: task.id, date: todayDb, pomodoroMinutes: input.minutes, ...completed },
      update: { pomodoroMinutes: { increment: input.minutes }, ...completed },
      select: logSelect,
    });
    return toTaskDto(task, log);
  } catch (err) {
    // Duas criações simultâneas do registro de hoje
    if (isPrismaError(err, "P2002")) throw new DomainError("CONFLICT", CONFLICT);
    throw err;
  }
}

/**
 * Encerra uma rotina: ela aparece até hoje (inclusive) e o histórico do TaskLog é mantido.
 * A data vem sempre do servidor, então não dá para "apagar" dias passados encerrando no passado.
 */
export async function endRoutine(input: { id: string }): Promise<TaskDto> {
  const user = await requireUser();
  const todayDb = toDbDate(user.today);

  const task = await prisma.task.findFirst({
    where: { id: input.id, ...ownedBy(user.id) },
    select: { id: true, dayOfWeek: true, endedAt: true },
  });
  if (!task) throw new DomainError("NOT_FOUND", NOT_FOUND);
  if (task.dayOfWeek === null) {
    throw new DomainError("BAD_REQUEST", "Só rotinas semanais podem ser encerradas");
  }
  if (task.endedAt) throw new DomainError("CONFLICT", "Esta rotina já foi encerrada");

  // endedAt: null no where: se outra requisição encerrou no meio, count = 0
  const { count } = await prisma.task.updateMany({
    where: { id: task.id, endedAt: null },
    data: { endedAt: todayDb },
  });
  if (count === 0) throw new DomainError("CONFLICT", "Esta rotina já foi encerrada");

  const updated = await prisma.task.findUniqueOrThrow({
    where: { id: task.id },
    select: { ...taskSelect, logs: { where: { date: todayDb }, select: logSelect } },
  });
  return toTaskDto(updated, updated.logs[0]);
}

/** Exclui uma tarefa avulsa de hoje. Rotinas são encerradas, não excluídas (perderiam o histórico). */
export async function deleteTask(input: { id: string }): Promise<{ id: string }> {
  const user = await requireUser();
  const task = await loadTaskForToday(input.id, user);
  if (task.dayOfWeek !== null) {
    throw new DomainError(
      "BAD_REQUEST",
      "Rotinas não são excluídas; encerre a rotina para manter o histórico",
    );
  }

  try {
    await prisma.task.delete({ where: { id: task.id } });
  } catch (err) {
    // Já excluída por outra requisição: o resultado final é o mesmo
    if (!isPrismaError(err, "P2025")) throw err;
  }
  return { id: task.id };
}
