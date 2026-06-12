import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** JWT assinado com SUPABASE_JWT_SECRET (sub = profiles.id), para uso com auth.uid() em RLS */
    supabaseAccessToken?: string;
    user: DefaultSession["user"] & {
      /** profiles.id (= auth.users.id) no Supabase */
      id?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    supabaseUserId?: string;
    supabaseAccessToken?: string;
  }
}
