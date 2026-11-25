import { z } from "zod";

// Schemas das entradas vindas do cliente (Server Actions e searchParams).
// O dono dos dados NUNCA vem daqui: sempre da sessão (lib/dal/user.ts).

const id = (label: string) => z.uuid(`${label} inválido`);
const title = z.string().trim().min(1, "Informe um título").max(200, "Título muito longo");

export const dateSchema = z.iso.date({ error: "Data deve estar no formato YYYY-MM-DD" });
export const dayOfWeekSchema = z.coerce
  .number({ error: "Dia da semana inválido" })
  .int("Dia da semana inválido")
  .min(0, "Dia da semana deve ser de 0 a 6")
  .max(6, "Dia da semana deve ser de 0 a 6");

// ---------- Goal ----------

export const createGoalSchema = z.object({
  title,
  description: z.string().trim().max(1000, "Descrição muito longa").optional(),
});

export const renameGoalSchema = z.object({ id: id("Meta"), title });

export const goalIdSchema = z.object({ id: id("Meta") });

// ---------- Project ----------

export const createProjectSchema = z.object({ title, goalId: id("Meta") });

export const renameProjectSchema = z.object({ id: id("Projeto"), title });

export const projectIdSchema = z.object({ id: id("Projeto") });

// ---------- Task ----------

export const createTaskSchema = z
  .object({
    title,
    projectId: id("Projeto"),
    // Tarefa avulsa
    date: dateSchema.optional(),
    // Rotina semanal: 0 = Domingo ... 6 = Sábado
    dayOfWeek: dayOfWeekSchema.optional(),
  })
  .refine((input) => (input.date === undefined) !== (input.dayOfWeek === undefined), {
    message: "Informe a data OU o dia da semana (exatamente um dos dois)",
  });

export const taskIdSchema = z.object({ id: id("Tarefa") });

export const pomodoroSchema = z.object({
  id: id("Tarefa"),
  minutes: z
    .number({ error: "Minutos deve ser um número" })
    .int("Minutos deve ser um número inteiro")
    .positive("Minutos deve ser maior que zero")
    .max(24 * 60, "Minutos acima do limite de um dia"),
  completed: z.boolean({ error: "completed deve ser booleano" }).optional(),
});

// ---------- Habit ----------

export const createHabitSchema = z.object({ title });

export const habitIdSchema = z.object({ id: id("Hábito") });

// ---------- searchParams ----------

/** ?date=YYYY-MM-DD da URL; valor ausente ou inválido = undefined (a página usa "hoje"). */
export function parseDateParam(value: string | string[] | undefined): string | undefined {
  const parsed = dateSchema.safeParse(Array.isArray(value) ? value[0] : value);
  return parsed.success ? parsed.data : undefined;
}

/** ?dayOfWeek=0..6 da URL; valor ausente ou inválido = undefined. */
export function parseDayOfWeekParam(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === "") return undefined;
  const parsed = dayOfWeekSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}
