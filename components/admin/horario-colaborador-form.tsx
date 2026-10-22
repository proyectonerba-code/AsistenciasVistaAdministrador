"use client";

/**
 * Modal "Configurar Horario" de un colaborador.
 *
 * Permite definir, por persona:
 *  - Tipo de empleado (Oficina / Técnico / Sin asignar)
 *  - Jornada de lunes a viernes (entrada, salida, receso)
 *  - Jornada del sábado (si trabaja, entrada, salida y receso)
 *
 * La jornada propia pisa a la del área; el resto del panel sigue igual.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarHorarioColaborador } from "@/server/actions";

export type AreaEmpleado = "Oficina" | "Técnico" | "Sin asignar";

export interface ColaboradorHorario {
  id: string;
  nombre: string;
  area: AreaEmpleado;
  legajo: number | null;
  minutosComida: number;
  /** "09:00 - 19:00". */
  lunesAViernes: string;
  /** "09:00 - 15:00" o "Descanso". */
  sabado: string;
  sabadoDescanso: boolean;
  /** Tiene reglas de horario especial vigentes. */
  tieneEspeciales: boolean;
  /** Jornada que está aplicando de verdad por las reglas especiales. */
  especialLunesAViernes: string | null;
  especialSabado: string | null;
  jornadaInicio: string | null;
  jornadaFin: string | null;
  sabadoTrabaja: boolean | null;
  sabadoInicio: string | null;
  sabadoFin: string | null;
  sabadoMinutosComida: number;
  /** Jornada que el área tiene por defecto, para sugerirla al abrir. */
  areaInicio: string;
  areaFin: string;
  areaSabadoInicio: string;
  areaSabadoFin: string;
  areaSabadoDescanso: boolean;
}

export interface HorarioColaboradorFormProps {
  colaboradores: ColaboradorHorario[];
  esAdmin: boolean;
  /** El modal se muestra cuando está en true. */
  abierto: boolean;
  /** Colaborador seleccionado en el modal. */
  usuarioId: string | null;
  onCerrar: () => void;
}

const AREAS: AreaEmpleado[] = ["Oficina", "Técnico", "Sin asignar"];

/** Opciones de receso: "Sin receso" = 0 minutos. */
const RECESOS = [
  { valor: 0, etiqueta: "Sin receso" },
  { valor: 30, etiqueta: "30 minutos" },
  { valor: 60, etiqueta: "1 hora" },
  { valor: 90, etiqueta: "1 hora 30 min" },
  { valor: 120, etiqueta: "2 horas" },
];

function aHHmm(valor: string | null): string {
  return valor && valor.length >= 5 ? valor.slice(0, 5) : "";
}

