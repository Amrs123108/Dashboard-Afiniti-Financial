// ============================================================
// Parsing y agregación de los Excel de Affinity — SOLO SERVIDOR.
//
// SEGURIDAD PII: este módulo recibe data cruda en memoria, calcula
// agregados y enmascara el preview. NADA crudo se persiste ni se
// devuelve al cliente. No importar desde componentes de cliente.
// ============================================================
import * as XLSX from "xlsx";
import type {
  BucketMora,
  KpiAsesor,
  KpisMensuales,
  PreviewHoja,
  RespuestaUpload,
  TipoHoja,
} from "./types";

type Fila = (string | number | Date | null)[];

/** Normaliza un header: sin acentos, sin espacios extra, mayúsculas */
function norm(h: unknown): string {
  return String(h ?? "")
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function aNumero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[$,\s]/g, "").replace(/^B\/\.?/i, ""));
  return Number.isFinite(n) ? n : null;
}

/** HORA puede venir como Date, fracción de día Excel o texto "2:30 p. m." */
function aHoraDecimal(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.getHours() + v.getMinutes() / 60;
  if (typeof v === "number" && v >= 0 && v < 1) return v * 24;
  const s = String(v).toLowerCase();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (/p\.?\s*m/.test(s) && h < 12) h += 12;
  if (/a\.?\s*m/.test(s) && h === 12) h = 0;
  return h + min / 60;
}

function aFechaClave(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof v === "string" && v.trim()) return v.trim().slice(0, 10);
  return null;
}

// ------------------------------------------------------------
// Detección del tipo de hoja por sus headers (los workbooks de
// Affinity mezclan morosidad, gestiones y pagos en un mismo archivo)
// ------------------------------------------------------------
export function detectarTipoHoja(headers: string[]): TipoHoja {
  const h = new Set(headers.map(norm));
  const tiene = (...cols: string[]) => cols.every((c) => h.has(c));

  if (tiene("NROCREDITO", "FECHA PAGO")) return "pagos";
  if (tiene("CUENTA", "HORA", "USUARIO")) return "gestiones";
  if (tiene("NOMBRECLIENTE", "NOPRESTAMO", "DIAS")) return "morosidad";
  if (tiene("NUMERO DE CREDITO", "NOMBRE COMPLETO")) return "master";
  return "desconocido";
}

// ------------------------------------------------------------
// Anonimización del preview (se aplica ANTES de salir del servidor)
// ------------------------------------------------------------
const PII_TOTAL = /NOMBRE|CLIENTE|CEDULA|IDENTIFICACION|DOC-?ID|CELULAR|TELEFONO|TEL\d|GMAIL|EMAIL|CORREO|DIRECCION|PLACA|NACIMIENTO|SALARIO|EDAD|GENERO|ESTADO CIVIL|POLIZA|OBSERVACION|EMPRESA|DISTRITO/;
const PII_PARCIAL = /^(CUENTA|NOPRESTAMO|NROCREDITO|NUMERO DE CREDITO)$/;

