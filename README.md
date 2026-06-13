# Affinity Dashboard

Dashboard de cobranzas para Afiniti Financial · Stack: Next.js 14 App Router + TypeScript + Tailwind + Recharts + Supabase.

## Despliegue en Vercel

1. **Subir repo a GitHub** (la data/ ya está en `.gitignore`)
2. **Importar proyecto en Vercel** → New Project → seleccionar el repo
3. **Variables de entorno** (Settings → Environment Variables):
   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (Project Settings → API) |
4. **Ejecutar schema en Supabase** → SQL Editor → pegar `supabase/schema.sql`
5. Deploy ✓

## Uso local

```bash
cp .env.local.example .env.local
# editar .env.local con tus llaves de Supabase
npm install
npm run dev
# → http://localhost:3000
```

## Flujo de trabajo mensual

1. Ir a `/upload` → seleccionar período (mes/año)
2. Arrastrar los 4 archivos Excel de Afiniti
3. Revisar el preview (PII enmascarada) y KPIs calculados
4. Clic en **Procesar y guardar KPIs** → los agregados se guardan en Supabase
5. El dashboard en `/dashboard` actualiza automáticamente

## Archivos esperados

| Archivo | Hoja principal | Detectado como |
|---|---|---|
| DATA MASTER AFINITI.xlsx | `DATA MASTER` | `master` |
| BASE MOROSIDAD AFINITI.xlsx | `DATA` | `morosidad` |
| Pagos *.xlsx | Hoja con `NroCredito + Fecha pago` | `pagos` |
| Cualquier workbook con GESTIONES | Hoja con `CUENTA + HORA + USUARIO` | `gestiones` |

## Seguridad PII

- El parsing ocurre en memoria en la API route de Vercel (nodejs runtime)
- **Nada con PII se persiste**: solo KPIs agregados van a Supabase
- El preview que llega al cliente tiene campos PII reemplazados por `•••`
- `SUPABASE_SERVICE_ROLE_KEY` solo existe en el servidor; nunca se expone al cliente
- Supabase tiene RLS activado: sin políticas `anon`, solo el service role puede leer/escribir

## Estructura

```
src/
  app/
    api/upload/route.ts   ← procesa archivos, guarda KPIs en Supabase
    api/kpis/route.ts     ← devuelve histórico de KPIs
    upload/page.tsx       ← UI de carga con preview
    dashboard/page.tsx    ← dashboard con KPIs y gráficos
  lib/
    excel.ts              ← parsing + agregación + anonimización (SOLO servidor)
    supabase-server.ts    ← cliente Supabase (SOLO servidor)
    types.ts              ← tipos compartidos (sin PII)
    utils.ts              ← formatters, colores semáforo
  components/
    navbar.tsx            ← barra de navegación con logo Afiniti
    kpi-card.tsx          ← tarjeta KPI con icono + animación odómetro
    velocimetro.tsx       ← velocímetro SVG animado (% recuperación, etc.)
    bucket-chart.tsx      ← barras de mora por rango (Recharts)
    asesor-card.tsx       ← tarjeta de métricas por asesor con barra efectividad
    tendencia-chart.tsx   ← líneas evolución mensual (Recharts)
supabase/schema.sql       ← esquema BD (solo métricas, sin PII)
```
