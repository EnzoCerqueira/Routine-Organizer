import { Suspense } from "react";
import { DayNavigator } from "@/components/day-navigator";
import { NewTaskForm } from "@/components/new-task-form";
import { TaskList } from "@/components/task-list";
import { getProjects } from "@/lib/dal/projects";
import { getDayTasks } from "@/lib/dal/tasks";
import { requireUser } from "@/lib/dal/user";
import { parseDateParam } from "@/lib/validation";

// Dashboard do dia (?date=YYYY-MM-DD; sem parâmetro = hoje no fuso do usuário).
// O título é estático (static shell). Tudo que lê sessão ou searchParams fica no <Suspense>:
// a promise de searchParams é repassada sem await e só resolvida dentro do DayView.
export default function DashboardPage(props: PageProps<"/">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tarefas</h1>
      <Suspense fallback={<DaySkeleton withNavigator />}>
        <DayView searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function DayView({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const [{ date: dateParam }, user] = await Promise.all([searchParams, requireUser()]);
  const date = parseDateParam(dateParam) ?? user.today;

  return (
    <>
      {/* O navegador troca de dia na hora... */}
      <DayNavigator date={date} today={user.today} />
      {/* ...e a lista mostra skeleton: um boundary novo (key muda) exibe o fallback mesmo
          durante a transição da navegação, em vez de segurar o dia anterior na tela. */}
      <Suspense key={date} fallback={<DaySkeleton />}>
        <DayContent date={date} />
      </Suspense>
    </>
  );
}

async function DayContent({ date }: { date: string }) {
  const [day, projects] = await Promise.all([getDayTasks(date), getProjects()]);

  return (
    <>
      {/* Data no passado: só leitura (o servidor também recusa criar no passado) */}
      {day.date >= day.today && (
        <NewTaskForm
          projects={projects.map(({ id, title, goal }) => ({
            id,
            title,
            goalId: goal.id,
            goalTitle: goal.title,
          }))}
          viewDate={day.date}
          today={day.today}
        />
      )}
      <TaskList date={day.date} today={day.today} tasks={day.tasks} />
    </>
  );
}

function DaySkeleton({ withNavigator = false }: { withNavigator?: boolean }) {
  return (
    <div className="space-y-4" aria-busy>
      {withNavigator && <div className="h-36 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />}
      <div className="h-28 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ))}
    </div>
  );
}
