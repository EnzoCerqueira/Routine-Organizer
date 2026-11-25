import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserMenu, UserMenuSkeleton } from "@/components/user-menu";

// Casca das telas logadas. Sidebar (links fixos) é estática e entra no static shell;
// só o UserMenu lê a sessão, dentro do próprio <Suspense>. Nada de await de sessão no
// topo do layout: isso seguraria {children} inteiro atrás da requisição.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <Sidebar>
        <Suspense fallback={<UserMenuSkeleton />}>
          <UserMenu />
        </Suspense>
      </Sidebar>
      <main className="flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
