import { CalendarRange, Gauge } from "lucide-react";
import {
  calcProgress,
  formatGoalValue,
  goalColor,
  goalTextClass,
  progressBarPct,
  OP_SYMBOL,
} from "@/lib/utils";

export const metadata = {
  title: "Panorama Semanal — Planejamento",
};

// Dados mockados — serão substituídos pela engine de indicadores (Fase 3)
// a partir dos dados em tempo real do PWA via OData (Fase 2).
const MOCK_INDICATORS = [
  { name: "Tarefas concluídas no prazo", current: 78, target: 90, unit: "%", operator: ">=" },
  { name: "Horas apontadas vs. planejadas", current: 412, target: 480, unit: "h", operator: ">=" },
  { name: "Tarefas em atraso", current: 6, target: 5, unit: "", operator: "<=" },
  { name: "Custo realizado vs. orçado", current: 152000, target: 180000, unit: "R$", operator: "<=" },
];

export default function PanoramaPage() {
  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#364B59]">Panorama Semanal</h1>
          <p className="text-sm text-muted-foreground">
            Semana de 09/06/2026 a 13/06/2026
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
          Fase 1 — Scaffolding (dados de exemplo)
        </span>
      </header>

      <section className="rounded-xl border border-border bg-white shadow-sm">
        <div className="px-6 py-3 bg-[#364B59]/20">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[#364B59]">
            <Gauge className="w-5 h-5" aria-hidden />
            Indicadores da semana
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
          {MOCK_INDICATORS.map((indicator) => {
            const pct = calcProgress(indicator.current, indicator.target, indicator.operator);
            const barPct = progressBarPct(pct);

            return (
              <div
                key={indicator.name}
                className="rounded-xl border border-border bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#364B59]/70">
                  {indicator.name}
                </p>

                <p className="mt-2 text-2xl font-bold text-[#364B59]">
                  {formatGoalValue(indicator.current, indicator.unit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Meta: {OP_SYMBOL[indicator.operator] ?? ""} {formatGoalValue(indicator.target, indicator.unit)}
                </p>

                <div className="mt-3 h-2 w-full rounded-full bg-maua-gray-100">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${barPct}%`, backgroundColor: goalColor(pct) }}
                  />
                </div>

                <span
                  className={`mt-3 inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${goalTextClass(pct)}`}
                >
                  {pct}% atingido
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-base font-semibold text-[#364B59] mb-2">
          <CalendarRange className="w-5 h-5" aria-hidden />
          Próximas etapas
        </h3>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          <li>Fase 1: autenticação Microsoft Entra ID + tabelas Supabase</li>
          <li>Fase 2: integração OData com o PWA do SharePoint</li>
          <li>Fase 3: engine de indicadores em tempo real</li>
          <li>Fase 4: layout de impressão A4 do panorama semanal</li>
        </ul>
      </section>
    </div>
  );
}
