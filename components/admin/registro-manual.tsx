"use client";

/**
 * Modal de registro manual: el administrador captura (o corrige) la entrada y
 * la salida de una persona para una fecha concreta. Equivale a la hoja
 * "Registro Manual" del control de asistencia original.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarAjusteManualDirecto } from "@/server/actions";

export interface PersonaOpcion {
  id: string;
  nombre: string;
  area: string;
}

export interface RegistroManualProps {
  personas: PersonaOpcion[];
  fechaInicial: string;
  esAdmin: boolean;
}

export function RegistroManual({
  personas,
  fechaInicial,
  esAdmin,
}: RegistroManualProps): JSX.Element {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [usuarioId, setUsuarioId] = useState(personas[0]?.id ?? "");
  const [fecha, setFecha] = useState(fechaInicial);
  const [entrada, setEntrada] = useState("");
  const [salida, setSalida] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [estado, setEstado] = useState<{ texto: string; error?: boolean } | null>(
    null
  );
  const [guardando, setGuardando] = useState(false);

  const cerrar = () => {
    setAbierto(false);
    setEstado(null);
  };

  const guardar = async () => {
    if (!usuarioId) {
      setEstado({ texto: "Selecciona a la persona.", error: true });
      return;
    }

    setGuardando(true);
    setEstado(null);

    const resultado = await guardarAjusteManualDirecto({
      usuarioId,
      fecha,
      entrada: entrada.trim() || null,
      salida: salida.trim() || null,
      observaciones: observaciones.trim(),
    });

    setGuardando(false);

    if (resultado.error) {
      setEstado({ texto: resultado.error, error: true });
      return;
    }

    setEstado({ texto: "Registro manual guardado." });
    setEntrada("");
    setSalida("");
    setObservaciones("");
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        disabled={!esAdmin}
        className="u-btn u-btn-primary"
        title={
          esAdmin
            ? "Capturar o corregir una entrada o salida"
            : "Solo los administradores pueden registrar manualmente"
        }
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
        Registrar Manualmente
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Registro manual"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrar();
          }}
        >
          <div className="u-card animate-scale-in w-full max-w-lg rounded-b-none p-6 sm:rounded-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="u-display text-xl font-bold text-ink">
                  Registro manual
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Captura o corrige la jornada de una persona.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrar}
                aria-label="Cerrar"
                className="u-btn u-btn-ghost u-btn-sm shrink-0"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="rm-persona"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Trabajador
                </label>
                <select
                  id="rm-persona"
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
                  htmlFor="rm-fecha"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Fecha
                </label>
                <input
                  id="rm-fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="u-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="rm-entrada"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Entrada
                  </label>
                  <input
                    id="rm-entrada"
                    type="time"
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                    className="u-input u-mono"
                    step={60}
                  />
                </div>
                <div>
                  <label
                    htmlFor="rm-salida"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Salida
                  </label>
                  <input
                    id="rm-salida"
                    type="time"
                    value={salida}
                    onChange={(e) => setSalida(e.target.value)}
                    className="u-input u-mono"
                    step={60}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="rm-obs"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Observaciones
                </label>
                <textarea
                  id="rm-obs"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  placeholder="Motivo de la corrección…"
                  className="u-input h-auto py-2.5"
                />
              </div>

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
                onClick={cerrar}
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
                {guardando ? "Guardando…" : "Guardar registro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
