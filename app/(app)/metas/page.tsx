import { Suspense } from "react";
import { GoalsBoard } from "@/components/goals-manager";
import { getGoals } from "@/lib/dal/goals";
import { getProjects } from "@/lib/dal/projects";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Metas e projetos</h1>
        <p className="text-sm text-zinc-500">
          Organize seus objetivos: cada meta se divide em projetos, e cada projeto reúne as tarefas.
        </p>
      </div>
      <Suspense fallback={<BoardSkeleton />}>
        <GoalsSection />
      </Suspense>
    </div>
  );
}

async function GoalsSection() {
  const [goals, projects] = await Promise.all([getGoals(), getProjects()]);
  return <GoalsBoard goals={goals} projects={projects} />;
}

function BoardSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-28 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      {[0, 1].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ))}
    </div>
  );
}
