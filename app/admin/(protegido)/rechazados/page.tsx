/**
 * /admin/rechazados — auditoría de checadas NO aceptadas.
 * Equivale a la hoja "Rechazados" del control de asistencia original.
 */
import { obtenerSesion } from "@/server/auth";
import { obtenerRechazados } from "@/server/queries-admin";
import { fechaLocal } from "@/lib/tz";
import { EstadoBadge } from "@/components/ui/estado-badge";

const MOTIVO_BADGE: Record<string, string> = {
  "token invalido": "Token inválido",
  "usuario inactivo": "Usuario inactivo",
  "hora no permitida": "Fuera de horario",
  "fuera de zona": "Fuera de zona",
  "precision insuficiente": "GPS impreciso",
  "sin ubicacion": "Sin ubicación",
  "doble registro": "Doble registro",
  "marca adicional": "Marca adicional",
};

function claseMotivo(motivo: string): string {
  if (motivo === "sin ubicacion" || motivo === "fuera de zona") {
    return "u-badge-danger";
  }
  if (motivo === "hora no permitida" || motivo === "usuario inactivo") {
    return "u-badge-warning";
  }
  return "u-badge-neutral";
}

export default async function RechazadosPage() {
  const sesion = await obtenerSesion();
  const rechazados = await obtenerRechazados(200);

  const hoy = fechaLocal(new Date());

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="u-display text-3xl font-extrabold leading-tight text-ink lg:text-4xl">
            Rechazados
          </h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            Auditoría de checadas que no se registraron: doble marca, fuera de
            zona, sin GPS o fuera de horario.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="u-badge u-badge-neutral">{hoy}</span>
          <span className="u-badge u-badge-danger">
            {rechazados.length} registro{rechazados.length === 1 ? "" : "s"}
          </span>
          {sesion?.rol === "supervisor" && (
            <span className="u-badge u-badge-info">Solo lectura</span>
          )}
        </div>
      </header>

      <div className="u-card overflow-hidden">
        <div className="overflow-x-auto u-scroll">
          <table className="u-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Colaborador</th>
                <th>Motivo</th>
                <th>Distancia</th>
                <th>Precisión GPS</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {rechazados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-ink-muted">
                    No hay rechazos registrados.
                  </td>
                </tr>
              )}

              {rechazados.map((r) => (
                <tr key={r.id}>
                  <td className="u-mono tnum text-xs whitespace-nowrap">
                    {new Intl.DateTimeFormat("es-MX", {
                      timeZone: "America/Mexico_City",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    }).format(r.ts)}
                  </td>
                  <td>
                    <p className="font-semibold text-ink">
                      {r.nombre ?? "Desconocido"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {r.correo ?? `Token ${r.tokenPrefijo ?? "—"}`}
                    </p>
                  </td>
                  <td>
                    <span className={`u-badge ${claseMotivo(r.motivo)}`}>
                      <span className="u-dot" />
                      {MOTIVO_BADGE[r.motivo] ?? r.motivo}
                    </span>
                  </td>
                  <td className="u-mono tnum">
                    {r.distanciaM !== null ? `${Math.round(r.distanciaM)} m` : "—"}
                  </td>
                  <td className="u-mono tnum">
                    {r.accuracy !== null ? `${Math.round(r.accuracy)} m` : "—"}
                  </td>
                  <td className="max-w-md text-xs text-ink-muted">
                    {r.detalle ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="u-card p-5">
        <h2 className="u-display mb-3 text-base font-bold text-ink">
          Motivos de rechazo
        </h2>
        <ul className="grid gap-2 text-sm text-ink-muted sm:grid-cols-2 lg:grid-cols-3">
          <li className="flex items-center gap-2">
            <EstadoBadge estado="Sin registro" />
            <span>Sin ubicación: no se registra nada.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="u-badge u-badge-danger">
              <span className="u-dot" />
              Fuera de zona
            </span>
            <span>Lejos del punto de control.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="u-badge u-badge-danger">
              <span className="u-dot" />
              GPS impreciso
            </span>
            <span>Precisión mayor a la permitida.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="u-badge u-badge-neutral">
              <span className="u-dot" />
              Doble registro
            </span>
            <span>Marcas demasiado seguidas.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="u-badge u-badge-neutral">
              <span className="u-dot" />
              Marca adicional
            </span>
            <span>La tercera marca del día.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="u-badge u-badge-warning">
              <span className="u-dot" />
              Fuera de horario
            </span>
            <span>Fuera del rango permitido.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
