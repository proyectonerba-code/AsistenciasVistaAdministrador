"use client";

/**
 * Componente de presentación: tabla de registros del día.
 * Muestra la plantilla del diseño: empleado, tipo, hora de salida, total de
 * horas del día, origen de la marca y acción de edición.
 */
import { EstadoBadge, OrigenBadge } from "./estado-badge";
import { formatoHorasLegible } from "@/lib/formato";

export interface DiaFila {
  id: string;
  nombre: string;
  area: string;
  legajo: number | null;
  etiquetaNfc: string | null;
  entrada: string | null;
  salida: string | null;
  horasTrabajadas: string;
  horasExtra: string;
  estado: string;
  origen: string;
  observaciones: string;
  bruto: string;
  comida: string;
  jornada: string;
}

export interface ValoresEdicion {
  [usuarioId: string]: { entrada: string; salida: string };
}

export interface DiaTablaProps {
  fecha: string;
  filas: DiaFila[];
  valoresEdicion?: ValoresEdicion;
  editando?: string | null;
  onEditar?: (usuarioId: string) => void;
  onCancelar?: () => void;
  onCambioEntrada?: (usuarioId: string, valor: string) => void;
  onCambioSalida?: (usuarioId: string, valor: string) => void;
  onGuardarAjuste?: (
    usuarioId: string,
    fecha: string,
    entrada: string | null,
    salida: string | null,
    observaciones: string
  ) => void;
  esAdmin: boolean;
}

export function DiaTabla({
  fecha,
  filas,
  valoresEdicion = {},
  editando = null,
  onEditar,
  onCancelar,
  onCambioEntrada,
  onCambioSalida,
  onGuardarAjuste,
  esAdmin,
}: DiaTablaProps): JSX.Element {
  return (
    <div className="u-card overflow-hidden">
      <div className="overflow-x-auto u-scroll">
        <table className="u-table u-table-compact">
          <thead>
            <tr>
              <th>Empleado / Colaborador</th>
              <th>Tipo</th>
              <th>Hora salida</th>
              <th className="text-right">Total horas hoy</th>
              <th>Origen</th>
              <th className="text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-ink-muted">
                  No hay personas registradas en la hoja de usuarios.
                </td>
              </tr>
            )}

            {filas.map((fila) => {
              const enJornada = !fila.salida && !!fila.entrada;
              const edicion = valoresEdicion[fila.id] || {
                entrada: fila.entrada ?? "",
                salida: fila.salida ?? "",
              };
              const enEdicion = editando === fila.id;

              return (
                <tr
                  key={fila.id}
                  title={[
                    `Entrada: ${fila.entrada ?? "—"}`,
                    `Salida: ${fila.salida ?? "—"}`,
                    `En bruto: ${fila.bruto}`,
                    `Comida: ${fila.comida}`,
                    `Horas trabajadas: ${fila.horasTrabajadas}`,
                    `Horas extra: ${fila.horasExtra}`,
                    `Jornada: ${fila.jornada}`,
                    `Origen: ${fila.origen}`,
                    fila.observaciones ? `Notas: ${fila.observaciones}` : "",
                  ]
                    .filter(Boolean)
                    .join("\n")}
                >
                  <td className="max-w-[190px]">
                    <p
                      className="truncate font-semibold text-ink"
                      title={fila.nombre}
                    >
                      {fila.nombre}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {fila.legajo ? `Legajo #${fila.legajo}` : fila.area}
                      {fila.etiquetaNfc && (
                        <span className="ml-2 u-mono text-[11px] text-ink-subtle">
                          {fila.etiquetaNfc}
                        </span>
                      )}
                    </p>
                  </td>

                  <td className="whitespace-nowrap font-semibold text-ink">
                    {fila.area}
                  </td>

                  <td>
                    {enEdicion ? (
                      <input
                        type="text"
                        value={edicion.salida}
                        placeholder="HH:mm"
                        onChange={(e) =>
                          onCambioSalida?.(fila.id, e.target.value)
                        }
                        className="u-input u-mono h-9 w-20 text-center text-sm"
                      />
                    ) : enJornada ? (
                      <span className="u-badge u-badge-neutral">
                        En jornada activa
                      </span>
                    ) : fila.salida ? (
                      <span className="u-mono tnum font-semibold text-ink">
                        {fila.salida}
                      </span>
                    ) : (
                      <span className="u-mono tnum text-ink-subtle">—</span>
                    )}
                  </td>

                  <td className="whitespace-nowrap text-right">
                    <span className="u-mono tnum font-bold text-ink">
                      {formatoHorasLegible(fila.horasTrabajadas)}
                    </span>
                    {fila.horasExtra !== "0:00" && (
                      <span className="ml-2 text-xs font-semibold text-primary">
                        +{formatoHorasLegible(fila.horasExtra)}
                      </span>
                    )}
                  </td>

                  <td className="whitespace-nowrap">
                    <OrigenBadge origen={fila.origen} />
                    <div className="mt-1">
                      <EstadoBadge estado={fila.estado} />
                    </div>
                  </td>

                  <td className="text-right">
                    {enEdicion ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="text"
                          value={edicion.entrada}
                          placeholder="HH:mm"
                          onChange={(e) =>
                            onCambioEntrada?.(fila.id, e.target.value)
                          }
                          className="u-input u-mono h-9 w-20 text-center text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onGuardarAjuste?.(
                              fila.id,
                              fecha,
                              edicion.entrada || null,
                              edicion.salida || null,
                              ""
                            )
                          }
                          className="u-btn u-btn-primary u-btn-sm"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={onCancelar}
                          className="u-btn u-btn-ghost u-btn-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : esAdmin ? (
                      <button
                        type="button"
                        onClick={() => onEditar?.(fila.id)}
                        className="u-btn u-btn-secondary u-btn-sm"
                      >
                        Editar
                      </button>
                    ) : (
                      <span className="text-xs text-ink-subtle">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
