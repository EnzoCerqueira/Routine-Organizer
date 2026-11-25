import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import { isPrismaError } from "./prisma-errors";
import { requireUser } from "./user";

const NOT_FOUND = "Hábito não encontrado";

export type HabitDto = { id: string; title: string; currentStreak: number; doneToday: boolean };

/**
 * Ofensiva atual de um hábito.
 * Se foi feito hoje ou ontem, conta os dias consecutivos retrocedendo a partir dali;
 * ao primeiro dia faltante, para. (Ontem conta para a ofensiva não "zerar" antes de
 * o usuário marcar o dia de hoje.)
 */
export function calculateCurrentStreak(logDates: string[], today: string): number {
  const done = new Set(logDates);

  let cursor: string;
  if (done.has(today)) cursor = today;
  else if (done.has(addDays(today, -1))) cursor = addDays(today, -1);
  else return 0;

  let streak = 0;
  while (done.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Hábitos do usuário com a ofensiva e o estado de hoje (no fuso dele, calculado no servidor). */
export async function getHabits(): Promise<HabitDto[]> {
  const user = await requireUser();
  const habits = await prisma.habit.findMany({
    where: { userId: user.id },
    select: { id: true, title: true, logs: { select: { date: true } } },
    orderBy: { createdAt: "asc" },
  });

  return habits.map((habit) => {
    const dates = habit.logs.map((log) => log.date);
    return {
      id: habit.id,
      title: habit.title,
      currentStreak: calculateCurrentStreak(dates, user.today),
      doneToday: dates.includes(user.today),
    };
  });
}

export async function createHabit(input: { title: string }): Promise<HabitDto> {
  const user = await requireUser();
  const habit = await prisma.habit.create({
    data: { title: input.title, userId: user.id },
    select: { id: true, title: true },
  });
  return { ...habit, currentStreak: 0, doneToday: false };
}

/**
 * Marca/desmarca o hábito HOJE. A data vem do servidor (fuso do usuário), nunca do cliente:
 * não dá para marcar dias passados ou futuros (mesma regra das tarefas).
 */
export async function toggleHabitToday(input: { id: string }) {
  const user = await requireUser();

  // Só o dono pode marcar/desmarcar ("não encontrado" também para hábito de outro usuário)
  const habit = await prisma.habit.findFirst({
    where: { id: input.id, userId: user.id },
    select: { id: true },
  });
  if (!habit) throw new DomainError("NOT_FOUND", NOT_FOUND);

  const date = user.today;

  // Já marcado -> desmarca (deleteMany não falha se outra requisição apagou antes)
  const { count } = await prisma.habitLog.deleteMany({ where: { habitId: habit.id, date } });
  if (count > 0) return { habitId: habit.id, date, completed: false };

  // Não marcado -> marca
  try {
    await prisma.habitLog.create({ data: { habitId: habit.id, date } });
  } catch (err) {
    if (isPrismaError(err, "P2003")) throw new DomainError("NOT_FOUND", NOT_FOUND);
    // Outra requisição marcou o mesmo dia ao mesmo tempo
    if (isPrismaError(err, "P2002")) {
      throw new DomainError("CONFLICT", "O hábito foi alterado ao mesmo tempo; tente novamente");
    }
    throw err;
  }
  return { habitId: habit.id, date, completed: true };
}
