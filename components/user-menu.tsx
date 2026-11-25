import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/dal/user";

/** Server Component: lê a sessão (fica dentro de <Suspense> no layout). */
export async function UserMenu() {
  const user = await requireUser();
  const label = user.name ?? user.email ?? "Usuário";

  return (
    <div className="flex items-center gap-3">
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto do Google, sem otimização
        <img src={user.image} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
      ) : (
        <div className="flex size-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium dark:bg-zinc-700">
          {label.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-zinc-500">{user.timeZone}</p>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          title="Sair"
          aria-label="Sair"
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="size-8 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-3 flex-1 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
