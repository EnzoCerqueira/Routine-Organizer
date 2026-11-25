import { Suspense } from "react";
import { HabitList } from "@/components/habit-list";
import { getHabits } from "@/lib/dal/habits";
import { requireUser } from "@/lib/dal/user";
import { formatLongDate } from "@/lib/format";

export default function HabitsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Hábitos</h1>
      <Suspense fallback={<HabitsSkeleton />}>
        <HabitsSection />
      </Suspense>
    </div>
  );
}

async function HabitsSection() {
  const [user, habits] = await Promise.all([requireUser(), getHabits()]);
  return (
    <>
      <p className="-mt-4 text-sm text-zinc-500">Hoje: {formatLongDate(user.today)}</p>
      <HabitList habits={habits} />
    </>
  );
}

function HabitsSkeleton() {
  return (
    <div className="space-y-2" aria-busy>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ))}
    </div>
  );
}
