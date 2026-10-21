/**
 * Componente de presentación puro: bloques por semana de una persona.
 * La semana más reciente aparece arriba.
 */
import { EstadoBadge } from "./estado-badge";
import { formatoHorasLegible } from "@/lib/formato";

export interface SemanaPersona {
  lunes: string;
  dias: {
    fecha: string;
    dia: string;
    entrada: string | null;
    salida: string | null;
    bruto: string;
    comida: string;
    trabajadas: string;
    extra: string;
    estado: string;
    notas: string;
  }[];
  totales: {
    trabajadas: string;
    comida: string;
    extra: string;
    extraTraida: string;
    extraASiguiente: string;
    asistencias: number;
    faltas: number;
    incidencias: string[];
  };
}

export interface PersonaSemanaProps {
  semanas: SemanaPersona[];
}

export function PersonaSemana({ semanas }: PersonaSemanaProps): JSX.Element {
  if (semanas.length === 0) {
    return (
      <div className="u-card p-10 text-center text-ink-muted">
        Esta persona todavía no tiene registros.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {semanas.map((semana) => (
        <section key={semana.lunes} className="u-card overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink px-5 py-3.5">
            <h3 className="u-display text-sm font-bold uppercase tracking-wider text-white">
              Semana del {semana.lunes}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="u-badge u-badge-success">
                <span className="u-dot" />
                {semana.totales.asistencias} asistencia
                {semana.totales.asistencias === 1 ? "" : "s"}
              </span>
              {semana.totales.faltas > 0 && (
                <span className="u-badge u-badge-danger">
                  <span className="u-dot" />
                  {semana.totales.faltas} falta
                  {semana.totales.faltas === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </header>

          <div className="overflow-x-auto u-scroll">
            <table className="u-table">
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Fecha</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>En bruto</th>
                  <th>Comida</th>
                  <th>Trabajadas</th>
                  <th>Extra</th>
                  <th>Estado</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {semana.dias.map((d) => (
                  <tr key={d.fecha}>
                    <td className="font-medium text-ink">{d.dia}</td>
                    <td className="u-mono tnum text-xs">{d.fecha}</td>
                    <td className="u-mono tnum">{d.entrada ?? "—"}</td>
                    <td className="u-mono tnum">{d.salida ?? "—"}</td>
                    <td className="u-mono tnum text-ink-muted">
                      {d.bruto === "00:00" ? "—" : d.bruto}
                    </td>
                    <td className="u-mono tnum text-ink-muted">
                      {d.comida === "00:00" ? "—" : d.comida}
                    </td>
                    <td className="u-mono tnum font-bold text-ink">
                      {d.trabajadas === "00:00" ? "—" : d.trabajadas}
                    </td>
                    <td className="u-mono tnum">
                      {d.extra === "00:00" ? (
                        <span className="text-ink-subtle">—</span>
                      ) : (
                        <span className="font-bold text-primary">
                          +{d.extra}
                        </span>
                      )}
                    </td>
                    <td>
                      <EstadoBadge estado={d.estado} />
                    </td>
                    <td className="max-w-sm text-xs text-ink-muted">
                      {d.notas || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-ink text-white">
                  <td className="font-bold" colSpan={4}>
                    TOTALES DE LA SEMANA
                  </td>
                  <td className="u-mono tnum font-bold">{semana.totales.trabajadas}</td>
                  <td className="u-mono tnum font-bold">{semana.totales.comida}</td>
                  <td className="u-mono tnum font-bold">{semana.totales.trabajadas}</td>
                  <td className="u-mono tnum font-bold">
                    +{semana.totales.extra}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          <footer className="space-y-2 border-t border-line bg-canvas px-5 py-4 text-xs text-ink-muted">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                Horas trabajadas:{" "}
                <span className="u-mono tnum font-bold text-ink">
                  {formatoHorasLegible(semana.totales.trabajadas)}
                </span>
              </span>
              <span>
                Extra total:{" "}
                <span className="u-mono tnum font-bold text-primary">
                  +{formatoHorasLegible(semana.totales.extra)}
                </span>
              </span>
              <span>
                Extra traída del sábado anterior:{" "}
                <span className="u-mono tnum font-bold text-ink">
                  {formatoHorasLegible(semana.totales.extraTraida)}
                </span>
              </span>
              <span>
                Pasa a la semana siguiente:{" "}
                <span className="u-mono tnum font-bold text-ink">
                  {formatoHorasLegible(semana.totales.extraASiguiente)}
                </span>
              </span>
            </div>

            {semana.totales.incidencias.length > 0 && (
              <ul className="mt-2 space-y-1">
                {semana.totales.incidencias.map((inc, i) => (
                  <li key={i} className="flex gap-2 text-warning">
                    <span aria-hidden="true">•</span>
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            )}
          </footer>
        </section>
      ))}
    </div>
  );
}
