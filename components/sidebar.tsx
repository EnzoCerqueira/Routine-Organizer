"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, ListChecks, Target } from "lucide-react";

const links = [
  { href: "/", label: "Tarefas", icon: ListChecks },
  { href: "/metas", label: "Metas e projetos", icon: Target },
  { href: "/habitos", label: "Hábitos", icon: Flame },
] as const;

/** Navegação lateral (topo no mobile). `children` = área do usuário (UserMenu, server). */
export function Sidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 flex-col gap-4 border-b border-zinc-200 p-4 md:w-60 md:border-r md:border-b-0 md:p-6 dark:border-zinc-800">
      <p className="text-base font-semibold">Routine Organizer</p>
      <nav className="flex gap-1 md:flex-col">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                active
                  ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="md:mt-auto">{children}</div>
    </aside>
  );
}
