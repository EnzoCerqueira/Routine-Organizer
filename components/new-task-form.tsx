"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { createTaskAction } from "@/app/actions/tasks";
import { weekdayOf } from "@/lib/dates";
import { WEEKDAY_LONG, WEEKDAY_ORDER, everyWeekdayLabel, formatShortDate } from "@/lib/format";
import { ActionError } from "./action-error";

type ProjectOption = { id: string; title: string; goalId: string; goalTitle: string };
type Mode = "date" | "weekly";

function groupByGoal(projects: ProjectOption[]) {
  const groups = new Map<string, { goalTitle: string; items: ProjectOption[] }>();
  for (const p of projects) {
    const group = groups.get(p.goalId) ?? { goalTitle: p.goalTitle, items: [] };
    group.items.push(p);
    groups.set(p.goalId, group);
  }
  return [...groups].map(([goalId, group]) => ({ goalId, ...group }));
}

// Fundo explícito (e não transparente) nos campos: os controles nativos herdam a cor do texto,
// e com fundo transparente a lista do <select> ficava texto claro sobre branco no tema escuro.
const input =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-zinc-400";

// Cores das opções da lista (Chrome/Edge no Windows respeitam o fundo de <option>/<optgroup>)
const option = "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100";

/**
 * Inputs controlados + useTransition (em vez de <form action>): o React 19 reseta formulários
 * não controlados ao fim da action, mesmo quando ela devolve erro, e o usuário perderia o texto.
 */
export function NewTaskForm({
  projects,
  viewDate,
  today,
}: {
  projects: ProjectOption[];
  viewDate: string;
  today: string;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("date");
  const [date, setDate] = useState(viewDate);
  const [dayOfWeek, setDayOfWeek] = useState(() => weekdayOf(viewDate));
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // O id escolhido precisa existir na lista ATUAL. Com Cache Components o Next preserva o
  // estado do componente entre navegações (<Activity>) e no refresh() das actions, então o
  // useState inicial não roda de novo: se o form montou sem projetos (projectId = ""), ou o
  // projeto escolhido foi excluído, cai no primeiro projeto disponível em vez de enviar lixo.
  const selectedProjectId = projects.some((p) => p.id === projectId)
    ? projectId
    : (projects[0]?.id ?? "");

  if (projects.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        Para criar tarefas, primeiro cadastre uma meta e um projeto em{" "}
        <Link href="/metas" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          Metas e projetos
        </Link>
        .
      </section>
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    // Manda date OU dayOfWeek; o zod do servidor valida de novo
    const projectId = selectedProjectId;
    const payload = mode === "date" ? { title, projectId, date } : { title, projectId, dayOfWeek };

    startTransition(async () => {
      const result = await createTaskAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      const task = result.data;
      // Avisa quando a tarefa não aparece no dia que está na tela
      if (task.kind === "date" && task.date !== viewDate) {
        setFeedback(`Tarefa criada para ${formatShortDate(task.date!)}.`);
      } else if (task.kind === "weekly" && task.dayOfWeek !== weekdayOf(viewDate)) {
        setFeedback(`Rotina criada: ${everyWeekdayLabel(task.dayOfWeek!).toLowerCase()}.`);
      }
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            className={input}
            placeholder="Nova tarefa (ex.: Resolver 3 problemas no LeetCode)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Título da tarefa"
            required
          />
          <button
            disabled={isPending || !title.trim()}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Adicionar
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
          <select
            className={input}
            value={selectedProjectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="Projeto"
          >
            {/* Projetos agrupados pela meta, igual à hierarquia de /metas */}
            {groupByGoal(projects).map(({ goalId, goalTitle, items }) => (
              <optgroup key={goalId} label={`Meta: ${goalTitle}`} className={option}>
                {items.map((p) => (
                  <option key={p.id} value={p.id} className={option}>
                    {p.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <div className="flex rounded-lg border border-zinc-300 p-0.5 text-sm dark:border-zinc-700" role="radiogroup">
            {(["date", "weekly"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 ${
                  mode === m
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                {m === "date" ? "Avulsa" : "Rotina semanal"}
              </button>
            ))}
          </div>

          {mode === "date" ? (
            <input
              type="date"
              className={input}
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Data"
              required
            />
          ) : (
            <select
              className={input}
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              aria-label="Dia da semana"
            >
              {WEEKDAY_ORDER.map((d) => (
                <option key={d} value={d} className={option}>
                  {WEEKDAY_LONG[d]}
                </option>
              ))}
            </select>
          )}
        </div>

        <ActionError message={error} onClose={() => setError(null)} />
        {feedback && <p className="text-sm text-emerald-700 dark:text-emerald-400">{feedback}</p>}
      </form>
    </section>
  );
}
