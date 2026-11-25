"use server";

// Server Actions de hábitos (ver app/actions/goals.ts para o padrão).
// O toggle não recebe data: o servidor marca sempre o "hoje" do usuário.

import * as habits from "@/lib/dal/habits";
import { runAction } from "@/lib/run-action";
import { createHabitSchema, habitIdSchema } from "@/lib/validation";

export async function createHabitAction(input: unknown) {
  return runAction(createHabitSchema, input, habits.createHabit);
}

export async function toggleHabitAction(input: unknown) {
  return runAction(habitIdSchema, input, habits.toggleHabitToday);
}
