"use client";
import { useState, useCallback, useRef } from "react";
import { cn, dinero, numero, porcentaje, nombrePeriodo } from "@/lib/utils";
import type { PreviewHoja, RespuestaUpload } from "@/lib/types";

const TIPOS_LABEL: Record<string, string> = {
  master:      "DATA MASTER",
  morosidad:   "Morosidad",
  gestiones:   "Gestiones",
  pagos:       "Pagos",
  desconocido: "Sin mapeo",
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function periodoDefault() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function UploadPage() {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [periodo, setPeriodo] = useState(periodoDefault);
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<RespuestaUpload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const agregarArchivos = useCallback((nuevos: FileList | File[] | null) => {
    if (!nuevos) return;
    const lista = Array.from(nuevos).filter(
      (f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xls") || f.name.endsWith(".csv")
    );
    setArchivos((prev) => {
      const nombres = new Set(prev.map((f) => f.name));
      return [...prev, ...lista.filter((f) => !nombres.has(f.name))];
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    agregarArchivos(e.dataTransfer.files);
  }, [agregarArchivos]);

  const quitarArchivo = (idx: number) => setArchivos((prev) => prev.filter((_, i) => i !== idx));

  const procesar = async () => {
    if (!archivos.length) return;
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const form = new FormData();
      form.append("periodo", periodo);
      archivos.forEach((f) => form.append("archivos", f));
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error en el servidor");
      setResultado(json as RespuestaUpload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--affinity-text)" }}>
          Cargar archivos
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Los archivos se procesan en el servidor en memoria. La data cruda nunca se persiste.
        </p>
      </div>

      {/* Selector de período */}
      <div className="surface p-5 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Mes</label>
          <select
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "var(--affinity-primary)" } as React.CSSProperties}
            value={periodo.slice(5, 7)}
            onChange={(e) =>
              setPeriodo(`${periodo.slice(0, 4)}-${e.target.value}-01`)
            }
          >
            {MESES.map((m, i) => (
              <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Año</label>
          <select
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "var(--affinity-primary)" } as React.CSSProperties}
            value={periodo.slice(0, 4)}
            onChange={(e) =>
              setPeriodo(`${e.target.value}-${periodo.slice(5, 7)}-01`)
            }
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <p className="text-sm text-gray-500 pb-2">
          Período seleccionado: <strong>{nombrePeriodo(periodo)}</strong>
        </p>
      </div>

      {/* Dropzone */}
      <div
        className={cn(
          "surface cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          arrastrando ? "dropzone-activa" : "border-gray-200 hover:border-gray-300"
        )}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => agregarArchivos(e.target.files)}
        />
        <svg className="mx-auto mb-3 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm font-medium text-gray-600">
          Arrastra los archivos aquí o <span style={{ color: "var(--affinity-primary)" }}>selecciónalos</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">XLSX, XLS, CSV · Máx. 4 archivos simultáneos</p>
      </div>

      {/* Lista de archivos seleccionados */}
      {archivos.length > 0 && (
        <div className="surface p-4 space-y-2">
          {archivos.map((f, i) => (
            <div key={f.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span className="font-medium text-gray-700 truncate max-w-xs">{f.name}</span>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  onClick={() => quitarArchivo(i)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón procesar */}
      <button
        onClick={procesar}
        disabled={!archivos.length || cargando}
        className={cn(
          "w-full rounded-xl py-3 text-sm font-bold uppercase tracking-widest text-white transition-all",
          archivos.length && !cargando
            ? "shadow-md hover:shadow-lg active:scale-[0.98]"
            : "opacity-40 cursor-not-allowed"
        )}
        style={{ background: "var(--affinity-primary)" }}
      >
        {cargando ? "Procesando…" : "Procesar y guardar KPIs"}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="space-y-6">
          {/* Advertencias */}
          {resultado.advertencias.length > 0 && (
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800 space-y-1">
              {resultado.advertencias.map((a, i) => <p key={i}>⚠ {a}</p>)}
            </div>
          )}

          {/* Resumen KPIs calculados */}
          <div className="surface p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              KPIs calculados · {nombrePeriodo(resultado.kpis.periodo)}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <KpiResumen label="Total clientes"   valor={numero(resultado.kpis.totalClientes)} />
              <KpiResumen label="En mora"          valor={numero(resultado.kpis.clientesEnMora)} color="var(--semaforo-rojo)" />
              <KpiResumen label="Saldo capital mora" valor={dinero(resultado.kpis.saldoCapitalMora)} color="var(--semaforo-rojo)" />
              <KpiResumen label="Recuperado"       valor={dinero(resultado.kpis.montoRecuperado)} color="var(--semaforo-verde)" />
              <KpiResumen label="% Recuperación"   valor={porcentaje(resultado.kpis.pctRecuperacion)} color="var(--affinity-primary)" />
              <KpiResumen label="Promesas cumplidas"   valor={numero(resultado.kpis.promesasCumplidas)} color="var(--semaforo-verde)" />
              <KpiResumen label="Promesas incumplidas" valor={numero(resultado.kpis.promesasIncumplidas)} color="var(--semaforo-rojo)" />
              <KpiResumen label="Recargos totales" valor={dinero(resultado.kpis.recargosTotal)} />
            </div>
          </div>

          {/* Preview de hojas (PII ya enmascarada en servidor) */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Preview de archivos — datos enmascarados
            </h2>
            <div className="space-y-4">
              {resultado.preview.map((hoja, i) => (
                <HojaPreview key={i} hoja={hoja} />
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800 font-medium">
            ✓ KPIs guardados en Supabase para {nombrePeriodo(resultado.kpis.periodo)}. Ve al Dashboard para ver los gráficos.
          </div>
        </div>
      )}
    </div>
  );
}

function KpiResumen({ label, valor, color }: { label: string; valor: string; color?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums" style={{ color: color ?? "var(--affinity-text)" }}>
        {valor}
      </p>
    </div>
  );
}

function HojaPreview({ hoja }: { hoja: PreviewHoja }) {
  const [expandida, setExpandida] = useState(false);
  const colorTipo =
    hoja.tipo === "master" ? "var(--affinity-primary)"
    : hoja.tipo === "gestiones" ? "var(--semaforo-verde)"
    : hoja.tipo === "pagos" ? "var(--semaforo-amarillo)"
    : hoja.tipo === "morosidad" ? "var(--semaforo-rojo)"
    : "#9CA3AF";

  return (
    <div className="surface overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setExpandida((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white"
            style={{ background: colorTipo }}
          >
            {TIPOS_LABEL[hoja.tipo]}
          </span>
          <span className="text-sm font-medium text-gray-700">{hoja.archivo}</span>
          <span className="text-xs text-gray-400">· {hoja.hoja}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{hoja.totalFilas} filas</span>
          <span>{expandida ? "▲" : "▼"}</span>
        </div>
      </button>
      {expandida && (
        <div className="overflow-x-auto border-t border-gray-100 px-5 pb-4 pt-3">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {hoja.headers.map((h) => (
                  <th key={h} className="whitespace-nowrap pb-2 pr-4 text-left font-semibold uppercase tracking-wide text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hoja.filas.map((fila, ri) => (
                <tr key={ri} className="border-t border-gray-50">
                  {fila.map((celda, ci) => (
                    <td key={ci} className="whitespace-nowrap py-1.5 pr-4 text-gray-600">
                      {celda === "•••" ? (
                        <span className="rounded bg-gray-100 px-1 text-gray-300">•••</span>
                      ) : (celda ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
