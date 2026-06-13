"use client";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface KpiCardProps {
  titulo: string;
  valor: string;
  subtitulo?: string;
  icono?: ReactNode;
  color?: string; // CSS color o var()
  className?: string;
  tendencia?: "up" | "down" | "neutral";
  nota?: string;
}

export function KpiCard({
  titulo,
  valor,
  subtitulo,
  icono,
  color,
  className,
  nota,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "surface animar-panel opacity-0 flex flex-col gap-2 p-5 transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{titulo}</p>
        {icono && (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
            style={{ background: color ?? "var(--affinity-primary)" }}
          >
            {icono}
          </span>
        )}
      </div>

      <p
        className="animar-odometro opacity-0 text-3xl font-bold tabular-nums"
        style={{ color: color ?? "var(--affinity-text)" }}
      >
        {valor}
      </p>

      {subtitulo && <p className="text-sm text-gray-500">{subtitulo}</p>}
      {nota && <p className="mt-1 text-xs text-gray-400">{nota}</p>}
    </div>
  );
}
