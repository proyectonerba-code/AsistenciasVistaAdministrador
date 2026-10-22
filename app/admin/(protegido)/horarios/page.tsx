/**
 * /admin/horarios — configuración de jornadas y horarios especiales.
 *
 * Server Component: carga los datos y se los pasa a la sección interactiva,
 * que es la que maneja el modal de "Configurar Horario".
 */
import { obtenerSesion } from "@/server/auth";
import { obtenerJornadasColaboradores } from "@/server/horarios";
import { obtenerHorariosEspecialesDetallados } from "@/server/queries-admin";
import {
  HorariosSeccion,
  type ReglaEspecial,
} from "@/components/admin/horarios-seccion";
import type { ColaboradorHorario } from "@/components/admin/horario-colaborador-form";

export default async function HorariosPage() {
  const sesion = await obtenerSesion();
  const esAdmin = sesion?.rol === "admin";

  const jornadas = await obtenerJornadasColaboradores();
  const especiales = await obtenerHorariosEspecialesDetallados();

  const colaboradores: ColaboradorHorario[] = jornadas.filas.map((f) => ({
    id: f.usuarioId,
    nombre: f.nombre,
    area: f.area as ColaboradorHorario["area"],
    legajo: f.legajo,
    minutosComida: f.minutosComida,
    lunesAViernes: f.lunesAViernes,
    sabado: f.sabado,
    sabadoDescanso: f.sabadoDescanso,
    tieneEspeciales: f.tieneEspeciales,
    especialLunesAViernes: f.especialLunesAViernes,
    especialSabado: f.especialSabado,
    jornadaInicio: f.jornadaInicio,
    jornadaFin: f.jornadaFin,
    sabadoTrabaja: f.sabadoTrabaja,
    sabadoInicio: f.sabadoInicio,
    sabadoFin: f.sabadoFin,
    sabadoMinutosComida: f.sabadoMinutosComida,
    areaInicio: f.areaInicio,
    areaFin: f.areaFin,
    areaSabadoInicio: f.areaSabadoInicio,
    areaSabadoFin: f.areaSabadoFin,
    areaSabadoDescanso: f.areaSabadoDescanso,
  }));

  const reglas: ReglaEspecial[] = especiales.map((r) => ({
    id: r.id,
    usuarioId: r.usuarioId,
    nombre: r.nombre,
    diaSemana: r.diaSemana,
    entrada: r.entrada,
    salida: r.salida,
    vigenteDesde: r.vigenteDesde,
    vigenteHasta: r.vigenteHasta,
    activo: r.activo,
  }));

  return (
    <div className="space-y-10">
      <HorariosSeccion
        esAdmin={esAdmin}
        colaboradores={colaboradores}
        especiales={reglas}
      />
    </div>
  );
}
