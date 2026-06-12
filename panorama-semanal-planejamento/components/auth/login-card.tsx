"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { CalendarRange, Loader2 } from "lucide-react";

/** Logo Microsoft (4 quadrados) — usado no botão de SSO Entra ID */
function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="w-4 h-4" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export default function LoginCard() {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    await signIn("microsoft-entra-id", { redirectTo: "/panorama" });
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
            <MicrosoftLogo />
          )}
          Entrar com Microsoft
        </button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acesso restrito aos colaboradores do Estaleiro Mauá.
          <br />
          Autenticação via Microsoft Entra ID.
        </p>
      </div>
    </div>
  );
}
