"use client";

/**
 * Sección interactiva de /admin/horarios.
 *
 * El estado del modal vive aquí (cliente) porque la página es un Server
 * Component: los datos llegan ya resueltos desde el servidor.
 */
import { useState } from "react";
import { HorarioEspecialForm } from "./horario-especial-form";
import { JornadasTabla } from "./jornadas-tabla";
import {
  HorarioColaboradorForm,
  type ColaboradorHorario,
} from "./horario-colaborador-form";

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

export interface HorariosSeccionProps {
  esAdmin: boolean;
  colaboradores: ColaboradorHorario[];
  especiales: ReglaEspecial[];
}

export function HorariosSeccion({
  esAdmin,
  colaboradores,
  especiales,
}: HorariosSeccionProps): JSX.Element {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioIdModal, setUsuarioIdModal] = useState<string | null>(
    colaboradores[0]?.id ?? null
  );

  const abrirModal = (usuarioId: string) => {
    setUsuarioIdModal(usuarioId);
    setModalAbierto(true);
  };

  const personas = colaboradores.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    area: c.area,
  }));

  return (
    <>
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="u-display text-3xl font-extrabold leading-tight text-ink lg:text-4xl">
            Configuración de Horarios
          </h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            Define la jornada laboral, descansos y tolerancia para cada
            colaborador.
          </p>
        </div>

        <HorarioEspecialForm
          reglas={especiales}
          personas={personas}
          esAdmin={esAdmin}
          mostrarTabla={false}
          mostrarBoton={true}
        />
      </header>

      {/* ------------------------------------------------------- */}
      {/* Jornada por colaborador                                 */}
      {/* ------------------------------------------------------- */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="u-display text-xl font-bold text-ink">
            Jornada por colaborador
          </h2>
          <button
            type="button"
            onClick={() =>
              abrirModal(usuarioIdModal ?? colaboradores[0]?.id ?? "")
            }
            disabled={!esAdmin || colaboradores.length === 0}
            className="u-btn u-btn-primary"
            title={
              esAdmin
                ? "Configurar la jornada de un colaborador"
                : "Solo los administradores pueden configurar horarios"
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
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            Configurar Horario
          </button>
        </div>

        <JornadasTabla
          filas={colaboradores}
          esAdmin={esAdmin}
          onEditar={abrirModal}
        />
      </section>

      {/* ------------------------------------------------------- */}
      {/* Horarios especiales                                    */}
      {/* ------------------------------------------------------- */}
      <section>
        <div className="mb-4">
          <h2 className="u-display text-xl font-bold text-ink">
            Horarios especiales
          </h2>
          <p className="text-sm text-ink-muted">
            Reglas por persona, día y vigencia. Tienen prioridad sobre el
            horario del área y sobre la jornada propia del colaborador.
          </p>
        </div>

        <HorarioEspecialForm
          reglas={especiales}
          personas={personas}
          esAdmin={esAdmin}
          mostrarTabla={true}
          mostrarBoton={false}
        />
      </section>

      <HorarioColaboradorForm
        colaboradores={colaboradores}
        esAdmin={esAdmin}
        abierto={modalAbierto}
        usuarioId={usuarioIdModal}
        onCerrar={() => setModalAbierto(false)}
      />
    </>
  );
}
