"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Pause, Play, RotateCcw, Save, X } from "lucide-react";
import { addPomodoroAction } from "@/app/actions/tasks";
import type { TaskDto } from "@/lib/dal/tasks";
import { ActionError } from "./action-error";

const POMODORO_MINUTES = 25;
const POMODORO_MS = POMODORO_MINUTES * 60 * 1000;

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Timer de foco (só no cliente). Ao registrar, soma os minutos no TaskLog de hoje. */
export function PomodoroDialog({ task, onClose }: { task: TaskDto; onClose: () => void }) {
  const [remainingMs, setRemainingMs] = useState(POMODORO_MS);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  // Momento em que o ciclo termina. Calcular a partir dele (e não decrementar a cada tick)
  // evita que o timer atrase quando a aba fica em segundo plano.
  const endAtRef = useRef<number | null>(null);

  const isFinished = remainingMs <= 0;
  // Minutos inteiros de foco já cumpridos (o servidor exige inteiro > 0)
  const elapsedMinutes = Math.floor((POMODORO_MS - remainingMs) / 60_000);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, (endAtRef.current ?? Date.now()) - Date.now());
      setRemainingMs(remaining);
      if (remaining === 0) setIsRunning(false);
    }, 250);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Contagem na aba do navegador enquanto o diálogo está aberto
  useEffect(() => {
    const originalTitle = document.title;
    document.title = isFinished ? "✅ Pomodoro concluído!" : `${formatTime(remainingMs)} · ${task.title}`;
    return () => {
      document.title = originalTitle;
    };
  }, [remainingMs, isFinished, task.title]);

  // Esc fecha
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  function handleStartPause() {
    if (isRunning) {
      setIsRunning(false);
      return;
    }
    endAtRef.current = Date.now() + remainingMs;
    setIsRunning(true);
  }

  function handleReset() {
    setIsRunning(false);
    setRemainingMs(POMODORO_MS);
  }

  function handleRegister(minutes: number) {
    setIsRunning(false);
    setError(null);
    startTransition(async () => {
      const result = await addPomodoroAction({ id: task.id, minutes });
      if (!result.ok) {
        setError(result.error); // ex.: virou a meia-noite e a tarefa não é mais de hoje
        return;
      }
      onClose();
    });
  }

  // Anel de progresso
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = 1 - remainingMs / POMODORO_MS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !isSaving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pomodoro-title"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-sm space-y-5 rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-zinc-900"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          aria-label="Fechar"
          className="absolute top-3 right-3 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="size-5" />
        </button>

        <div>
          <p className="text-xs text-zinc-500">{task.project.title}</p>
          <h2 id="pomodoro-title" className="font-medium">
            {task.title}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">{task.pomodoroMinutes} min de foco hoje</p>
        </div>

        <div className="relative mx-auto size-52">
          <svg viewBox="0 0 200 200" className="size-full -rotate-90">
            <circle cx="100" cy="100" r={radius} fill="none" strokeWidth="8" className="stroke-zinc-200 dark:stroke-zinc-800" />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className={`transition-[stroke-dashoffset] duration-300 ${isFinished ? "stroke-emerald-500" : "stroke-indigo-500"}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-4xl tabular-nums">{formatTime(remainingMs)}</span>
            <span className="text-xs text-zinc-500">
              {isFinished ? "Concluído!" : isRunning ? "Foco" : "Pausado"}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={handleStartPause}
            disabled={isFinished || isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
            {isRunning ? "Pausar" : remainingMs < POMODORO_MS ? "Continuar" : "Iniciar"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={remainingMs === POMODORO_MS || isSaving}
            aria-label="Reiniciar"
            title="Reiniciar"
            className="rounded-lg border border-zinc-300 p-2 disabled:opacity-40 dark:border-zinc-700"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        {/* Ciclo completo libera os 25 min; antes disso dá para registrar o tempo já cumprido */}
        {isFinished ? (
          <button
            type="button"
            onClick={() => handleRegister(POMODORO_MINUTES)}
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Registrar {POMODORO_MINUTES} min
          </button>
        ) : (
          elapsedMinutes > 0 && (
            <button
              type="button"
              onClick={() => handleRegister(elapsedMinutes)}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Registrar {elapsedMinutes} min cumpridos
            </button>
          )
        )}

        <ActionError message={error} />
      </div>
    </div>
  );
}
