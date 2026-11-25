"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FolderOpen,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { createGoalAction, deleteGoalAction, renameGoalAction } from "@/app/actions/goals";
import { createProjectAction, deleteProjectAction, renameProjectAction } from "@/app/actions/projects";
import type { GoalWithCountDto } from "@/lib/dal/goals";
import type { ProjectWithGoalDto } from "@/lib/dal/projects";
import type { ActionResult } from "@/lib/errors";
import { plural } from "@/lib/format";
import { ActionError } from "./action-error";

// Hierarquia na própria tela: cada Meta é um card que CONTÉM os seus Projetos, e o projeto
// é criado de dentro da meta (não há "escolha a meta" solta). Sem useOptimistic: criar,
// renomear e excluir dependem de ids e contagens do servidor; o refresh() traz a lista nova.

const input =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700";

export function GoalsBoard({
  goals,
  projects,
}: {
  goals: GoalWithCountDto[];
  projects: ProjectWithGoalDto[];
}) {
  return (
    <div className="space-y-6">
      <HowItWorks />
      <NewGoalForm isFirst={goals.length === 0} />
      {goals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nenhuma meta ainda. Comece pelo objetivo maior que você quer alcançar.
        </p>
      ) : (
        <ul className="space-y-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              projects={projects.filter((p) => p.goal.id === goal.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ==========================================
// EXPLICAÇÃO DA HIERARQUIA
// ==========================================

function HowItWorks() {
  const steps = [
    {
      icon: Target,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300",
      title: "Meta",
      text: "O objetivo maior, o “porquê”. Ex.: Conseguir vaga de Fullstack.",
    },
    {
      icon: FolderOpen,
      color: "text-sky-600 bg-sky-50 dark:bg-sky-950 dark:text-sky-300",
      title: "Projeto",
      text: "Uma frente de trabalho dentro da meta. Ex.: Avançar no BugTrack.",
    },
    {
      icon: ListChecks,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300",
      title: "Tarefas",
      text: "O que você executa no dia a dia. Cada tarefa pertence a um projeto.",
    },
  ];

  return (
    <section aria-label="Como metas, projetos e tarefas se conectam" className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
      {steps.map(({ icon: Icon, color, title, text }, i) => (
        <div key={title} className="contents">
          {i > 0 && (
            <ArrowRight className="hidden size-4 self-center text-zinc-300 sm:block dark:text-zinc-600" aria-hidden />
          )}
          <div className="flex gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-zinc-500">{text}</p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

// ==========================================
// META
// ==========================================

function NewGoalForm({ isFirst }: { isFirst: boolean }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createGoalAction({ title, description: description || undefined });
      if (!result.ok) return setError(result.error);
      setTitle("");
      setDescription("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm font-medium">{isFirst ? "Crie sua primeira meta" : "Nova meta"}</p>
      <div className="flex gap-2">
        <input
          className={input}
          placeholder="Qual objetivo você quer alcançar?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Título da meta"
        />
        <SubmitButton pending={isPending} disabled={!title.trim()} label="Criar meta" />
      </div>
      <input
        className={input}
        placeholder="Por que isso importa? (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="Descrição da meta"
      />
      <ActionError message={error} onClose={() => setError(null)} />
    </form>
  );
}

function GoalCard({ goal, projects }: { goal: GoalWithCountDto; projects: ProjectWithGoalDto[] }) {
  const taskCount = projects.reduce((sum, p) => sum + p.taskCount, 0);

  return (
    <li className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      {/* Cabeçalho da meta: o nível de cima */}
      <div className="flex gap-3 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <Target className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wide text-indigo-600 uppercase dark:text-indigo-400">Meta</p>
          <EditableTitle
            title={goal.title}
            titleClass="text-base font-semibold"
            onRename={(title) => renameGoalAction({ id: goal.id, title })}
            onDelete={() => deleteGoalAction({ id: goal.id })}
            deleteMessage={
              goal.projectCount > 0
                ? `Excluir a meta "${goal.title}"? ${plural(goal.projectCount, "projeto")} e ${plural(taskCount, "tarefa")} dentro dela também serão excluídos (incluindo o histórico).`
                : `Excluir a meta "${goal.title}"?`
            }
          />
          {goal.description && <p className="mt-0.5 text-sm text-zinc-500">{goal.description}</p>}
          <p className="mt-1 text-xs text-zinc-500">
            {plural(goal.projectCount, "projeto")} · {plural(taskCount, "tarefa")}
          </p>
        </div>
      </div>

      {/* Projetos: o nível de dentro, recuados sob a meta */}
      <div className="space-y-2 p-4 pl-6 sm:pl-16">
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Esta meta ainda não tem projetos. Adicione o primeiro: é dentro dele que as tarefas ficam.
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        )}
        <NewProjectForm goalId={goal.id} goalTitle={goal.title} />
      </div>
    </li>
  );
}

// ==========================================
// PROJETO
// ==========================================

function ProjectRow({ project }: { project: ProjectWithGoalDto }) {
  return (
    <li className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300">
        <FolderOpen className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <EditableTitle
          title={project.title}
          titleClass="text-sm font-medium"
          onRename={(title) => renameProjectAction({ id: project.id, title })}
          onDelete={() => deleteProjectAction({ id: project.id })}
          deleteMessage={
            project.taskCount > 0
              ? `Excluir o projeto "${project.title}"? ${plural(project.taskCount, "tarefa")} também serão excluídas (incluindo o histórico).`
              : `Excluir o projeto "${project.title}"?`
          }
        />
        <p className="text-xs text-zinc-500">
          {project.taskCount === 0 ? (
            <>
              Nenhuma tarefa ainda ·{" "}
              <Link href="/" className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100">
                criar em Tarefas
              </Link>
            </>
          ) : (
            plural(project.taskCount, "tarefa")
          )}
        </p>
      </div>
    </li>
  );
}

function NewProjectForm({ goalId, goalTitle }: { goalId: string; goalTitle: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950"
      >
        <Plus className="size-4" />
        Adicionar projeto nesta meta
      </button>
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      // A meta vem do card onde o formulário está: não há como criar projeto "solto"
      const result = await createProjectAction({ title, goalId });
      if (!result.ok) return setError(result.error);
      setTitle("");
      setOpen(false);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          className={input}
          placeholder={`Novo projeto em “${goalTitle}”`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          aria-label={`Título do novo projeto na meta ${goalTitle}`}
          autoFocus
        />
        <SubmitButton pending={isPending} disabled={!title.trim()} label="Adicionar" />
        <IconButton label="Cancelar" onClick={() => setOpen(false)}>
          <X className="size-4" />
        </IconButton>
      </div>
      <ActionError message={error} onClose={() => setError(null)} />
    </form>
  );
}

// ==========================================
// PEÇAS COMPARTILHADAS
// ==========================================

/** Título com renomear inline e excluir (com confirmação). */
function EditableTitle({
  title,
  titleClass,
  onRename,
  onDelete,
  deleteMessage,
}: {
  title: string;
  titleClass: string;
  onRename: (title: string) => Promise<ActionResult<unknown>>;
  onDelete: () => Promise<ActionResult<unknown>>;
  deleteMessage: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(call: () => Promise<ActionResult<unknown>>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await call();
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  }

  function handleRename(event: FormEvent) {
    event.preventDefault();
    if (draft.trim() === title) return setEditing(false);
    run(() => onRename(draft), () => setEditing(false));
  }

  return (
    <div className={isPending ? "opacity-60" : ""}>
      {editing ? (
        <form onSubmit={handleRename} className="flex gap-2 py-0.5">
          <input
            className={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            aria-label="Novo título"
            autoFocus
          />
          <IconButton label="Salvar" disabled={isPending || !draft.trim()} type="submit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </IconButton>
          <IconButton label="Cancelar" onClick={() => setEditing(false)}>
            <X className="size-4" />
          </IconButton>
        </form>
      ) : (
        <div className="flex items-center gap-1">
          <p className={`min-w-0 flex-1 truncate ${titleClass}`}>{title}</p>
          <IconButton
            label="Renomear"
            disabled={isPending}
            onClick={() => {
              setDraft(title);
              setEditing(true);
            }}
          >
            <Pencil className="size-4" />
          </IconButton>
          <IconButton
            label="Excluir"
            danger
            disabled={isPending}
            onClick={() => window.confirm(deleteMessage) && run(onDelete)}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      )}
      <ActionError message={error} onClose={() => setError(null)} />
    </div>
  );
}

function SubmitButton({ pending, disabled, label }: { pending: boolean; disabled: boolean; label: string }) {
  return (
    <button
      disabled={pending || disabled}
      className="flex shrink-0 items-center gap-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      {label}
    </button>
  );
}

function IconButton({
  label,
  danger = false,
  type = "button",
  ...props
}: {
  label: string;
  danger?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`shrink-0 rounded-lg p-1.5 text-zinc-400 disabled:opacity-40 ${
        danger
          ? "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
          : "hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      }`}
      {...props}
    />
  );
}
