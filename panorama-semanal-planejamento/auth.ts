import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createSupabaseAccessToken } from "@/lib/supabase/jwt";
import { syncUserToSupabase } from "@/lib/supabase/sync-user";
import { checkAllowlist } from "@/lib/supabase/check-allowlist";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Login com Google nao restringe por organizacao (decisao #9) — apenas
    // e-mails cadastrados em `allowed_emails` podem autenticar.
    async signIn({ user }) {
      if (!user.email) return false;

      const { allowed } = await checkAllowlist(user.email);
      return allowed;
    },
    async jwt({ token, account, user }) {
      // Primeiro login: garante usuario correspondente em auth.users/profiles
      if (account && user?.email) {
        const { role } = await checkAllowlist(user.email);

        token.supabaseUserId = await syncUserToSupabase({
          email: user.email,
          name: user.name,
          image: user.image,
          role: role ?? "viewer",
        });
      }

      // Renova o token Supabase (curta duracao) a cada requisicao
      if (token.supabaseUserId && token.email) {
        token.supabaseAccessToken = await createSupabaseAccessToken(
          token.supabaseUserId as string,
          token.email
        );
      }

      return token;
    },
    async session({ session, token }) {
      session.supabaseAccessToken = token.supabaseAccessToken as string | undefined;
      if (token.supabaseUserId) {
        session.user.id = token.supabaseUserId as string;
      }
      return session;
    },
  },
});
