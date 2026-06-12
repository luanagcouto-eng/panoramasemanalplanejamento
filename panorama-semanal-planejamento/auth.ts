import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { createSupabaseAccessToken } from "@/lib/supabase/jwt";
import { syncEntraUserToSupabase } from "@/lib/supabase/sync-user";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      // O escopo padrao inclui "User.Read" (Microsoft Graph), que exige
      // consentimento de administrador separado neste tenant. Mantemos
      // apenas os escopos OIDC basicos (login/identidade), sem acesso ao Graph.
      authorization: { params: { scope: "openid profile email" } },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Propaga o access token do Entra ID para uso nas chamadas OData (Fase 2)
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      // Primeiro login: garante usuario correspondente em auth.users/profiles
      if (account && user?.email) {
        token.supabaseUserId = await syncEntraUserToSupabase({
          email: user.email,
          name: user.name,
          image: user.image,
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
      session.accessToken = token.accessToken as string | undefined;
      session.supabaseAccessToken = token.supabaseAccessToken as string | undefined;
      if (token.supabaseUserId) {
        session.user.id = token.supabaseUserId as string;
      }
      return session;
    },
  },
});
