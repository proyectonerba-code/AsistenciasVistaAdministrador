/**
 * /admin/asistencia — página principal del panel.
 *
 *  1. Registros del Día   (tabla en vivo, editable por el administrador)
 *  2. Reporte General de la Semana
 */
import { obtenerSesion } from "@/server/auth";
import { obtenerDatosDia } from "@/server/dia";
import { obtenerReporteSemana } from "@/server/reporte";
import { DiaPanel } from "@/components/admin/dia-panel";
import { RegistroManual } from "@/components/admin/registro-manual";
import { ReporteTabla, type ReporteFila } from "@/components/ui/reporte-tabla";
import { fechaLocal, ahoraMx, sumarDias, fechaLarga } from "@/lib/tz";
import { z } from "zod";

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; semana?: string }>;
}) {
  const sesion = await obtenerSesion();
  const params = await searchParams;

  const hoy = fechaLocal(ahoraMx());
  const fechaValida = FechaSchema.safeParse(params.fecha);
  const fecha = fechaValida.success ? fechaValida.data : hoy;

  const semanaValida = FechaSchema.safeParse(params.semana);
  const lunesSemana = semanaValida.success
    ? new Date(
        `${semanaValida.data}T12:00:00Z`
      )
    : new Date(
        `${sumarDias(hoy, -((new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7))}T12:00:00Z`
      );

  const { grupos, totales } = await obtenerDatosDia(fecha);
  const reporte = await obtenerReporteSemana(lunesSemana);

  const filasDia = grupos.flatMap((g) => g.filas);

  const filasReporte: ReporteFila[] = reporte.filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    area: f.area,
    trabajadas: `${String(Math.floor(f.trabajadasMin / 60)).padStart(2, "0")}:${String(
      f.trabajadasMin % 60
    ).padStart(2, "0")}`,
    extra: `${String(Math.floor(f.extraMin / 60)).padStart(2, "0")}:${String(
      f.extraMin % 60
    ).padStart(2, "0")}`,
    asistencias: f.asistencias,
    faltas: f.faltas,
    diasObjetivo: f.diasObjetivo,
    estado: f.estado,
    nota: f.nota,
  }));

  const personas = grupos.flatMap((g) =>
    g.filas.map((f) => ({ id: f.id, nombre: f.nombre, area: f.area }))
  );

  const esHoy = fecha === hoy;

  return (
    <div className="space-y-10">
      {/* ---------------------------------------------------------- */}
      {/* Encabezado                                                 */}
      {/* ---------------------------------------------------------- */}
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="u-display text-3xl font-extrabold leading-tight text-ink lg:text-4xl">
            Ner<span className="text-primary">Work</span>
          </h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            Supervisión clara de asistencia diaria y cumplimiento de horas
            semanales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="u-card inline-flex items-center gap-2 px-4 py-2.5">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span className="text-sm font-semibold text-ink">
              {(() => {
                const t = fechaLarga(fecha);
                return t.charAt(0).toUpperCase() + t.slice(1);
              })()}
            </span>
            {esHoy && (
              <span className="u-dot ml-1 bg-emerald-500" aria-label="Hoy" />
            )}
          </span>

          <RegistroManual
            personas={personas}
            fechaInicial={fecha}
            esAdmin={sesion?.rol === "admin"}
          />
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* Registros del día                                          */}
      {/* ---------------------------------------------------------- */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-wash text-primary">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </span>
            <div>
              <h2 className="u-display text-xl font-bold text-ink">
                Registros del Día
              </h2>
              <p className="text-sm text-ink-muted">
                Jornada activa correspondiente a hoy
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="u-badge u-badge-success">
              <span className="u-dot" />
              En Tiempo Real
            </span>
            <span className="u-badge u-badge-neutral">
              {totales.conEntrada}/{totales.personas} con entrada
            </span>
            <span className="u-badge u-badge-neutral">
              {totales.conSalida} cerrados
            </span>
          </div>
        </div>

        <DiaPanel
          fecha={fecha}
          filas={filasDia}
          esAdmin={sesion?.rol === "admin"}
          fechaAnterior={sumarDias(fecha, -1)}
          fechaSiguiente={sumarDias(fecha, 1)}
        />
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Reporte general de la semana                               */}
      {/* ---------------------------------------------------------- */}
      <section>
        <ReporteTabla
          semana={reporte.lunes}
          rango={reporte.rango}
          filas={filasReporte}
          totalGeneral={{
            trabajadas: `${String(
              Math.floor(reporte.total.trabajadasMin / 60)
            ).padStart(2, "0")}:${String(reporte.total.trabajadasMin % 60).padStart(
              2,
              "0"
            )}`,
            extra: `${String(Math.floor(reporte.total.extraMin / 60)).padStart(
              2,
              "0"
            )}:${String(reporte.total.extraMin % 60).padStart(2, "0")}`,
            asistencias: reporte.total.asistencias,
            faltas: reporte.total.faltas,
          }}
          urlExportarExcel={`/api/admin/reporte/excel?semana=${reporte.lunes}`}
          urlExportarPDF={`/api/admin/reporte/pdf?semana=${reporte.lunes}`}
          esAdmin={sesion?.rol === "admin"}
        />
      </section>
    </div>
  );
}
