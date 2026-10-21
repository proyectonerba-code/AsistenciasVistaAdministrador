/**
 * Componente de presentación puro: tabla de reporte semanal.
 */
import { formatoHorasLegible } from "@/lib/formato";

export type EstadoCumplimiento = "CUMPLIDO" | "PENDIENTE" | "INCIDENCIA";

export interface ReporteFila {
  id: string;
  nombre: string;
  area: string;
  trabajadas: string;
  extra: string;
  asistencias: number;
  faltas: number;
  /** Días laborables objetivo de la semana (lunes a sábado, o 5 si aún no llegó el sábado). */
  diasObjetivo: number;
  estado: EstadoCumplimiento;
  /** Nota corta bajo "días cumplidos" (p. ej. "Sáb. pendiente"). */
  nota?: string | null;
}

export interface ReporteTablaProps {
  semana: string;
  rango: string;
  filas: ReporteFila[];
  totalGeneral: {
    trabajadas: string;
    extra: string;
    asistencias: number;
    faltas: number;
  };
  urlExportarExcel?: string;
  urlExportarPDF?: string;
  esAdmin: boolean;
}

function BadgeEstado({ estado }: { estado: EstadoCumplimiento }): JSX.Element {
  const clases: Record<EstadoCumplimiento, string> = {
    CUMPLIDO: "u-badge-success",
    PENDIENTE: "u-badge-warning",
    INCIDENCIA: "u-badge-info",
  };
  return (
    <span className={`u-badge ${clases[estado]}`}>
      <span className="u-dot" />
      {estado}
    </span>
  );
}

export function ReporteTabla({
  semana,
  rango,
  filas,
  totalGeneral,
  urlExportarExcel,
  urlExportarPDF,
  esAdmin,
}: ReporteTablaProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="u-display text-2xl font-bold text-ink">
            Reporte General de la Semana
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{rango}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="u-badge u-badge-neutral">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            Total horas semana:{" "}
            <span className="u-mono tnum">{formatoHorasLegible(totalGeneral.trabajadas)}</span>
          </span>
          <span className="u-badge u-badge-success">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m3 17 6-6 4 4 8-8" />
              <path d="M14 7h7v7" />
            </svg>
            Total horas extra:{" "}
            <span className="u-mono tnum">+{formatoHorasLegible(totalGeneral.extra)}</span>
          </span>
          {esAdmin && urlExportarPDF && (
            <a
              href={urlExportarPDF}
              className="u-btn u-btn-secondary u-btn-sm"
              target="_blank"
              rel="noreferrer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 9V2h12v7" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" rx="1" />
              </svg>
              Imprimir Reporte General
            </a>
          )}
          {esAdmin && urlExportarExcel && (
            <a
              href={urlExportarExcel}
              className="u-btn u-btn-secondary u-btn-sm"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              Exportar Excel
            </a>
          )}
        </div>
      </div>

      <div className="u-card overflow-hidden">
        <div className="overflow-x-auto u-scroll">
          <table className="u-table u-table-compact">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Tipo</th>
                <th className="text-right">Horas ordinarias</th>
                <th>Horas extra</th>
                <th>Días cumplidos</th>
                <th>Estado / Cumplimiento</th>
                <th className="text-right">Ficha</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <td className="max-w-[190px]">
                    <p
                      className="truncate font-semibold text-ink"
                      title={f.nombre}
                    >
                      {f.nombre}
                    </p>
                    {f.faltas > 0 && (
                      <p className="mt-0.5 text-xs font-medium text-primary">
                        {f.faltas} falta{f.faltas > 1 ? "s" : ""}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap font-semibold text-ink">
                    {f.area}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <span className="u-mono tnum font-bold text-ink">
                      {formatoHorasLegible(f.trabajadas)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    {f.extra !== "0:00" ? (
                      <span className="u-badge u-badge-danger">
                        +{formatoHorasLegible(f.extra)}
                      </span>
                    ) : (
                      <span className="u-mono tnum text-ink-subtle">0.0h</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="u-mono tnum font-bold text-ink">
                      {f.asistencias} / {f.diasObjetivo}
                    </span>
                    {f.nota && (
                      <p className="mt-0.5 text-xs font-medium text-warning">
                        {f.nota}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <BadgeEstado estado={f.estado} />
                  </td>
                  <td className="text-right">
                    <a
                      href={`/admin/personas/${f.id}?semana=${semana}`}
                      className="u-btn u-btn-secondary u-btn-sm"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 9V2h12v7" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" rx="1" />
                      </svg>
                      Imprimir Ficha
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-ink text-white">
                <td className="font-bold" colSpan={2}>
                  TOTAL GENERAL
                </td>
                <td className="u-mono tnum font-bold">
                  {formatoHorasLegible(totalGeneral.trabajadas)}
                </td>
                <td className="u-mono tnum font-bold">
                  +{formatoHorasLegible(totalGeneral.extra)}
                </td>
                <td className="u-mono tnum font-bold">{totalGeneral.asistencias}</td>
                <td className="u-mono tnum font-bold">{totalGeneral.faltas}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
