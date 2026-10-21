"use client";

/**
 * Gestión de horarios especiales: alta, edición y baja de reglas por
 * persona, día de la semana y vigencia.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  eliminarHorarioEspecial,
  guardarHorarioEspecial,
} from "@/server/actions";

export interface ReglaEspecial {
  id: string;
  usuarioId: string;
  nombre: string;
  diaSemana: number;
  entrada: string;
  salida: string;
  vigenteDesde: string;
  vigenteHasta: string | null;
  activo: boolean;
}

export interface HorarioEspecialFormProps {
  reglas: ReglaEspecial[];
  personas: { id: string; nombre: string; area: string }[];
  esAdmin: boolean;
  /** Si es false, solo se pinta el botón + modal (la tabla va aparte). */
  mostrarTabla?: boolean;
  /** Si es false, no se pinta el botón (la tabla va aparte). */
  mostrarBoton?: boolean;
}

const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function HorarioEspecialForm({
  reglas,
  personas,
  esAdmin,
  mostrarTabla = true,
  mostrarBoton = true,
}: HorarioEspecialFormProps): JSX.Element {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<ReglaEspecial | null>(null);

  const [usuarioId, setUsuarioId] = useState(personas[0]?.id ?? "");
  const [diaSemana, setDiaSemana] = useState("6");
  const [entrada, setEntrada] = useState("09:00");
  const [salida, setSalida] = useState("15:00");
  const [vigenteDesde, setVigenteDesde] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [vigenteHasta, setVigenteHasta] = useState("");
  const [activo, setActivo] = useState(true);

  const [estado, setEstado] = useState<{ texto: string; error?: boolean } | null>(
    null
  );
  const [guardando, setGuardando] = useState(false);

  const abrirNuevo = () => {
    setEditando(null);
    setUsuarioId(personas[0]?.id ?? "");
    setDiaSemana("6");
    setEntrada("09:00");
    setSalida("15:00");
    setVigenteDesde(new Date().toISOString().slice(0, 10));
    setVigenteHasta("");
    setActivo(true);
    setEstado(null);
    setAbierto(true);
  };

  const abrirEdicion = (r: ReglaEspecial) => {
    setEditando(r);
    setUsuarioId(r.usuarioId);
    setDiaSemana(String(r.diaSemana));
    setEntrada(r.entrada);
    setSalida(r.salida);
    setVigenteDesde(r.vigenteDesde);
    setVigenteHasta(r.vigenteHasta ?? "");
    setActivo(r.activo);
    setEstado(null);
    setAbierto(true);
  };

  const guardar = async () => {
    setGuardando(true);
    setEstado(null);

    const resultado = await guardarHorarioEspecial({
      id: editando?.id,
      usuarioId,
      diaSemana: Number(diaSemana),
      entrada,
      salida,
      vigenteDesde,
      vigenteHasta: vigenteHasta.trim() === "" ? null : vigenteHasta,
      activo,
    });

    setGuardando(false);

    if (resultado.error) {
      setEstado({ texto: resultado.error, error: true });
      return;
    }

    setEstado({ texto: "Horario especial guardado." });
    router.refresh();
  };

  const eliminar = async (id: string) => {
    if (!window.confirm("¿Eliminar este horario especial?")) return;
    const resultado = await eliminarHorarioEspecial(id);
    if (resultado.error) {
      setEstado({ texto: resultado.error, error: true });
      return;
    }
    setEstado({ texto: "Horario especial eliminado." });
    router.refresh();
  };

  return (
    <>
      {mostrarBoton && (
        <button
          type="button"
          onClick={abrirNuevo}
          disabled={!esAdmin}
          className="u-btn u-btn-primary"
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
            aria-hidden="true"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Nuevo Horario Especial
        </button>
      )}

      {estado && !abierto && (
        <div
          role="status"
          className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${
            estado.error
              ? "border border-primary/20 bg-primary-wash text-primary"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {estado.texto}
        </div>
      )}

      {/* Tabla de reglas */}
      {mostrarTabla && (
        <div className="u-card overflow-hidden">
          <div className="overflow-x-auto u-scroll">
          <table className="u-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Día</th>
                <th>Horario</th>
                <th>Vigencia</th>
                <th>Estado</th>
                {esAdmin && <th className="text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {reglas.length === 0 && (
                <tr>
                  <td
                    colSpan={esAdmin ? 6 : 5}
                    className="py-10 text-center text-ink-muted"
                  >
                    No hay horarios especiales configurados.
                  </td>
                </tr>
              )}

              {reglas.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold text-ink">{r.nombre}</td>
                  <td>{DIAS[r.diaSemana]}</td>
                  <td className="u-mono tnum">
                    {r.entrada} - {r.salida}
                  </td>
                  <td className="text-xs text-ink-muted">
                    {r.vigenteDesde}
                    {r.vigenteHasta ? ` → ${r.vigenteHasta}` : " → sin límite"}
                  </td>
                  <td>
                    <span
                      className={`u-badge ${
                        r.activo ? "u-badge-success" : "u-badge-neutral"
                      }`}
                    >
                      <span className="u-dot" />
                      {r.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {esAdmin && (
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEdicion(r)}
                          className="u-btn u-btn-secondary u-btn-sm"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(r.id)}
                          className="u-btn u-btn-danger u-btn-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAbierto(false);
          }}
        >
          <div className="u-card animate-scale-in w-full max-w-lg rounded-b-none p-6 sm:rounded-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="u-display text-xl font-bold text-ink">
                  {editando ? "Editar horario especial" : "Nuevo horario especial"}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Horario por persona y día. Si hay varias reglas vigentes, gana
                  la más reciente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="u-btn u-btn-ghost u-btn-sm shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="he-persona"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Colaborador
                </label>
                <select
                  id="he-persona"
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                  className="u-input u-select"
                >
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — {p.area}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="he-dia"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Día de la semana
                </label>
                <select
                  id="he-dia"
                  value={diaSemana}
                  onChange={(e) => setDiaSemana(e.target.value)}
                  className="u-input u-select"
                >
                  {DIAS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="he-entrada"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Entrada
                  </label>
                  <input
                    id="he-entrada"
                    type="time"
                    step={60}
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                    className="u-input u-mono"
                  />
                </div>
                <div>
                  <label
                    htmlFor="he-salida"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Salida
                  </label>
                  <input
                    id="he-salida"
                    type="time"
                    step={60}
                    value={salida}
                    onChange={(e) => setSalida(e.target.value)}
                    className="u-input u-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="he-desde"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Vigente desde
                  </label>
                  <input
                    id="he-desde"
                    type="date"
                    value={vigenteDesde}
                    onChange={(e) => setVigenteDesde(e.target.value)}
                    className="u-input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="he-hasta"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Vigente hasta{" "}
                    <span className="font-normal text-ink-subtle">
                      (opcional)
                    </span>
                  </label>
                  <input
                    id="he-hasta"
                    type="date"
                    value={vigenteHasta}
                    onChange={(e) => setVigenteHasta(e.target.value)}
                    className="u-input"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-primary focus:ring-2 focus:ring-primary/25"
                />
                Regla activa
              </label>

              {estado && (
                <div
                  role="status"
                  className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                    estado.error
                      ? "border border-primary/20 bg-primary-wash text-primary"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {estado.texto}
                </div>
              )}
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="u-btn u-btn-secondary flex-1"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="u-btn u-btn-primary flex-1"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
