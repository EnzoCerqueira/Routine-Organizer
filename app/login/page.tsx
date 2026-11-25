import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth, signIn } from "@/auth";

// O card e o botão ficam no static shell; só a checagem de sessão e o ?error= da URL
// (ambos dependem da requisição) ficam dentro do <Suspense>.
export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-5 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Routine Organizer</h1>
          <p className="text-sm text-zinc-500">
            Metas, projetos, tarefas do dia e hábitos em um só lugar.
          </p>
        </div>

        <Suspense fallback={null}>
          <SessionGate searchParams={props.searchParams} />
        </Suspense>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
            Entrar com Google
          </button>
        </form>
      </div>
    </main>
  );
}

// Códigos que o Auth.js manda em ?error= (pages.error = "/login" em auth.ts)
const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Acesso negado. Use uma conta Google com e-mail verificado.",
  OAuthAccountNotLinked: "Este e-mail já está vinculado a outra forma de login.",
  Configuration: "Erro de configuração do login. Tente novamente mais tarde.",
};

/** Já logado -> vai para o dashboard. Senão, mostra o erro do último login (se houver). */
async function SessionGate({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  await connection(); // auth() usa crypto.getRandomValues() antes de ler cookies (ver lib/dal/user.ts)
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;
  if (!error) return null;
  const code = Array.isArray(error) ? error[0] : error;

  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {ERROR_MESSAGES[code] ?? "Não foi possível entrar. Tente novamente."}
    </p>
  );
}
