"use client";

/**
 * Tabla de jornadas por colaborador con buscador y filtro por área.
 *
 * El botón "Editar" abre el modal de configuración de horario.
 */
import { useMemo, useState } from "react";
import type { ColaboradorHorario } from "./horario-colaborador-form";

export type JornadaFila = ColaboradorHorario;

export interface JornadasTablaProps {
  filas: JornadaFila[];
  esAdmin: boolean;
  /** Abre el modal de configuración para el colaborador indicado. */
  onEditar: (usuarioId: string) => void;
}

export function JornadasTabla({
  filas,
  esAdmin,
  onEditar,
}: JornadasTablaProps): JSX.Element {
  const [busqueda, setBusqueda] = useState("");
  const [filtroArea, setFiltroArea] = useState<"Todos" | "Oficina" | "Técnico">(
    "Todos"
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      if (filtroArea !== "Todos" && f.area !== filtroArea) return false;
      if (!q) return true;
      return (
        f.nombre.toLowerCase().includes(q) ||
        (f.legajo ? String(f.legajo) : "").includes(q)
      );
    });
  }, [filas, busqueda, filtroArea]);

  return (
    <div className="space-y-4">
      <div className="u-card flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por empleado o tipo..."
            className="u-input pl-9"
            aria-label="Buscar empleado"
          />
        </div>

        <div className="flex items-center gap-2">
          {(["Todos", "Oficina", "Técnico"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setFiltroArea(a)}
              className={`u-btn u-btn-sm ${
                filtroArea === a ? "u-btn-primary" : "u-btn-secondary"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="u-card overflow-hidden">
        <div className="overflow-x-auto u-scroll">
          <table className="u-table u-table-compact">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Tipo</th>
                <th>Lunes a viernes</th>
                <th>Sábado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-ink-muted">
                    No se encontraron empleados con ese criterio.
                  </td>
                </tr>
              )}

              {filtradas.map((f) => (
                <tr key={f.id}>
                  <td className="max-w-[190px]">
                    <p
                      className="truncate font-semibold text-ink"
                      title={f.nombre}
                    >
                      {f.nombre}
                    </p>
                    {f.legajo && (
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Legajo #{f.legajo}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="u-badge u-badge-neutral">{f.area}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    <p className="u-mono tnum font-semibold text-ink">
                      {f.lunesAViernes}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {f.minutosComida} min comida
                    </p>
                  </td>
                  <td className="whitespace-nowrap">
                    {f.sabadoDescanso ? (
                      <span className="text-sm text-ink-subtle">Descanso</span>
                    ) : (
                      <span className="u-mono tnum font-semibold text-ink">
                        {f.sabado}
                      </span>
                    )}
                    {f.tieneEspeciales && (
                      <span className="u-badge u-badge-info mt-1">
                        Horario especial
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/admin/personas/${f.id}`}
                        className="u-btn u-btn-ghost u-btn-sm"
                        title="Ver la ficha de este colaborador"
                      >
                        Ficha
                      </a>
                      <button
                        type="button"
                        onClick={() => onEditar(f.id)}
                        disabled={!esAdmin}
                        className="u-btn u-btn-secondary u-btn-sm"
                        title={
                          esAdmin
                            ? "Configurar el horario de este colaborador"
                            : "Solo los administradores pueden configurar horarios"
                        }
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
