"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { CalendarRange, Loader2 } from "lucide-react";

/** Logo Google — usado no botão de SSO */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.43 3.58v2.98h3.93c2.3-2.12 3.52-5.24 3.52-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.93l-3.93-2.98c-1.07.71-2.43 1.13-4 1.13-3.07 0-5.66-2.04-6.59-4.86H1.36v3.05C3.34 21.3 7.36 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.41 14.36C5.15 13.6 5 12.81 5 12s.15-1.6.41-2.36V6.59H1.36C.5 8.21 0 10.05 0 12s.5 3.79 1.36 5.41l4.05-3.05z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.49-3.49C17.94 1.19 15.24 0 12 0 7.36 0 3.34 2.7 1.36 6.59l4.05 3.05C6.34 6.79 8.93 4.75 12 4.75z"
      />
    </svg>
  );
}

export default function LoginCard() {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    await signIn("google", { redirectTo: "/panorama" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center gap-2 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#364B59]">
            <CalendarRange className="w-6 h-6 text-white" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-[#364B59]">Panorama Semanal</h1>
          <p className="text-sm text-muted-foreground">
            Planejamento — Estaleiro Mauá
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-[#364B59] transition-colors hover:bg-maua-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <GoogleLogo />
          )}
          Entrar com Google
        </button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acesso restrito a usuários autorizados.
          <br />
          Autenticação via Google.
        </p>
      </div>
    </div>
  );
}
