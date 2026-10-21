/**
 * /admin/empleados — catálogo de trabajadores con su carga semanal.
 */
import Link from "next/link";
import { obtenerSesion } from "@/server/auth";
import { obtenerDetalleSemanaEmpleados } from "@/server/empleados";
import { obtenerUsuarios } from "@/server/queries-admin";
import { EmpleadosTabla } from "@/components/admin/empleados-tabla";
import { EmpleadoForm } from "@/components/admin/empleado-form";
import { fechaLocal, ahoraMx, sumarDias } from "@/lib/tz";
import { z } from "zod";

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Lunes de la semana de hoy. */
function lunesDeHoy(): string {
  const hoy = fechaLocal(ahoraMx());
  const d = new Date(`${hoy}T12:00:00Z`);
  const dia = d.getUTCDay();
  const ajuste = dia === 0 ? -6 : 1 - dia;
  d.setUTCDate(d.getUTCDate() + ajuste);
  return d.toISOString().slice(0, 10);
}

function textoSemana(lunes: string): string {
  const sabado = sumarDias(lunes, 5);
  const f = (s: string) =>
    new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${s}T12:00:00Z`));
  return `${f(lunes)} al ${f(sabado)}`;
}

export default async function EmpleadosPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; empleado?: string }>;
}) {
  const sesion = await obtenerSesion();
  const params = await searchParams;

  const valido = FechaSchema.safeParse(params.semana);
  const lunes = valido.success ? valido.data : lunesDeHoy();

  const detalle = await obtenerDetalleSemanaEmpleados(
    new Date(`${lunes}T12:00:00Z`)
  );
  const usuarios = await obtenerUsuarios(true);

  const esAdmin = sesion?.rol === "admin";
  const empleadoId = params.empleado;
  const empleado = empleadoId
    ? usuarios.find((u) => u.id === empleadoId)
    : undefined;

  const filas = detalle.filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    area: f.area,
    legajo: f.legajo,
    etiquetaNfc: f.etiquetaNfc,
    correo: f.correo,
    totalHoras: `${String(Math.floor(f.totalHorasMin / 60)).padStart(2, "0")}:${String(
      f.totalHorasMin % 60
    ).padStart(2, "0")}`,
    extra: `${String(Math.floor(f.extraMin / 60)).padStart(2, "0")}:${String(
      f.extraMin % 60
    ).padStart(2, "0")}`,
    asistencias: f.asistencias,
    diasObjetivo: f.diasObjetivo,
    estado: f.estado,
    nota: f.nota,
    dias: f.dias,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="u-display text-3xl font-extrabold leading-tight text-ink lg:text-4xl">
            Empleados
          </h1>
          <p className="mt-2 text-ink-muted">
            Supervisión de asistencia semanal y horas por colaborador.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/admin/empleados/csv?semana=${lunes}`}
            className="u-btn u-btn-secondary"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Exportar CSV
          </a>

          {empleado ? (
            <EmpleadoForm
              empleadoId={empleado.id}
              esAdmin={esAdmin}
              valoresIniciales={{
                nombre: empleado.nombre,
                correo: empleado.correo,
                area: empleado.area,
                minutosComida: empleado.minutosComida,
                legajo: empleado.legajo,
                etiquetaNfc: empleado.etiquetaNfc,
                activo: empleado.activo,
              }}
            />
          ) : (
            <EmpleadoForm esAdmin={esAdmin} />
          )}
        </div>
      </header>

      {/* Selector de semana */}
      <div className="u-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/empleados?semana=${sumarDias(lunes, -7)}`}
            className="u-btn u-btn-ghost u-btn-sm"
          >
            ← Semana Anterior
          </Link>
          <span className="u-btn u-btn-secondary u-btn-sm cursor-default">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {textoSemana(lunes)}
          </span>
          <Link
            href={`/admin/empleados?semana=${sumarDias(lunes, 7)}`}
            className="u-btn u-btn-ghost u-btn-sm"
          >
            Semana Siguiente →
          </Link>
          <Link
            href="/admin/empleados"
            className="u-btn u-btn-danger u-btn-sm"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Semana Actual
          </Link>
        </div>

        <span className="u-badge u-badge-neutral">
          {filas.length} empleado{filas.length === 1 ? "" : "s"}
        </span>
      </div>

      <EmpleadosTabla
        filas={filas}
        semana={lunes}
        esAdmin={esAdmin}
      />
    </div>
  );
}
