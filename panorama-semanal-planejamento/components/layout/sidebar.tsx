import { CalendarRange, Gauge, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Panorama Semanal", href: "/panorama", icon: CalendarRange, active: true },
  { label: "Indicadores", href: "/indicadores", icon: Gauge, active: false },
  { label: "Relatórios", href: "/relatorios", icon: FileText, active: false },
  { label: "Configurações", href: "/configuracoes", icon: Settings, active: false },
] as const;

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-[#364B59] text-white">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#F18213]">
          <CalendarRange className="w-5 h-5 text-white" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Panorama Semanal</p>
          <p className="text-[11px] text-[#94A3B8]">Planejamento</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
          Navegação
        </p>
        {NAV_ITEMS.map(({ label, href, icon: Icon, active }) => (
          <a
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-[#F18213] text-white"
                : "text-[#C8D5DC] hover:bg-[#2D3F4A]"
            )}
          >
            <Icon className="w-4 h-4" aria-hidden />
            {label}
          </a>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-[#2D3F4A]">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#C8D5DC]">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2D3F4A] text-xs font-bold text-white">
            EM
          </div>
          <div className="leading-tight">
            <p className="font-medium text-white">Estaleiro Mauá</p>
            <p className="text-[11px] text-[#94A3B8]">Fase 1 — Scaffolding</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
