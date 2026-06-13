"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { BucketMora } from "@/lib/types";
import { colorBucket, dinero, numero } from "@/lib/utils";

interface BucketChartProps {
  buckets: BucketMora[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as BucketMora;
  return (
    <div className="surface rounded-xl p-3 text-sm shadow-lg">
      <p className="mb-1 font-bold" style={{ color: colorBucket(label) }}>
        {label} días
      </p>
      <p className="text-gray-600">Clientes: <span className="font-semibold text-gray-900">{numero(d.clientes)}</span></p>
      <p className="text-gray-600">Saldo capital: <span className="font-semibold text-gray-900">{dinero(d.saldoCapital)}</span></p>
      <p className="text-gray-600">Recargos: <span className="font-semibold text-gray-900">{dinero(d.recargos)}</span></p>
    </div>
  );
};

export function BucketChart({ buckets }: BucketChartProps) {
  if (!buckets.length) return <p className="py-8 text-center text-sm text-gray-400">Sin datos de mora</p>;

  return (
    <div className="surface animar-panel opacity-0 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
        Distribución de mora por rango (clientes)
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={buckets} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
          barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#F3F4F6" />
          <XAxis
            dataKey="rango"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F3F4F6" }} />
          <Bar dataKey="clientes" radius={[6, 6, 0, 0]} isAnimationActive
            animationDuration={900} animationEasing="ease-out">
            {buckets.map((b) => (
              <Cell key={b.rango} fill={colorBucket(b.rango)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
