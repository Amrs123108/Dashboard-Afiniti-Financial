"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { KpisMensuales } from "@/lib/types";
import { dinero, nombrePeriodo } from "@/lib/utils";

interface TendenciaChartProps { historico: KpisMensuales[]; }

export function TendenciaChart({ historico }: TendenciaChartProps) {
  if (historico.length < 2)
    return <p className="py-8 text-center text-sm text-gray-400">Necesitas al menos 2 meses cargados para ver la tendencia.</p>;

  const data = historico.map((k) => ({
    mes: nombrePeriodo(k.periodo).split(" ")[0].slice(0, 3),
    "Saldo mora": k.saldoCapitalMora,
    "Recuperado": k.montoRecuperado,
    "%Recup.": k.pctRecuperacion,
  }));

  return (
    <div className="surface animar-panel opacity-0 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
        Evolución mensual — Saldo mora vs. Recuperación
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 10, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            formatter={(v: number, name: string) =>
              name === "%Recup." ? [`${v?.toFixed(1)}%`, name] : [dinero(v), name]
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Saldo mora"
            stroke="var(--semaforo-rojo)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--semaforo-rojo)" }}
            activeDot={{ r: 6 }}
            isAnimationActive
            animationDuration={1000}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Recuperado"
            stroke="var(--semaforo-verde)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--semaforo-verde)" }}
            activeDot={{ r: 6 }}
            isAnimationActive
            animationDuration={1000}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="%Recup."
            stroke="var(--affinity-primary)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
