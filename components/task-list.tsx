"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Ban, CheckCircle2, Circle, CircleSlash, Timer, Trash2 } from "lucide-react";
import {
  deleteTaskAction,
  endRoutineAction,
  toggleTaskAction,
} from "@/app/actions/tasks";
import type { TaskDto } from "@/lib/dal/tasks";
import type { ActionResult } from "@/lib/errors";
import { everyWeekdayLabel, formatShortDate } from "@/lib/format";
import { ActionError } from "./action-error";
import { PomodoroDialog } from "./pomodoro-dialog";

type OptimisticAction = { type: "toggle"; id: string } | { type: "delete"; id: string };

// Pendentes primeiro (sort estável: mantém a ordem de criação dentro de cada grupo) — igual ao servidor
function sortTasks(tasks: TaskDto[]): TaskDto[] {
  return [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));
}

function reducer(tasks: TaskDto[], action: OptimisticAction): TaskDto[] {
  switch (action.type) {
    case "toggle":
      return sortTasks(tasks.map((t) => (t.id === action.id ? { ...t, completed: !t.completed } : t)));
    case "delete":
      return tasks.filter((t) => t.id !== action.id);
  }
}

/**
 * Lista do dia. `tasks` vem do servidor; a cada action, runAction chama refresh() e a resposta
 * traz a página re-renderizada com a prop nova. useOptimistic mostra o resultado esperado
 * enquanto a transição está pendente; se a action falhar, o valor otimista é descartado ao fim
 * da transição e a lista volta sozinha ao estado real.
 */
export function TaskList({ date, today, tasks }: { date: string; today: string; tasks: TaskDto[] }) {
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, reducer);
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pomodoroTaskId, setPomodoroTaskId] = useState<string | null>(null);

  const isToday = date === today;
  const isPast = date < today;
  const readOnly = !isToday; // toggle, pomodoro, excluir e encerrar só valem hoje (servidor também bloqueia)

  const completedCount = optimisticTasks.filter((t) => t.completed).length;
  const totalMinutes = optimisticTasks.reduce((sum, t) => sum + t.pomodoroMinutes, 0);
  const heading = isToday ? "Tarefas de hoje" : isPast ? "Histórico" : "Planejamento";
  // Busca na prop (não no otimista) para o diálogo ter sempre os minutos reais
  const pomodoroTask = tasks.find((t) => t.id === pomodoroTaskId) ?? null;

  function run(optimistic: OptimisticAction | null, id: string, call: () => Promise<ActionResult<unknown>>) {
    setError(null);
    startTransition(async () => {
      if (optimistic) applyOptimistic(optimistic);
      else setBusyId(id);
      const result = await call();
      setBusyId(null);
      if (!result.ok) setError(result.error);
    });
  }

  function handleDelete(task: TaskDto) {
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
    run({ type: "delete", id: task.id }, task.id, () => deleteTaskAction({ id: task.id }));
  }

  function handleEnd(task: TaskDto) {
    const ok = window.confirm(
      `Encerrar a rotina "${task.title}"? Ela aparece pela última vez hoje e o histórico é mantido.`,
    );
    if (!ok) return;
    // Sem otimista: o servidor define endedAt
    run(null, task.id, () => endRoutineAction({ id: task.id }));
  }

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="font-medium">{heading}</h2>
        <p className="text-sm text-zinc-500">
          {completedCount} de {optimisticTasks.length} concluídas · {totalMinutes} min de foco
        </p>
      </header>

      {readOnly && (
        <p className="text-sm text-zinc-500">
          Somente leitura: só é possível concluir ou alterar tarefas de hoje.
        </p>
      )}

      <ActionError message={error} onClose={() => setError(null)} />

      {optimisticTasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          {isToday ? "Nenhuma tarefa agendada para hoje." : "Nenhuma tarefa neste dia."}
        </p>
      ) : (
        <ul className="space-y-2">
          {optimisticTasks.map((task) => {
            const busy = busyId === task.id;
            const missed = isPast && !task.completed; // dia passado + não concluída = perdida
            return (
              <li
                key={task.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  task.completed
                    ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50"
                    : "border-zinc-200 dark:border-zinc-800"
                } ${busy ? "opacity-60" : ""}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    run({ type: "toggle", id: task.id }, task.id, () => toggleTaskAction({ id: task.id }))
                  }
                  disabled={readOnly || busy}
                  aria-pressed={task.completed}
                  aria-label={task.completed ? "Marcar como pendente" : "Marcar como concluída"}
                  title={readOnly ? "Somente leitura" : task.completed ? "Marcar como pendente" : "Marcar como concluída"}
                  className="shrink-0 disabled:cursor-not-allowed"
                >
                  {task.completed ? (
                    <CheckCircle2 className="size-6 text-emerald-600" />
                  ) : missed ? (
                    <CircleSlash className="size-6 text-red-400" />
                  ) : (
                    <Circle className="size-6 text-zinc-400" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${task.completed ? "text-zinc-500 line-through" : ""}`}>
                    {task.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-zinc-500">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">{task.project.title}</span>
                    {task.kind === "weekly" && task.dayOfWeek !== null && (
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                        {everyWeekdayLabel(task.dayOfWeek)}
                      </span>
                    )}
                    {task.endedAt && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {task.endedAt === date ? "Última vez" : `Encerrada em ${formatShortDate(task.endedAt)}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pomodoro só em tarefa pendente de hoje; nos outros casos só mostra os minutos */}
                {readOnly || task.completed ? (
                  <span className="shrink-0 text-xs text-zinc-500">{task.pomodoroMinutes} min</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPomodoroTaskId(task.id)}
                    disabled={busy}
                    title="Iniciar pomodoro"
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    <Timer className="size-4" />
                    {task.pomodoroMinutes} min
                  </button>
                )}

                {/* Avulsa: excluir. Rotina: encerrar (excluir apagaria o histórico). */}
                {task.kind === "date" ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(task)}
                    disabled={readOnly || busy}
                    aria-label="Excluir tarefa"
                    title={readOnly ? "Somente leitura" : "Excluir tarefa"}
                    className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-950"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleEnd(task)}
                    disabled={readOnly || busy || task.endedAt !== null}
                    aria-label="Encerrar rotina"
                    title={task.endedAt ? "Rotina já encerrada" : readOnly ? "Somente leitura" : "Encerrar rotina"}
                    className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-amber-50 hover:text-amber-700 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-amber-950"
                  >
                    <Ban className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pomodoroTask && (
        <PomodoroDialog
          key={pomodoroTask.id}
          task={pomodoroTask}
          onClose={() => setPomodoroTaskId(null)}
        />
      )}
    </section>
  );
}
