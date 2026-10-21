/**
 * /admin/pendientes — entradas abiertas (sin salida registrada).
 * Equivale a la hoja "Pendientes" del control de asistencia original.
 */
import { obtenerPendientes } from "@/server/queries-admin";
import { fechaLocal, ahoraMx } from "@/lib/tz";
import { z } from "zod";
import Link from "next/link";
import { OrigenBadge } from "@/components/ui/estado-badge";

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const MOTIVOS = {
  entrada: "Entrada registrada",
  salida: "Salida registrada",
} as const;

export default async function PendientesPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const params = await searchParams;

  const hoy = fechaLocal(ahoraMx());
  const valido = FechaSchema.safeParse(params.fecha);
  const fecha = valido.success ? valido.data : hoy;

  const pendientes = await obtenerPendientes(fecha);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="u-display text-3xl font-extrabold leading-tight text-ink lg:text-4xl">
            Pendientes
          </h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            Personas que registraron su entrada pero todavía no han registrado
            la salida. La entrada nunca se cierra sola.
          </p>
        </div>

        <div className="u-card flex flex-wrap items-center gap-2 p-3">
          <Link
            href="/admin/pendientes"
            className="u-btn u-btn-secondary u-btn-sm"
          >
            Hoy
          </Link>
          <form action="/admin/pendientes" method="get">
            <input
              type="date"
              name="fecha"
              defaultValue={fecha}
              className="u-input h-9 w-auto text-sm"
              aria-label="Fecha"
            />
          </form>
          <span className="u-badge u-badge-warning">
            {pendientes.length} abierta{pendientes.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      <div className="u-card overflow-hidden">
        <div className="overflow-x-auto u-scroll">
          <table className="u-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Área</th>
                <th>Fecha</th>
                <th>Hora entrada</th>
                <th>Marcas</th>
                <th>Origen</th>
                <th className="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-ink-muted">
                    No hay entradas pendientes para esta fecha. Todo cerrado.
                  </td>
                </tr>
              )}

              {pendientes.map((p) => (
                <tr key={`${p.usuarioId}-${p.fecha}`}>
                  <td>
                    <p className="font-semibold text-ink">{p.nombre}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{p.correo}</p>
                  </td>
                  <td className="font-semibold text-ink">{p.area}</td>
                  <td className="u-mono tnum text-sm">{p.fecha}</td>
                  <td>
                    <span className="u-badge u-badge-warning">
                      <span className="u-dot" />
                      {p.entrada}
                    </span>
                  </td>
                  <td className="u-mono tnum">{p.marcas}</td>
                  <td>
                    <OrigenBadge origen={p.origen} />
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/admin/asistencia?fecha=${p.fecha}`}
                      className="u-btn u-btn-secondary u-btn-sm"
                    >
                      Registrar salida
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink-subtle">
        {MOTIVOS.entrada} · {MOTIVOS.salida}. El cierre siempre lo hace una
        persona: nunca se completa automáticamente una entrada de otro día.
      </p>
    </div>
  );
}
