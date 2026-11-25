import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Lê automaticamente AUTH_SECRET, AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET do ambiente.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // "database": o cookie guarda só um token opaco; cada auth() consulta Session + User.
  // Assim o timezone está sempre atualizado e o logout revoga na hora.
  session: { strategy: "database" },
  // Login e erros (ex.: ?error=AccessDenied) caem na nossa página, não na padrão do Auth.js
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Google({
      // Os usuários do sistema antigo já existem (pelo e-mail) mas não têm Account.
      // Sem isso, o primeiro login deles falharia com OAuthAccountNotLinked.
      // É seguro com o Google porque ele verifica o e-mail.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    // allowDangerousEmailAccountLinking só é seguro com e-mail verificado: recusa o contrário
    signIn({ account, profile }) {
      if (account?.provider === "google") return profile?.email_verified === true;
      return true;
    },
    // Com strategy "database", `user` é a linha do banco
    session({ session, user }) {
      session.user.id = user.id;
      session.user.timezone = user.timezone;
      return session;
    },
  },
  events: {
    // Dispara quando uma conta OAuth é vinculada (usuário novo ou um User antigo achado pelo e-mail).
    // O adapter cria usuários novos já com nome/foto, mas ao vincular um User existente não
    // atualiza nada: aqui completamos o perfil.
    async linkAccount({ user, profile }) {
      if (!user.id) return;
      await fillMissingProfile(user.id, { name: profile.name, image: profile.image });
    },
    // Dispara em todo login. Cobre contas vinculadas antes do linkAccount acima existir
    // (o evento não se repete para elas). Só escreve se ainda faltar algum campo.
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !user.id || !profile) return;
      await fillMissingProfile(user.id, {
        name: typeof profile.name === "string" ? profile.name : null,
        image: typeof profile.picture === "string" ? profile.picture : null,
      });
    },
  },
});

/**
 * Preenche name, image e emailVerified apenas quando estão vazios (nunca sobrescreve um nome
 * que o usuário tenha definido). emailVerified = agora: o callback signIn já garantiu
 * email_verified do Google.
 */
async function fillMissingProfile(
  userId: string,
  data: { name?: string | null; image?: string | null },
) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, image: true, emailVerified: true },
  });
  if (!current) return;

  const patch: { name?: string; image?: string; emailVerified?: Date } = {};
  if (!current.name && data.name) patch.name = data.name;
  if (!current.image && data.image) patch.image = data.image;
  if (!current.emailVerified) patch.emailVerified = new Date();

  if (Object.keys(patch).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: patch });
  }
}
