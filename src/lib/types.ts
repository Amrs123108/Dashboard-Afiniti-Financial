// Tipos compartidos cliente/servidor. Ninguno transporta PII:
// el preview viaja ya anonimizado desde el servidor.

export type TipoHoja = "morosidad" | "master" | "gestiones" | "pagos" | "desconocido";

export interface BucketMora {
  rango: string; // "Al día" | "1-30" | "31-60" | "61-90" | "91-120" | "121-180" | "180+"
  clientes: number;
  saldoCapital: number;
  recargos: number;
}

export interface KpiAsesor {
  asesor: string;
  tramo: "0-30" | "30+" | "mixto";
  gestionesTotales: number;
  horasEstimadas: number;
  gestionesPorHora: number;
  promesas: number;
  promesasPorHora: number;
  efectivas: number;
  noEfectivas: number;
}

export interface KpisMensuales {
  periodo: string; // "YYYY-MM-01"
  totalClientes: number | null;
  clientesAlDia: number | null;
  clientesEnMora: number | null;
  saldoCapitalTotal: number | null;
  saldoCapitalMora: number | null;
  recargosTotal: number | null;
  montoRecuperado: number | null;
  pctRecuperacion: number | null;
  promesasCumplidas: number | null;
  promesasIncumplidas: number | null;
  pagosSinGestion: number | null;
  buckets: BucketMora[];
  asesores: KpiAsesor[];
}

/** Hoja detectada + primeras filas YA ANONIMIZADAS para el preview de /upload */
export interface PreviewHoja {
  archivo: string;
  hoja: string;
  tipo: TipoHoja;
  totalFilas: number;
  headers: string[];
  filas: (string | number | null)[][]; // máx. 5 filas, PII enmascarada en servidor
}

export interface RespuestaUpload {
  preview: PreviewHoja[];
  kpis: KpisMensuales;
  advertencias: string[];
}
