"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/login" })}
      title="Sair"
      className="flex items-center justify-center w-8 h-8 rounded-lg text-[#C8D5DC] hover:bg-[#2D3F4A] hover:text-white transition-colors"
    >
      <LogOut className="w-4 h-4" aria-hidden />
    </button>
  );
}
