import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, weekdayOf } from "@/lib/dates";
import { WEEKDAY_SHORT, formatLongDate, weekOf } from "@/lib/format";

// Sem estado: cada dia é um <Link> para ?date=. Hoje usa "/" (URL limpa).
function hrefFor(date: string, today: string) {
  return date === today ? "/" : `/?date=${date}`;
}

export function DayNavigator({ date, today }: { date: string; today: string }) {
  const status = date === today ? "Hoje" : date < today ? "Passado" : "Futuro";
  const statusClass =
    date === today
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : date < today
        ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300";

  const arrow =
    "rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <Link href={hrefFor(addDays(date, -1), today)} className={arrow} aria-label="Dia anterior">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1 text-center">
          <p className="font-medium">{formatLongDate(date)}</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${statusClass}`}>
            {status}
          </span>
        </div>
        <Link href={hrefFor(addDays(date, 1), today)} className={arrow} aria-label="Próximo dia">
          <ChevronRight className="size-5" />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekOf(date).map((day) => {
          const selected = day === date;
          return (
            <Link
              key={day}
              href={hrefFor(day, today)}
              aria-current={selected ? "date" : undefined}
              className={`flex flex-col items-center rounded-lg py-1.5 text-xs ${
                selected
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="opacity-70">{WEEKDAY_SHORT[weekdayOf(day)]}</span>
              <span className={`font-medium ${day === today && !selected ? "text-emerald-600" : ""}`}>
                {Number(day.slice(8))}
              </span>
            </Link>
          );
        })}
      </div>

      {date !== today && (
        <Link href="/" className="block text-center text-xs text-zinc-500 underline-offset-2 hover:underline">
          Voltar para hoje
        </Link>
      )}
    </section>
  );
}
