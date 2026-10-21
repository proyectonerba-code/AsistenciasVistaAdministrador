"use client";

/**
 * Tabla de empleados con fila expandible: al desplegar se ve el detalle de
 * la semana (día por día) y los accesos a la ficha y al token NFC.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { formatoHorasLegible } from "@/lib/formato";

export interface EmpleadoFila {
  id: string;
  nombre: string;
  area: string;
  legajo: number | null;
  etiquetaNfc: string | null;
  correo: string;
  totalHoras: string;
  extra: string;
  asistencias: number;
  diasObjetivo: number;
  estado: string;
  nota: string | null;
  dias: {
    dia: string;
    fecha: string;
    entrada: string | null;
    salida: string | null;
    trabajadas: string;
    extra: string;
    estado: string;
  }[];
}

export interface EmpleadosTablaProps {
  filas: EmpleadoFila[];
  semana: string;
  esAdmin: boolean;
}

export function EmpleadosTabla({
  filas,
  semana,
  esAdmin,
}: EmpleadosTablaProps): JSX.Element {
  const [busqueda, setBusqueda] = useState("");
  const [filtroArea, setFiltroArea] = useState<"Todos" | "Oficina" | "Técnico">(
    "Todos"
  );
  const [abierto, setAbierto] = useState<string | null>(null);

  const areas = useMemo(
    () => ["Todos", "Oficina", "Técnico"] as const,
    []
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      if (filtroArea !== "Todos" && f.area !== filtroArea) return false;
      if (!q) return true;
      return (
        f.nombre.toLowerCase().includes(q) ||
        f.correo.toLowerCase().includes(q) ||
        (f.etiquetaNfc ?? "").toLowerCase().includes(q) ||
        (f.legajo ? String(f.legajo) : "").includes(q)
      );
    });
  }, [filas, busqueda, filtroArea]);

  return (
    <div className="space-y-4">
      {/* Buscador y filtros */}
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
            placeholder="Buscar empleado o ID NFC…"
            className="u-input pl-9"
            aria-label="Buscar empleado"
          />
        </div>

        <div className="flex items-center gap-2">
          {areas.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setFiltroArea(a)}
              className={`u-btn u-btn-sm ${
                filtroArea === a
                  ? "u-btn-primary"
                  : "u-btn-secondary"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="u-card overflow-hidden">
        <div className="overflow-x-auto u-scroll">
          <table className="u-table">
            <thead>
              <tr>
                <th>Empleado / Colaborador</th>
                <th>Tipo</th>
                <th>ID Tag NFC</th>
                <th>Total horas semana</th>
                <th className="text-right">Acción</th>
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

              {filtradas.map((f) => {
                const expandido = abierto === f.id;
                return (
                  <>
                    <tr
                      key={f.id}
                      className="cursor-pointer"
                      onClick={() => setAbierto(expandido ? null : f.id)}
                    >
                      <td className="max-w-[190px]">
                        <p
                          className="truncate font-semibold text-ink"
                          title={f.nombre}
                        >
                          {f.nombre}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {f.legajo ? `Legajo #${f.legajo}` : "Sin legajo"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="u-badge u-badge-neutral">
                          {f.area}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="u-mono inline-block rounded-md border border-line bg-surface-muted px-2 py-1 text-xs font-medium text-ink">
                          {f.etiquetaNfc
                            ? `#${f.etiquetaNfc}`
                            : "Sin etiqueta"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="u-mono tnum font-bold text-ink">
                          {formatoHorasLegible(f.totalHoras)}
                        </span>
                        {f.extra !== "0:00" && (
                          <p className="mt-0.5 text-xs font-semibold text-primary">
                            +{formatoHorasLegible(f.extra)} extra
                          </p>
                        )}
                        {f.nota && (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {f.nota}
                          </p>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          aria-label={expandido ? "Contraer" : "Expandir"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAbierto(expandido ? null : f.id);
                          }}
                          className="u-btn u-btn-ghost u-btn-sm"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`transition-transform ${
                              expandido ? "rotate-180" : ""
                            }`}
                            aria-hidden="true"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                      </td>
                    </tr>

                    {expandido && (
                      <tr key={`${f.id}-detalle`}>
                        <td colSpan={5} className="bg-canvas p-0">
                          <div className="p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <h3 className="u-display text-base font-bold text-ink">
                                Semana del {semana}
                              </h3>
                              <div className="flex gap-2">
                                <Link
                                  href={`/admin/personas/${f.id}?semana=${semana}`}
                                  className="u-btn u-btn-secondary u-btn-sm"
                                >
                                  Ver ficha completa
                                </Link>
                                {esAdmin && (
                                  <Link
                                    href={`/admin/horarios?empleado=${f.id}`}
                                    className="u-btn u-btn-secondary u-btn-sm"
                                  >
                                    Editar horario
                                  </Link>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 overflow-x-auto u-scroll">
                              <table className="u-table bg-surface rounded-lg overflow-hidden">
                                <thead>
                                  <tr>
                                    <th>Día</th>
                                    <th>Fecha</th>
                                    <th>Entrada</th>
                                    <th>Salida</th>
                                    <th>Trabajadas</th>
                                    <th>Extra</th>
                                    <th>Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {f.dias.map((d) => (
                                    <tr key={d.fecha}>
                                      <td className="font-medium">{d.dia}</td>
                                      <td className="u-mono tnum text-xs">
                                        {d.fecha}
                                      </td>
                                      <td className="u-mono tnum">
                                        {d.entrada ?? "—"}
                                      </td>
                                      <td className="u-mono tnum">
                                        {d.salida ?? "—"}
                                      </td>
                                      <td className="u-mono tnum font-semibold">
                                        {formatoHorasLegible(d.trabajadas)}
                                      </td>
                                      <td className="u-mono tnum">
                                        {d.extra === "0:00"
                                          ? "—"
                                          : `+${formatoHorasLegible(d.extra)}`}
                                      </td>
                                      <td>
                                        <EstadoBadge estado={d.estado} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
