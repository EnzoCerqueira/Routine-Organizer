"use server";

// Server Actions de tarefas (ver app/actions/goals.ts para o padrão).
// Toggle, pomodoro e exclusão só valem para tarefas de hoje (regra em lib/dal/tasks.ts).

import * as tasks from "@/lib/dal/tasks";
import { runAction } from "@/lib/run-action";
import { createTaskSchema, pomodoroSchema, taskIdSchema } from "@/lib/validation";

export async function createTaskAction(input: unknown) {
  return runAction(createTaskSchema, input, tasks.createTask);
}

export async function toggleTaskAction(input: unknown) {
  return runAction(taskIdSchema, input, tasks.toggleTask);
}

export async function addPomodoroAction(input: unknown) {
  return runAction(pomodoroSchema, input, tasks.addPomodoro);
}

export async function endRoutineAction(input: unknown) {
  return runAction(taskIdSchema, input, tasks.endRoutine);
}

export async function deleteTaskAction(input: unknown) {
  return runAction(taskIdSchema, input, tasks.deleteTask);
}
