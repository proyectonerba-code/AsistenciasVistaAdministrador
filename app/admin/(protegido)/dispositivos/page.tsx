/**
 * /admin/dispositivos — celulares y tablets asignados a cada colaborador.
 */
import { obtenerSesion } from "@/server/auth";
import { obtenerDispositivos } from "@/server/queries-admin";
import { DispositivosTabla } from "@/components/admin/dispositivos-tabla";

export default async function DispositivosPage() {
  const sesion = await obtenerSesion();
  const dispositivos = await obtenerDispositivos();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="u-display text-3xl font-extrabold leading-tight text-ink lg:text-4xl">
            Dispositivos
          </h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            Qué celular o tablet usa cada colaborador en la terminal. Al
            identificarse una vez, el dispositivo queda reconocido.
          </p>
        </div>

        <span className="u-badge u-badge-neutral">
          {dispositivos.length} dispositivo
          {dispositivos.length === 1 ? "" : "s"}
        </span>
      </header>

      <DispositivosTabla
        filas={dispositivos.map((d) => ({
          id: d.id,
          usuarioId: d.usuarioId,
          nombre: d.nombre,
          area: d.area,
          huella: d.huella,
          etiqueta: d.etiqueta,
          agente: d.agente,
          primeraMarca: d.primeraMarca.toISOString(),
          ultimaMarca: d.ultimaMarca.toISOString(),
          veces: d.veces,
          activo: d.activo,
        }))}
        esAdmin={sesion?.rol === "admin"}
      />
    </div>
  );
}
