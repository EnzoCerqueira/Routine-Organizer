"use server";

// Server Actions de metas: camada fina (validação + sessão em runAction, regra em lib/dal).
// Os argumentos são `unknown` de propósito: chegam do cliente e só valem depois do zod.

import * as goals from "@/lib/dal/goals";
import { runAction } from "@/lib/run-action";
import { createGoalSchema, goalIdSchema, renameGoalSchema } from "@/lib/validation";

export async function createGoalAction(input: unknown) {
  return runAction(createGoalSchema, input, goals.createGoal);
}

export async function renameGoalAction(input: unknown) {
  return runAction(renameGoalSchema, input, goals.renameGoal);
}

export async function deleteGoalAction(input: unknown) {
  return runAction(goalIdSchema, input, goals.deleteGoal);
}