function enmascarar(header: string, v: unknown): string | number | null {
  if (v === null || v === undefined || v === "") return null;
  const h = norm(header);
  if (PII_TOTAL.test(h)) return "•••";
  if (PII_PARCIAL.test(h)) {
    const s = String(v);
    return s.length > 3 ? "•••" + s.slice(-3) : "•••";
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return typeof v === "number" ? v : String(v);
}

// ------------------------------------------------------------
// Agregador: consume todas las hojas de todos los archivos subidos
// ------------------------------------------------------------
const RANGOS_BUCKET = ["Al día", "1-30", "31-60", "61-90", "91-120", "121-180", "180+"] as const;

function bucketDeDias(dias: number): string {
  if (dias <= 0) return "Al día";
  if (dias <= 30) return "1-30";
  if (dias <= 60) return "31-60";
  if (dias <= 90) return "61-90";
  if (dias <= 120) return "91-120";
  if (dias <= 180) return "121-180";
  return "180+";
}

interface GestionRow {
  usuario: string;
  fechaClave: string | null;
  hora: number | null;
  cuenta: string | null;
  esPromesa: boolean;
  esEfectiva: boolean;
  esNoEfectiva: boolean;
}

export function procesarArchivos(
  archivos: { nombre: string; buffer: Buffer }[],
  periodo: string
): RespuestaUpload {
  const preview: PreviewHoja[] = [];
  const advertencias: string[] = [];

  // Acumuladores
  const cuentaDias = new Map<string, number>(); // nro crédito -> días de mora (para tramo del asesor)
  const bucketsAcc = new Map<string, BucketMora>();
  RANGOS_BUCKET.forEach((r) => bucketsAcc.set(r, { rango: r, clientes: 0, saldoCapital: 0, recargos: 0 }));

  let hayMaster = false;
  let totalClientes = 0, alDia = 0, enMora = 0;
  let saldoTotal = 0, haySaldoTotal = false;
  let saldoMora = 0, recargos = 0, hayMorosidad = false;
  let montoRecuperado = 0, hayPagos = false;
  let promCumplidas = 0, promIncumplidas = 0, pagosSinGestion = 0, hayEstadoPromesa = false;
  const gestiones: GestionRow[] = [];
  const vistasGestiones = new Set<string>(); // dedupe entre hojas "GESTIONES" y "CONSOLIDADAS"
  const vistosPagos = new Set<string>();
  let bucketsDesdeMaster = false;

  for (const { nombre, buffer } of archivos) {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

    for (const nombreHoja of wb.SheetNames) {
      const ws = wb.Sheets[nombreHoja];
      const filas: Fila[] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
      if (filas.length < 2) continue;

      const headers = filas[0].map((c) => String(c ?? ""));
      const tipo = detectarTipoHoja(headers);
      const data = filas.slice(1).filter((f) => f.some((c) => c !== null && c !== ""));

      preview.push({
        archivo: nombre,
        hoja: nombreHoja,
        tipo,
        totalFilas: data.length,
        headers: headers.map((h) => h.trim()),
        filas: data.slice(0, 5).map((f) => headers.map((h, i) => enmascarar(h, f[i]))),
      });
      if (tipo === "desconocido") continue;

      // índice de columna por header normalizado
      const idx = new Map<string, number>();
      headers.forEach((h, i) => { if (!idx.has(norm(h))) idx.set(norm(h), i); });
      const col = (fila: Fila, ...nombres: string[]): unknown => {
        for (const n of nombres) {
          const i = idx.get(n);
          if (i !== undefined && fila[i] !== null && fila[i] !== "") return fila[i];
        }
        return null;
      };

      if (tipo === "master") {
        hayMaster = true;
        bucketsDesdeMaster = true;
        for (const f of data) {
          const credito = String(col(f, "NUMERO DE CREDITO") ?? "").trim();
          if (!credito) continue;
          totalClientes++;
          const dias = aNumero(col(f, "DIAS", "DIAS DE MORA GENERAL")) ?? 0;
          cuentaDias.set(credito, dias);
          const estado = norm(col(f, "ESTADO"));
          if (estado === "AL DIA" || (!estado && dias <= 0)) alDia++; else enMora++;

          const saldo = aNumero(col(f, "SALDO ACTUAL", "SALDO"));
          if (saldo !== null) { saldoTotal += saldo; haySaldoTotal = true; }
          const b = bucketsAcc.get(bucketDeDias(dias))!;
          b.clientes++;
          if (saldo !== null) b.saldoCapital += saldo;
          const rec = aNumero(col(f, "RECARGO"));
          if (rec !== null) b.recargos += rec;

          const ep = norm(col(f, "ESTADO DE LA PROMESA"));
          if (ep === "CUMPLIDA") { promCumplidas++; hayEstadoPromesa = true; }
          if (ep === "INCUMPLIDA") { promIncumplidas++; hayEstadoPromesa = true; }
        }
      }

      if (tipo === "morosidad") {
        hayMorosidad = true;
        for (const f of data) {
          const cuenta = String(col(f, "NOPRESTAMO") ?? "").trim();
          const dias = aNumero(col(f, "DIAS")) ?? 0;
          if (cuenta) cuentaDias.set(cuenta, dias);
          const saldo = aNumero(col(f, "SALDO")) ?? 0;
          const rec = aNumero(col(f, "RECARGO")) ?? 0;
          saldoMora += saldo;
          recargos += rec;
          // Si no hubo master, los buckets salen de aquí (solo cuentas en mora)
          if (!bucketsDesdeMaster) {
            const b = bucketsAcc.get(bucketDeDias(dias))!;
            b.clientes++;
            b.saldoCapital += saldo;
            b.recargos += rec;
          }
        }
      }

      if (tipo === "gestiones") {
        for (const f of data) {
          const usuario = String(col(f, "USUARIO") ?? "").trim().toUpperCase();
          if (!usuario) continue;
          const cuenta = String(col(f, "CUENTA") ?? "").trim() || null;
          const fechaClave = aFechaClave(col(f, "FECHA"));
          const hora = aHoraDecimal(col(f, "HORA"));
          const clave = `${usuario}|${cuenta}|${fechaClave}|${hora?.toFixed(3)}`;
          if (vistasGestiones.has(clave)) continue; // misma gestión repetida en hoja consolidada
          vistasGestiones.add(clave);

          // Etiqueta de la gestión: puede venir en CLASIFICACION u OBSERVACION
          const etiqueta = norm(col(f, "CLASIFICACION", "FECHA DE CLASIFICACION", "OBSERVACION", "OBSERVACIONES DE GESTION"));
          const tieneCompromiso = col(f, "FECHA COMPROMISO", "FECHA_COMPROMISO") !== null;
          gestiones.push({
            usuario,
            fechaClave,
            hora,
            cuenta,
            esPromesa: tieneCompromiso || etiqueta.includes("ACEPTA") || etiqueta.includes("COMPROMISO"),
            esEfectiva: etiqueta.includes("SI CONTACTO") || etiqueta.includes("ACEPTA"),
            esNoEfectiva: etiqueta.includes("NO CONTACTO"),
          });
        }
      }

      if (tipo === "pagos") {
        hayPagos = true;
        for (const f of data) {
          const cuenta = String(col(f, "NROCREDITO") ?? "").trim();
          const fechaClave = aFechaClave(col(f, "FECHA PAGO"));
          const monto = aNumero(col(f, "MONTO PAGADO", "MONTO PAGO")) ?? 0;
          const clave = `${cuenta}|${fechaClave}|${monto.toFixed(2)}`;
          if (vistosPagos.has(clave)) continue; // pago repetido entre archivo mensual y consolidado
          vistosPagos.add(clave);
          montoRecuperado += monto;

          const estado = norm(col(f, "ESTADO"));
          if (estado === "CUMPLIDA") { promCumplidas++; hayEstadoPromesa = true; }
          else if (estado === "INCUMPLIDA") { promIncumplidas++; hayEstadoPromesa = true; }
          else if (estado.includes("SIN GESTION")) pagosSinGestion++;
        }
      }
    }
  }

  // ---------- métricas por asesor ----------
  const porAsesor = new Map<string, GestionRow[]>();
  for (const g of gestiones) {
    if (!porAsesor.has(g.usuario)) porAsesor.set(g.usuario, []);
    porAsesor.get(g.usuario)!.push(g);
  }

  const asesores: KpiAsesor[] = [...porAsesor.entries()].map(([usuario, gs]) => {
    // Horas estimadas: por cada día trabajado, lapso entre primera y última gestión
    const porDia = new Map<string, number[]>();
    for (const g of gs) {
      const dia = g.fechaClave ?? "s/f";
      if (!porDia.has(dia)) porDia.set(dia, []);
      if (g.hora !== null) porDia.get(dia)!.push(g.hora);
    }
    let horas = 0;
    for (const hs of porDia.values()) {
      if (hs.length >= 2) horas += Math.min(Math.max(Math.max(...hs) - Math.min(...hs), 0.5), 12);
      else horas += 0.25; // día con una sola gestión registrada
    }
    horas = Math.max(horas, 0.25);

    // Tramo: 0-30 días = Asesor A, 30+ = Asesor B (según mora de las cuentas gestionadas)
    let t030 = 0, t30 = 0;
    for (const g of gs) {
      const dias = g.cuenta ? cuentaDias.get(g.cuenta) : undefined;
      if (dias === undefined) continue;
      if (dias <= 30) t030++; else t30++;
    }
    const conTramo = t030 + t30;
    const tramo: KpiAsesor["tramo"] =
      conTramo === 0 ? "mixto" : t030 / conTramo >= 0.7 ? "0-30" : t30 / conTramo >= 0.7 ? "30+" : "mixto";

    const promesas = gs.filter((g: GestionRow) => g.esPromesa).length;
    return {
      asesor: usuario,
      tramo,
      gestionesTotales: gs.length,
      horasEstimadas: +horas.toFixed(2),
      gestionesPorHora: +(gs.length / horas).toFixed(2),
      promesas,
      promesasPorHora: +(promesas / horas).toFixed(2),
      efectivas: gs.filter((g: GestionRow) => g.esEfectiva).length,
      noEfectivas: gs.filter((g: GestionRow) => g.esNoEfectiva).length,
    };
  });

  // ---------- consolidado ----------
  if (!hayMaster && !hayMorosidad && !hayPagos && gestiones.length === 0) {
    advertencias.push("Ningún archivo coincidió con los formatos esperados (master, morosidad, gestiones, pagos).");
  }
  if (hayMorosidad && !hayMaster) {
    advertencias.push("Sin DATA MASTER los buckets se calculan solo con las cuentas en mora (no hay total de flota).");
  }

  // % recuperación = pagos del mes / saldo capital en mora (definición operativa actual)
  const pctRecuperacion =
    hayPagos && hayMorosidad && saldoMora > 0 ? +((montoRecuperado / saldoMora) * 100).toFixed(2) : null;

  const buckets = RANGOS_BUCKET.map((r) => {
    const b = bucketsAcc.get(r)!;
    return { ...b, saldoCapital: +b.saldoCapital.toFixed(2), recargos: +b.recargos.toFixed(2) };
  }).filter((b) => b.clientes > 0 || b.rango !== "Al día" || hayMaster);

  const kpis: KpisMensuales = {
    periodo,
    totalClientes: hayMaster ? totalClientes : null,
    clientesAlDia: hayMaster ? alDia : null,
    clientesEnMora: hayMaster
      ? enMora
      : hayMorosidad
        ? [...bucketsAcc.values()].reduce((s, b) => s + (b.rango === "Al día" ? 0 : b.clientes), 0)
        : null,
    saldoCapitalTotal: haySaldoTotal ? +saldoTotal.toFixed(2) : null,
    saldoCapitalMora: hayMorosidad ? +saldoMora.toFixed(2) : null,
    recargosTotal: hayMorosidad ? +recargos.toFixed(2) : null,
    montoRecuperado: hayPagos ? +montoRecuperado.toFixed(2) : null,
    pctRecuperacion,
    promesasCumplidas: hayEstadoPromesa ? promCumplidas : null,
    promesasIncumplidas: hayEstadoPromesa ? promIncumplidas : null,
    pagosSinGestion: hayPagos ? pagosSinGestion : null,
    buckets,
    asesores: asesores.sort((a, b) => b.gestionesTotales - a.gestionesTotales),
  };

  return { preview, kpis, advertencias };
}