export function HorarioColaboradorForm({
  colaboradores,
  esAdmin,
  abierto,
  usuarioId,
  onCerrar,
}: HorarioColaboradorFormProps): JSX.Element {
  const router = useRouter();
  const [area, setArea] = useState<AreaEmpleado>("Oficina");
  const [minutosComida, setMinutosComida] = useState(60);
  const [jornadaInicio, setJornadaInicio] = useState("09:00");
  const [jornadaFin, setJornadaFin] = useState("19:00");
  const [sabadoTrabaja, setSabadoTrabaja] = useState(false);
  const [sabadoInicio, setSabadoInicio] = useState("09:00");
  const [sabadoFin, setSabadoFin] = useState("15:00");
  const [sabadoMinutosComida, setSabadoMinutosComida] = useState(0);
  const [estado, setEstado] = useState<{ texto: string; error?: boolean } | null>(
    null
  );
  const [guardando, setGuardando] = useState(false);

  const actual = useMemo(
    () => colaboradores.find((c) => c.id === usuarioId),
    [colaboradores, usuarioId]
  );

  /** Carga en el formulario los valores del colaborador elegido. */
  const cargar = (c: ColaboradorHorario | undefined) => {
    if (!c) return;
    setArea(c.area);
    setMinutosComida(c.minutosComida);
    setJornadaInicio(aHHmm(c.jornadaInicio) || c.areaInicio);
    setJornadaFin(aHHmm(c.jornadaFin) || c.areaFin);
    setSabadoTrabaja(
      c.sabadoTrabaja === null ? !c.areaSabadoDescanso : c.sabadoTrabaja
    );
    setSabadoInicio(aHHmm(c.sabadoInicio) || c.areaSabadoInicio);
    setSabadoFin(aHHmm(c.sabadoFin) || c.areaSabadoFin);
    setSabadoMinutosComida(c.sabadoMinutosComida);
    setEstado(null);
  };

  // Al abrir el modal o cambiar de colaborador, se recarga el formulario.
  useEffect(() => {
    if (!abierto) return;
    cargar(actual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, abierto]);

  const cerrar = () => {
    setEstado(null);
    onCerrar();
  };

  const guardar = async () => {
    if (!usuarioId) {
      setEstado({ texto: "Selecciona a un colaborador.", error: true });
      return;
    }

    setGuardando(true);
    setEstado(null);

    const resultado = await guardarHorarioColaborador({
      usuarioId,
      area,
      minutosComida,
      jornadaInicio,
      jornadaFin,
      sabadoTrabaja,
      sabadoInicio: sabadoTrabaja ? sabadoInicio : null,
      sabadoFin: sabadoTrabaja ? sabadoFin : null,
      sabadoMinutosComida: sabadoTrabaja ? sabadoMinutosComida : 0,
    });

    setGuardando(false);

    if (resultado.error) {
      setEstado({ texto: resultado.error, error: true });
      return;
    }

    setEstado({ texto: "Horario guardado." });
    router.refresh();
  };

  if (!abierto) return <></>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Configurar horario"
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div className="u-card animate-scale-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-2xl sm:p-7">
        {/* ------------------------------------------------- */}
        {/* Encabezado                                        */}
        {/* ------------------------------------------------- */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="u-display text-xl font-bold text-ink">
              Configurar Horario: {actual?.nombre ?? "—"}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Define los parámetros de jornada laboral para el colaborador.
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
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {/* --------------------------------------------- */}
          {/* Colaborador                                  */}
          {/* --------------------------------------------- */}
          <div>
            <label
              htmlFor="hc-colaborador"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Colaborador
            </label>
            <select
              id="hc-colaborador"
              value={usuarioId ?? ""}
              onChange={(e) => cargar(colaboradores.find((c) => c.id === e.target.value))}
              className="u-input u-select"
            >
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.area})
                </option>
              ))}
            </select>
          </div>

          {actual?.tieneEspeciales && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
              <p className="font-semibold">Este colaborador tiene reglas de horario especial vigentes.</p>
              <p className="mt-1">
                {actual.especialLunesAViernes && (
                  <>
                    Lunes a viernes:{" "}
                    <span className="u-mono tnum font-semibold">
                      {actual.especialLunesAViernes}
                    </span>
                    .{" "}
                  </>
                )}
                {actual.especialSabado && (
                  <>
                    Sábado:{" "}
                    <span className="u-mono tnum font-semibold">
                      {actual.especialSabado}
                    </span>
                    .{" "}
                  </>
                )}
                Esas reglas tienen prioridad sobre la jornada que guardes aquí.
              </p>
            </div>
          )}

          {/* --------------------------------------------- */}
          {/* Tipo de empleado                             */}
          {/* --------------------------------------------- */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Tipo de Empleado
            </span>
            <div className="grid grid-cols-2 gap-2">
              {AREAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArea(a)}
                  className={`u-btn ${
                    area === a ? "u-btn-primary" : "u-btn-secondary"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">
              El tipo define el horario por defecto del área. Lo que guardes
              aquí aplica solo a este colaborador.
            </p>
          </div>

          {/* --------------------------------------------- */}
          {/* Horario lunes a viernes                      */}
          {/* --------------------------------------------- */}
          <section>
            <h3 className="u-display mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Horario lunes a viernes
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="hc-lv-inicio"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Hora de Entrada
                </label>
                <input
                  id="hc-lv-inicio"
                  type="time"
                  value={jornadaInicio}
                  onChange={(e) => setJornadaInicio(e.target.value)}
                  className="u-input u-mono"
                  step={60}
                />
              </div>
              <div>
                <label
                  htmlFor="hc-lv-fin"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Hora de Salida
                </label>
                <input
                  id="hc-lv-fin"
                  type="time"
                  value={jornadaFin}
                  onChange={(e) => setJornadaFin(e.target.value)}
                  className="u-input u-mono"
                  step={60}
                />
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor="hc-comida"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Tiempo de Comida / Descanso
              </label>
              <select
                id="hc-comida"
                value={minutosComida}
                onChange={(e) => setMinutosComida(Number(e.target.value))}
                className="u-input u-select"
              >
                {RECESOS.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* --------------------------------------------- */}
          {/* Horario del sábado                          */}
          {/* --------------------------------------------- */}
          <section>
            <h3 className="u-display mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Horario día sábado
            </h3>

            <label className="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
              <input
                id="hc-sabado-trabaja"
                type="checkbox"
                checked={sabadoTrabaja}
                onChange={(e) => setSabadoTrabaja(e.target.checked)}
                className="h-4 w-4 accent-[rgb(var(--primary))]"
              />
              ¿Trabaja los sábados?
            </label>

            {sabadoTrabaja && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="hc-sab-inicio"
                      className="mb-1.5 block text-sm font-medium text-ink"
                    >
                      Entrada Sábado
                    </label>
                    <input
                      id="hc-sab-inicio"
                      type="time"
                      value={sabadoInicio}
                      onChange={(e) => setSabadoInicio(e.target.value)}
                      className="u-input u-mono"
                      step={60}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="hc-sab-fin"
                      className="mb-1.5 block text-sm font-medium text-ink"
                    >
                      Salida Sábado
                    </label>
                    <input
                      id="hc-sab-fin"
                      type="time"
                      value={sabadoFin}
                      onChange={(e) => setSabadoFin(e.target.value)}
                      className="u-input u-mono"
                      step={60}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="hc-sab-comida"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Comida / Descanso Sábado
                  </label>
                  <select
                    id="hc-sab-comida"
                    value={sabadoMinutosComida}
                    onChange={(e) =>
                      setSabadoMinutosComida(Number(e.target.value))
                    }
                    className="u-input u-select"
                  >
                    {RECESOS.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </section>

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

        {/* ------------------------------------------------- */}
        {/* Acciones                                        */}
        {/* ------------------------------------------------- */}
        <div className="mt-7 flex gap-3">
          <button
            type="button"
            onClick={cerrar}
            className="u-btn u-btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || !esAdmin}
            className="u-btn u-btn-primary flex-1"
          >
            {guardando ? "Guardando…" : "Guardar Horario"}
          </button>
        </div>
      </div>
    </div>
  );
}
