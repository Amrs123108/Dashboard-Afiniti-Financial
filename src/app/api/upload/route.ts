// ============================================================
// POST /api/upload
// Recibe los archivos Excel/CSV como multipart/form-data.
// SEGURIDAD PII: los buffers se procesan en memoria y se descartan.
// Solo KPIs agregados salen en la respuesta JSON y se persisten.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { procesarArchivos } from "@/lib/excel";
import { supabaseServer } from "@/lib/supabase-server";
import type { KpisMensuales } from "@/lib/types";

export const runtime = "nodejs";
// Vercel Pro: hasta 50 MB por request (configurable en vercel.json si se requiere más)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const periodo = (form.get("periodo") as string | null) ?? periodoActual();
    const archivos: { nombre: string; buffer: Buffer }[] = [];

    const entries = Array.from(form.entries());
    for (const [, valor] of entries) {
      if (valor instanceof File) {
        const arrayBuf = await valor.arrayBuffer();
        archivos.push({ nombre: valor.name, buffer: Buffer.from(arrayBuf) });
      }
    }

    if (archivos.length === 0) {
      return NextResponse.json({ error: "No se recibieron archivos." }, { status: 400 });
    }

    const { preview, kpis, advertencias } = procesarArchivos(archivos, periodo);

    // Persistir KPIs en Supabase (upsert por periodo)
    await guardarKpis(kpis);

    return NextResponse.json({ preview, kpis, advertencias });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    console.error("[upload]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function guardarKpis(k: KpisMensuales) {
  const db = supabaseServer();

  const { error: errKpi } = await db.from("affinity_kpis_mensuales").upsert(
    {
      periodo:             k.periodo,
      total_clientes:      k.totalClientes,
      clientes_al_dia:     k.clientesAlDia,
      clientes_en_mora:    k.clientesEnMora,
      saldo_capital_total: k.saldoCapitalTotal,
      saldo_capital_mora:  k.saldoCapitalMora,
      recargos_total:      k.recargosTotal,
      monto_recuperado:    k.montoRecuperado,
      pct_recuperacion:    k.pctRecuperacion,
      promesas_cumplidas:  k.promesasCumplidas,
      promesas_incumplidas:k.promesasIncumplidas,
      pagos_sin_gestion:   k.pagosSinGestion,
      buckets:             k.buckets,
    },
    { onConflict: "periodo" }
  );
  if (errKpi) console.error("[upload] kpis upsert:", errKpi.message);

  // Métricas de asesores (empleados): upsert por periodo + asesor
  if (k.asesores.length > 0) {
    const rows = k.asesores.map((a) => ({
      periodo:           k.periodo,
      asesor:            a.asesor,
      tramo:             a.tramo,
      gestiones_totales: a.gestionesTotales,
      horas_estimadas:   a.horasEstimadas,
      gestiones_por_hora:a.gestionesPorHora,
      promesas:          a.promesas,
      promesas_por_hora: a.promesasPorHora,
      efectivas:         a.efectivas,
      no_efectivas:      a.noEfectivas,
    }));
    const { error: errAs } = await db.from("affinity_asesores_mensuales").upsert(
      rows,
      { onConflict: "periodo,asesor" }
    );
    if (errAs) console.error("[upload] asesores upsert:", errAs.message);
  }
}

function periodoActual(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}
