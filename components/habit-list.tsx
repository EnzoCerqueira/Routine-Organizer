"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { CheckCircle2, Circle, Flame, Loader2, Plus } from "lucide-react";
import { createHabitAction, toggleHabitAction } from "@/app/actions/habits";
import type { HabitDto } from "@/lib/dal/habits";
import { plural } from "@/lib/format";
import { ActionError } from "./action-error";

/**
 * Toggle otimista: inverte doneToday e ajusta a ofensiva em ±1 na hora. Pela regra de
 * calculateCurrentStreak (conta a partir de hoje ou de ontem) o ±1 bate com o servidor;
 * de qualquer forma o valor oficial chega no refresh() da action, que substitui a prop.
 */
function toggleReducer(habits: HabitDto[], id: string): HabitDto[] {
  return habits.map((h) =>
    h.id === id
      ? {
          ...h,
          doneToday: !h.doneToday,
          currentStreak: Math.max(0, h.currentStreak + (h.doneToday ? -1 : 1)),
        }
      : h,
  );
}

export function HabitList({ habits }: { habits: HabitDto[] }) {
  const [optimisticHabits, toggleOptimistic] = useOptimistic(habits, toggleReducer);
  const [, startToggle] = useTransition();
  const [isCreating, startCreate] = useTransition();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const doneCount = optimisticHabits.filter((h) => h.doneToday).length;

  function handleToggle(id: string) {
    setError(null);
    startToggle(async () => {
      toggleOptimistic(id);
      // Sem data: o servidor marca o "hoje" do usuário
      const result = await toggleHabitAction({ id });
      if (!result.ok) setError(result.error);
    });
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startCreate(async () => {
      const result = await createHabitAction({ title });
      if (result.ok) setTitle("");
      else setError(result.error);
    });
  }

  return (
    <section className="space-y-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
          placeholder="Novo hábito (ex.: Ler 20 páginas)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Título do hábito"
        />
        <button
          disabled={isCreating || !title.trim()}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Criar
        </button>
      </form>

      <ActionError message={error} onClose={() => setError(null)} />

      {optimisticHabits.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nenhum hábito ainda. Crie o primeiro acima.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            {doneCount} de {optimisticHabits.length} feitos hoje
          </p>
          <ul className="space-y-2">
            {optimisticHabits.map((habit) => (
              <li
                key={habit.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  habit.doneToday
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(habit.id)}
                  aria-pressed={habit.doneToday}
                  aria-label={habit.doneToday ? "Desmarcar hoje" : "Marcar como feito hoje"}
                  title={habit.doneToday ? "Desmarcar hoje" : "Marcar como feito hoje"}
                  className="shrink-0"
                >
                  {habit.doneToday ? (
                    <CheckCircle2 className="size-6 text-emerald-600" />
                  ) : (
                    <Circle className="size-6 text-zinc-400" />
                  )}
                </button>
                <p className="min-w-0 flex-1 truncate text-sm">{habit.title}</p>
                <span
                  className={`flex shrink-0 items-center gap-1 text-sm ${
                    habit.currentStreak > 0 ? "text-orange-600" : "text-zinc-400"
                  }`}
                  title="Ofensiva atual"
                >
                  <Flame className="size-4" />
                  {plural(habit.currentStreak, "dia")}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
