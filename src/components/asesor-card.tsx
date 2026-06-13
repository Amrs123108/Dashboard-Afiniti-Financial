"use client";
import type { KpiAsesor } from "@/lib/types";
import { numero, porcentaje } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TRAMO_LABEL: Record<KpiAsesor["tramo"], string> = {
  "0-30": "Asesor A · 0-30 días",
  "30+":  "Asesor B · 30+ días",
  mixto:  "Mixto",
};
const TRAMO_COLOR: Record<KpiAsesor["tramo"], string> = {
  "0-30": "var(--semaforo-verde)",
  "30+":  "var(--semaforo-rojo)",
  mixto:  "var(--affinity-primary)",
};

interface AsesorCardProps { asesor: KpiAsesor; className?: string; }

export function AsesorCard({ asesor, className }: AsesorCardProps) {
  const efectividadPct = asesor.gestionesTotales > 0
    ? (asesor.efectivas / asesor.gestionesTotales) * 100
    : 0;

  return (
    <div className={cn("surface animar-panel opacity-0 p-5 transition-shadow hover:shadow-md", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        {/* Nombre del asesor (empleado, no PII) */}
        <div>
          <p className="font-semibold text-[var(--affinity-text)]">{asesor.asesor}</p>
          <span
            className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white"
            style={{ background: TRAMO_COLOR[asesor.tramo] }}
          >
            {TRAMO_LABEL[asesor.tramo]}
          </span>
        </div>
        {/* Ícono carro */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          className="h-7 w-7 flex-shrink-0 opacity-20" style={{ color: "var(--affinity-primary)" }}>
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
        <Stat label="Gestiones" valor={numero(asesor.gestionesTotales)} />
        <Stat label="Horas est." valor={numero(asesor.horasEstimadas)} />
        <Stat label="Gest./hora" valor={numero(asesor.gestionesPorHora)} />
        <Stat label="Promesas/hora" valor={numero(asesor.promesasPorHora)} />
        <Stat label="Promesas" valor={numero(asesor.promesas)} />
        <Stat label="Efectividad" valor={`${efectividadPct.toFixed(0)}%`}
          color={efectividadPct >= 50 ? "var(--semaforo-verde)" : "var(--semaforo-amarillo)"} />
      </div>

      {/* Barra efectividad */}
      <div className="mt-4">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>Efectividad</span>
          <span>{efectividadPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="barra-carretera h-full rounded-full"
            style={{
              "--bar-target-width": `${efectividadPct}%`,
              background: efectividadPct >= 50 ? "var(--semaforo-verde)" : "var(--semaforo-amarillo)",
            } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, valor, color }: { label: string; valor: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-base font-bold tabular-nums" style={{ color: color ?? "var(--affinity-text)" }}>
        {valor}
      </p>
    </div>
  );
}
