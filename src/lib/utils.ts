import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fmtUSD = new Intl.NumberFormat("es-PA", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat("es-PA", { maximumFractionDigits: 1 });

export const dinero = (v: number | null | undefined) => (v == null ? "—" : fmtUSD.format(v));
export const numero = (v: number | null | undefined) => (v == null ? "—" : fmtNum.format(v));
export const porcentaje = (v: number | null | undefined) => (v == null ? "—" : `${fmtNum.format(v)}%`);

/** "2026-04-01" -> "Abril 2026" */
export function nombrePeriodo(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${meses[(m ?? 1) - 1]} ${y}`;
}

/** Color semáforo según el rango de mora */
export function colorBucket(rango: string): string {
  if (rango === "Al día") return "var(--semaforo-verde)";
  if (rango === "1-30") return "#84CC16";
  if (rango === "31-60") return "var(--semaforo-amarillo)";
  if (rango === "61-90") return "#F97316";
  return "var(--semaforo-rojo)";
}
