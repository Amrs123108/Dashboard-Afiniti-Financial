"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface VelocimetroProps {
  /** 0 – 100 */
  valor: number;
  etiqueta: string;
  unidad?: string;
  colorFill?: string;
  className?: string;
}

/** Velocímetro semicircular SVG — sin dependencias externas */
export function Velocimetro({ valor, etiqueta, unidad = "%", colorFill, className }: VelocimetroProps) {
  const arcRef = useRef<SVGCircleElement>(null);
  const pct = Math.max(0, Math.min(100, valor));

  // Radio y circumferencia del arco (semicírculo = 50% del círculo completo)
  const r = 45;
  const circ = Math.PI * r; // semicírculo = π*r
  const offset = circ - (pct / 100) * circ;

  useEffect(() => {
    const arc = arcRef.current;
    if (!arc) return;
    arc.style.strokeDasharray = `${circ} ${circ}`;
    arc.style.strokeDashoffset = `${circ}`;
    arc.style.transition = "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)";
    const id = requestAnimationFrame(() => {
      arc.style.strokeDashoffset = `${offset}`;
    });
    return () => cancelAnimationFrame(id);
  }, [circ, offset]);

  // Color automático según valor
  const color =
    colorFill ??
    (pct >= 70 ? "var(--semaforo-verde)" : pct >= 40 ? "var(--semaforo-amarillo)" : "var(--semaforo-rojo)");

  return (
    <div className={cn("surface animar-panel opacity-0 flex flex-col items-center gap-2 p-5", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{etiqueta}</p>
      <svg viewBox="0 0 100 55" className="w-36">
        {/* Pista gris de fondo */}
        <path
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Arco animado */}
        <circle
          ref={arcRef}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          transform="rotate(-180 50 50) scale(1 -1) translate(0 -100)"
          style={{ strokeDasharray: `${circ} ${circ * 10}`, strokeDashoffset: circ }}
        />
        {/* Aguja / punto central */}
        <circle cx="50" cy="50" r="4" fill={color} />
        {/* Valor */}
        <text x="50" y="42" textAnchor="middle" className="font-bold" fontSize="16" fill="var(--affinity-text)">
          {pct.toFixed(1)}{unidad}
        </text>
      </svg>
      {/* Escala */}
      <div className="flex w-36 justify-between text-[10px] text-gray-400">
        <span>0{unidad}</span>
        <span>100{unidad}</span>
      </div>
    </div>
  );
}
