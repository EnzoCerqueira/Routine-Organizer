"use server";

// Server Actions de projetos (ver app/actions/goals.ts para o padrão).

import * as projects from "@/lib/dal/projects";
import { runAction } from "@/lib/run-action";
import { createProjectSchema, projectIdSchema, renameProjectSchema } from "@/lib/validation";

export async function createProjectAction(input: unknown) {
  return runAction(createProjectSchema, input, projects.createProject);
}

export async function renameProjectAction(input: unknown) {
  return runAction(renameProjectSchema, input, projects.renameProject);
}

export async function deleteProjectAction(input: unknown) {
  return runAction(projectIdSchema, input, projects.deleteProject);
}
