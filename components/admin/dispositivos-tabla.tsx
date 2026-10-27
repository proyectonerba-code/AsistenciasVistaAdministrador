"use client";

/**
 * Tabla de dispositivos: qué celular/tablet usa cada colaborador.
 * Permite revocar el vínculo (el teléfono vuelve a pedir identificación).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { asignarDispositivo, revocarDispositivo } from "@/server/actions";

export interface DispositivoFila {
  id: string;
  usuarioId: string | null;
  nombre: string;
  area: string;
  huella: string;
  etiqueta: string | null;
  agente: string | null;
  primeraMarca: string;
  ultimaMarca: string;
  veces: number;
  activo: boolean;
  estado: "pendiente" | "activo" | "revocado";
}

export interface DispositivosTablaProps {
  filas: DispositivoFila[];
  trabajadores: { id: string; nombre: string; area: string }[];
  esAdmin: boolean;
}

function fecha(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function DispositivosTabla({
  filas,
  trabajadores,
  esAdmin,
}: DispositivosTablaProps): JSX.Element {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(
    null
  );
  const [ocupado, setOcupado] = useState<string | null>(null);

  const filtradas = filas.filter((f) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      f.nombre.toLowerCase().includes(q) ||
      (f.etiqueta ?? "").toLowerCase().includes(q) ||
      f.huella.toLowerCase().includes(q) ||
      f.area.toLowerCase().includes(q)
    );
  });

  const revocar = async (id: string) => {
    if (
      !window.confirm(
        "¿Revocar este dispositivo? La persona tendrá que identificarse de nuevo en la terminal."
      )
    ) {
      return;
    }

    setOcupado(id);
    setMensaje(null);

    const resultado = await revocarDispositivo(id);

    setOcupado(null);

    if (resultado.error) {
      setMensaje({ texto: resultado.error, error: true });
      return;
    }

    setMensaje({ texto: "Dispositivo revocado." });
    router.refresh();
  };

  const asignar = async (id: string, usuarioId: string) => {
    setOcupado(id); setMensaje(null);
    const resultado = await asignarDispositivo(id, usuarioId);
    setOcupado(null);
    if (resultado.error) { setMensaje({ texto: resultado.error, error: true }); return; }
    setMensaje({ texto: "Dispositivo asignado al colaborador." }); router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="u-card flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar persona o dispositivo…"
            className="u-input pl-9"
            aria-label="Buscar dispositivo"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="u-badge u-badge-success">
            <span className="u-dot" />
            {filas.filter((f) => f.estado === "activo").length} activos
          </span>
          {filas.filter((f) => f.estado === "pendiente").length > 0 && <span className="u-badge u-badge-neutral">{filas.filter((f) => f.estado === "pendiente").length} pendientes</span>}
          {filas.filter((f) => f.estado === "revocado").length > 0 && (
            <span className="u-badge u-badge-neutral">
              {filas.filter((f) => f.estado === "revocado").length} revocados
            </span>
          )}
        </div>
      </div>

      {mensaje && (
        <div
          role="status"
          className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${
            mensaje.error
              ? "border border-primary/20 bg-primary-wash text-primary"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="u-card overflow-hidden">
        <div className="overflow-x-auto u-scroll">
          <table className="u-table u-table-compact">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Dispositivo</th>
                <th>Identificador</th>
                <th>Última actividad</th>
                <th className="text-right">Checadas</th>
                <th>Estado</th>
                {esAdmin && <th className="text-right">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr>
                  <td
                    colSpan={esAdmin ? 7 : 6}
                    className="py-10 text-center text-ink-muted"
                  >
                    Todavía no hay dispositivos registrados. Cuando alguien se
                    identifique en la terminal, aparecerá aquí.
                  </td>
                </tr>
              )}

              {filtradas.map((f) => (
                <tr key={f.id}>
                  <td className="max-w-[180px]">
                    <p className="truncate font-semibold text-ink" title={f.nombre}>
                      {f.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">{f.area}</p>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="u-badge u-badge-neutral">
                      {f.etiqueta ?? "Dispositivo"}
                    </span>
                  </td>
                  <td className="u-mono whitespace-nowrap text-xs text-ink-muted">
                    {f.huella.slice(0, 12)}…
                  </td>
                  <td className="u-mono tnum whitespace-nowrap text-xs">
                    {fecha(f.ultimaMarca)}
                  </td>
                  <td className="u-mono tnum text-right font-bold text-ink">
                    {f.veces}
                  </td>
                  <td className="whitespace-nowrap">
                    <span
                      className={`u-badge ${
                      f.estado === "activo" ? "u-badge-success" : "u-badge-neutral"
                      }`}
                    >
                      <span className="u-dot" />
                      {f.estado === "activo" ? "Activo" : f.estado === "pendiente" ? "Pendiente" : "Revocado"}
                    </span>
                  </td>
                  {esAdmin && (
                    <td className="whitespace-nowrap text-right">
                      {f.estado === "pendiente" ? (
                        <div className="flex justify-end gap-2">
                          <select className="u-input max-w-52" aria-label={`Asignar ${f.etiqueta ?? "dispositivo"}`} defaultValue="" id={`asignar-${f.id}`}>
                            <option value="" disabled>Elegir colaborador…</option>
                            {trabajadores.map((t) => <option key={t.id} value={t.id}>{t.nombre} · {t.area}</option>)}
                          </select>
                          <button type="button" onClick={() => { const value = (document.getElementById(`asignar-${f.id}`) as HTMLSelectElement | null)?.value; if (value) void asignar(f.id, value); else setMensaje({ texto: "Selecciona un colaborador.", error: true }); }} disabled={ocupado === f.id} className="u-btn u-btn-primary u-btn-sm">{ocupado === f.id ? "Asignando…" : "Asignar"}</button>
                        </div>
                      ) : f.activo ? (
                        <button
                          type="button"
                          onClick={() => revocar(f.id)}
                          disabled={ocupado === f.id}
                          className="u-btn u-btn-danger u-btn-sm"
                        >
                          {ocupado === f.id ? "Revocando…" : "Revocar"}
                        </button>
                      ) : (
                        <span className="text-xs text-ink-subtle">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink-subtle">
        La terminal compartida reconoce el teléfono: la segunda vez ya no pide
        identificación. Si alguien pierde o cambia de equipo, revoca aquí su
        dispositivo.
      </p>
    </div>
  );
}
