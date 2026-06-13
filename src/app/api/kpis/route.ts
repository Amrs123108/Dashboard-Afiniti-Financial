// GET /api/kpis?limit=12
// Devuelve el histórico de KPIs desde Supabase (sin PII).
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import type { KpisMensuales } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "12");
    const db = supabaseServer();

    const { data: kpisRaw, error: err1 } = await db
      .from("affinity_kpis_mensuales")
      .select("*")
      .order("periodo", { ascending: false })
      .limit(limit);
    if (err1) throw err1;

    const { data: asesoresRaw, error: err2 } = await db
      .from("affinity_asesores_mensuales")
      .select("*")
      .order("periodo", { ascending: false })
      .limit(limit * 20); // varios asesores por período
    if (err2) throw err2;

    const asesoresPorPeriodo = new Map<string, typeof asesoresRaw[0][]>();
    for (const a of asesoresRaw ?? []) {
      if (!asesoresPorPeriodo.has(a.periodo)) asesoresPorPeriodo.set(a.periodo, []);
      asesoresPorPeriodo.get(a.periodo)!.push(a);
    }

    const kpis: KpisMensuales[] = (kpisRaw ?? []).map((r) => ({
      periodo:            r.periodo,
      totalClientes:      r.total_clientes,
      clientesAlDia:      r.clientes_al_dia,
      clientesEnMora:     r.clientes_en_mora,
      saldoCapitalTotal:  r.saldo_capital_total,
      saldoCapitalMora:   r.saldo_capital_mora,
      recargosTotal:      r.recargos_total,
      montoRecuperado:    r.monto_recuperado,
      pctRecuperacion:    r.pct_recuperacion,
      promesasCumplidas:  r.promesas_cumplidas,
      promesasIncumplidas:r.promesas_incumplidas,
      pagosSinGestion:    r.pagos_sin_gestion,
      buckets:            r.buckets ?? [],
      asesores:           (asesoresPorPeriodo.get(r.periodo) ?? []).map((a) => ({
        asesor:           a.asesor,
        tramo:            a.tramo,
        gestionesTotales: a.gestiones_totales,
        horasEstimadas:   a.horas_estimadas,
        gestionesPorHora: a.gestiones_por_hora,
        promesas:         a.promesas,
        promesasPorHora:  a.promesas_por_hora,
        efectivas:        a.efectivas,
        noEfectivas:      a.no_efectivas,
      })),
    }));

    return NextResponse.json(kpis);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
