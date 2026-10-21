/**
 * /admin/horarios — configuración de jornadas y horarios especiales.
 */
import { obtenerSesion } from "@/server/auth";
import { obtenerJornadasColaboradores } from "@/server/horarios";
import { obtenerHorariosEspecialesDetallados } from "@/server/queries-admin";
import { HorarioEspecialForm } from "@/components/admin/horario-especial-form";
import { JornadasTabla } from "@/components/admin/jornadas-tabla";

export default async function HorariosPage() {
  const sesion = await obtenerSesion();
  const esAdmin = sesion?.rol === "admin";

  const jornadas = await obtenerJornadasColaboradores();
  const especiales = await obtenerHorariosEspecialesDetallados();

  const personas = jornadas.filas.map((f) => ({
    id: f.usuarioId,
    nombre: f.nombre,
    area: f.area,
  }));

  return (
    <div className="space-y-10">
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
          reglas={especiales.map((r) => ({
            id: r.id,
            usuarioId: r.usuarioId,
            nombre: r.nombre,
            diaSemana: r.diaSemana,
            entrada: r.entrada,
            salida: r.salida,
            vigenteDesde: r.vigenteDesde,
            vigenteHasta: r.vigenteHasta,
            activo: r.activo,
          }))}
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
        <h2 className="u-display mb-4 text-xl font-bold text-ink">
          Jornada por colaborador
        </h2>

        <JornadasTabla
          filas={jornadas.filas.map((f) => ({
            usuarioId: f.usuarioId,
            nombre: f.nombre,
            area: f.area,
            legajo: f.legajo,
            minutosComida: f.minutosComida,
            lunesAViernes: f.lunesAViernes,
            sabado: f.sabado,
            sabadoDescanso: f.sabadoDescanso,
            tieneEspeciales: f.tieneEspeciales,
          }))}
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
            horario del área.
          </p>
        </div>

        <HorarioEspecialForm
          reglas={especiales.map((r) => ({
            id: r.id,
            usuarioId: r.usuarioId,
            nombre: r.nombre,
            diaSemana: r.diaSemana,
            entrada: r.entrada,
            salida: r.salida,
            vigenteDesde: r.vigenteDesde,
            vigenteHasta: r.vigenteHasta,
            activo: r.activo,
          }))}
          personas={personas}
          esAdmin={esAdmin}
          mostrarTabla={true}
          mostrarBoton={false}
        />
      </section>
    </div>
  );
}
