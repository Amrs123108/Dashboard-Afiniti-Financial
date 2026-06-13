"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { KpisMensuales } from "@/lib/types";
import { dinero, numero, porcentaje, nombrePeriodo } from "@/lib/utils";
import { KpiCard } from "@/components/kpi-card";
import { Velocimetro } from "@/components/velocimetro";
import { BucketChart } from "@/components/bucket-chart";
import { AsesorCard } from "@/components/asesor-card";
import { TendenciaChart } from "@/components/tendencia-chart";

export default function DashboardPage() {
  const [historico, setHistorico] = useState<KpisMensuales[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoSel, setPeriodoSel] = useState<string>("");

  useEffect(() => {
    fetch("/api/kpis?limit=12")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setHistorico(data);
          setPeriodoSel(data[0].periodo);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  const kpis = historico.find((k) => k.periodo === periodoSel) ?? null;

  if (cargando)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          {/* Loader "arranque" */}
          <svg className="h-10 w-10 animate-spin" style={{ color: "var(--affinity-primary)" }}
            viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-gray-500">Cargando dashboard…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="mt-10 rounded-xl bg-red-50 border border-red-200 p-6 text-center text-red-700">
        <p className="font-semibold">Error al cargar KPIs</p>
        <p className="mt-1 text-sm">{error}</p>
        <p className="mt-1 text-xs text-red-500">Verifica que las variables de entorno de Supabase estén configuradas.</p>
      </div>
    );

  if (!historico.length)
    return (
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <svg className="h-16 w-16 text-gray-200" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>
        </svg>
        <h2 className="text-xl font-bold text-gray-700">Sin datos aún</h2>
        <p className="text-sm text-gray-500">Sube los archivos Excel para calcular los KPIs y verlos aquí.</p>
        <Link
          href="/upload"
          className="rounded-xl px-6 py-3 text-sm font-bold text-white shadow hover:shadow-md transition-shadow"
          style={{ background: "var(--affinity-primary)" }}
        >
          Cargar archivos
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Encabezado + selector de período */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--affinity-text)" }}>
            Dashboard Afiniti Financial
          </h1>
          {kpis && (
            <p className="mt-0.5 text-sm text-gray-500">
              Corte: <strong>{nombrePeriodo(kpis.periodo)}</strong> · {numero(kpis.totalClientes)} créditos en flota
            </p>
          )}
        </div>
        <select
          value={periodoSel}
          onChange={(e) => setPeriodoSel(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          {historico.map((k) => (
            <option key={k.periodo} value={k.periodo}>{nombrePeriodo(k.periodo)}</option>
          ))}
        </select>
      </div>

      {kpis && (
        <>
          {/* ── Fila 1: KPIs principales ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <KpiCard
              titulo="Total créditos"
              valor={numero(kpis.totalClientes)}
              subtitulo="Flota activa"
              icono={<CarIcon />}
              color="var(--affinity-primary)"
            />
            <KpiCard
              titulo="Clientes al día"
              valor={numero(kpis.clientesAlDia)}
              subtitulo={
                kpis.totalClientes
                  ? `${((kpis.clientesAlDia! / kpis.totalClientes) * 100).toFixed(1)}% de la flota`
                  : undefined
              }
              icono={<CheckIcon />}
              color="var(--semaforo-verde)"
            />
            <KpiCard
              titulo="En mora"
              valor={numero(kpis.clientesEnMora)}
              subtitulo={
                kpis.totalClientes
                  ? `${((kpis.clientesEnMora! / kpis.totalClientes) * 100).toFixed(1)}% de la flota`
                  : undefined
              }
              icono={<AlertIcon />}
              color="var(--semaforo-rojo)"
            />
            <KpiCard
              titulo="Saldo capital mora"
              valor={dinero(kpis.saldoCapitalMora)}
              subtitulo="Cartera en riesgo"
              icono={<DollarIcon />}
              color="var(--semaforo-rojo)"
            />
            <KpiCard
              titulo="Monto recuperado"
              valor={dinero(kpis.montoRecuperado)}
              subtitulo="Pagos del período"
              icono={<DollarIcon />}
              color="var(--semaforo-verde)"
            />
            <KpiCard
              titulo="Recargos totales"
              valor={dinero(kpis.recargosTotal)}
              icono={<TagIcon />}
              color="var(--semaforo-naranja)"
            />
            <KpiCard
              titulo="Promesas cumplidas"
              valor={numero(kpis.promesasCumplidas)}
              nota={
                kpis.promesasCumplidas != null && kpis.promesasIncumplidas != null
                  ? `Incumplidas: ${numero(kpis.promesasIncumplidas)}`
                  : undefined
              }
              icono={<CheckIcon />}
              color="var(--semaforo-verde)"
            />
            <KpiCard
              titulo="Pagos sin gestión"
              valor={numero(kpis.pagosSinGestion)}
              nota="Pagos espontáneos"
              icono={<TagIcon />}
              color="var(--affinity-primary-light)"
            />
          </div>

          {/* ── Velocímetros ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Velocimetro
              valor={kpis.pctRecuperacion ?? 0}
              etiqueta="% Recuperación"
              unidad="%"
            />
            <Velocimetro
              valor={
                kpis.totalClientes && kpis.clientesAlDia != null
                  ? (kpis.clientesAlDia / kpis.totalClientes) * 100
                  : 0
              }
              etiqueta="% Flota al día"
              unidad="%"
            />
            <Velocimetro
              valor={
                kpis.promesasCumplidas != null && kpis.promesasIncumplidas != null
                  ? (kpis.promesasCumplidas / Math.max(kpis.promesasCumplidas + kpis.promesasIncumplidas, 1)) * 100
                  : 0
              }
              etiqueta="% Promesas cumplidas"
              unidad="%"
              colorFill="var(--affinity-primary)"
            />
          </div>

          {/* ── Gráfico buckets ── */}
          <BucketChart buckets={kpis.buckets} />

          {/* ── Asesores ── */}
          {kpis.asesores.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Desempeño por asesor
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {kpis.asesores.map((a) => (
                  <AsesorCard key={a.asesor} asesor={a} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Tendencia histórica ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Evolución histórica
        </h2>
        <TendenciaChart historico={[...historico].reverse()} />
      </section>
    </div>
  );
}

/* Íconos inline SVG — sin dependencia extra */
function CarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z" clipRule="evenodd" />
    </svg>
  );
}
function DollarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 0 1-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 0 1-.921.42z" />
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 0 0-1.5 0v.816a3.836 3.836 0 0 0-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 0 1-.921-.421l-.879-.66a.75.75 0 0 0-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 0 0 1.5 0v-.81a4.124 4.124 0 0 0 1.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 0 0-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 0 0 .933-1.175l-.415-.33a3.836 3.836 0 0 0-1.719-.755V6z" clipRule="evenodd" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M5.25 2.25a3 3 0 0 0-3 3v4.318a3 3 0 0 0 .879 2.121l9.58 9.581c.92.92 2.39.974 3.316.054l4.152-4.152c.926-.926.872-2.397-.048-3.316L10.55 4.775A3 3 0 0 0 8.43 3.896H5.25zm1.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" clipRule="evenodd" />
    </svg>
  );
}
