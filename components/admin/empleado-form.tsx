"use client";

/**
 * Alta / edición de un trabajador. Al crear, el backend genera el token
 * secreto de la URL y la etiqueta NFC de la tarjeta; el token en claro se
 * muestra una sola vez para poderlo imprimir.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarUsuario, regenerarToken } from "@/server/actions";

export interface EmpleadoFormProps {
  empleadoId?: string;
  valoresIniciales?: {
    nombre: string;
    correo: string;
    area: string;
    minutosComida: number;
    legajo: number | null;
    etiquetaNfc: string | null;
    activo: boolean;
  };
  esAdmin: boolean;
}

type Area = "Oficina" | "Técnico" | "Sin asignar";

export function EmpleadoForm({
  empleadoId,
  valoresIniciales,
  esAdmin,
}: EmpleadoFormProps): JSX.Element {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(valoresIniciales?.nombre ?? "");
  const [correo, setCorreo] = useState(valoresIniciales?.correo ?? "");
  const [area, setArea] = useState<Area>(
    (valoresIniciales?.area as Area) ?? "Oficina"
  );
  const [minutosComida, setMinutosComida] = useState(
    valoresIniciales?.minutosComida ?? 60
  );
  const [legajo, setLegajo] = useState<string>(
    valoresIniciales?.legajo ? String(valoresIniciales.legajo) : ""
  );
  const [etiquetaNfc, setEtiquetaNfc] = useState(
    valoresIniciales?.etiquetaNfc ?? ""
  );
  const [activo, setActivo] = useState(valoresIniciales?.activo ?? true);

  const [estado, setEstado] = useState<{ texto: string; error?: boolean } | null>(
    null
  );
  const [token, setToken] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    setEstado(null);
    setToken(null);

    const resultado = await guardarUsuario({
      id: empleadoId,
      nombre,
      correo,
      area,
      minutosComida,
      legajo: legajo.trim() === "" ? null : Number(legajo),
      etiquetaNfc: etiquetaNfc.trim() === "" ? null : etiquetaNfc.trim(),
      activo,
    });

    setGuardando(false);

    if (resultado.error) {
      setEstado({ texto: resultado.error, error: true });
      return;
    }

    setEstado({ texto: "Guardado correctamente." });
    if (resultado.token) setToken(resultado.token);
    router.refresh();
  };

  const rotar = async () => {
    if (!empleadoId) return;
    setEstado(null);
    const resultado = await regenerarToken(empleadoId);
    if (resultado.error) {
      setEstado({ texto: resultado.error, error: true });
      return;
    }
    setToken(resultado.token ?? null);
    setEstado({
      texto: "Token rotado. Las credenciales anteriores ya no funcionan.",
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        disabled={!esAdmin}
        className="u-btn u-btn-primary"
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
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
        {empleadoId ? "Editar Empleado" : "Nuevo Empleado"}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAbierto(false);
          }}
        >
          <div className="u-card animate-scale-in w-full max-w-lg rounded-b-none p-6 sm:rounded-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="u-display text-xl font-bold text-ink">
                  {empleadoId ? "Editar empleado" : "Nuevo empleado"}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {empleadoId
                    ? "Actualiza los datos del colaborador."
                    : "Al guardar se generan su token NFC y su etiqueta."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="u-btn u-btn-ghost u-btn-sm shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="emp-nombre"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Nombre completo
                </label>
                <input
                  id="emp-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="u-input"
                  placeholder="Nombre y apellidos"
                />
              </div>

              <div>
                <label
                  htmlFor="emp-correo"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Correo electrónico
                </label>
                <input
                  id="emp-correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="u-input"
                  placeholder="nombre@nerwork.mx"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="emp-area"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Tipo / Área
                  </label>
                  <select
                    id="emp-area"
                    value={area}
                    onChange={(e) => setArea(e.target.value as Area)}
                    className="u-input u-select"
                  >
                    <option value="Oficina">Oficina</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Sin asignar">Sin asignar</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="emp-legajo"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Legajo
                  </label>
                  <input
                    id="emp-legajo"
                    value={legajo}
                    onChange={(e) => setLegajo(e.target.value)}
                    className="u-input u-mono"
                    placeholder="1042"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="emp-comida"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Tiempo de comida (min)
                  </label>
                  <input
                    id="emp-comida"
                    type="number"
                    min={0}
                    max={240}
                    step={5}
                    value={minutosComida}
                    onChange={(e) => setMinutosComida(Number(e.target.value))}
                    className="u-input u-mono"
                  />
                </div>
                <div>
                  <label
                    htmlFor="emp-nfc"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Etiqueta NFC
                  </label>
                  <input
                    id="emp-nfc"
                    value={etiquetaNfc}
                    onChange={(e) => setEtiquetaNfc(e.target.value)}
                    className="u-input u-mono"
                    placeholder="NFC-4829-A"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-primary focus:ring-2 focus:ring-primary/25"
                />
                Empleado activo (puede registrar asistencia)
              </label>

              {token && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="u-label text-[10px] text-emerald-700">
                    Token de registro (se muestra una sola vez)
                  </p>
                  <p className="u-mono mt-1.5 break-all text-sm font-bold text-ink">
                    {token}
                  </p>
                  <p className="mt-2 text-xs text-ink-muted">
                    URL:{" "}
                    <span className="u-mono">
                      {process.env.NEXT_PUBLIC_REGISTRO_URL ?? "https://registro.nerwork.mx"}
                      /c/{token}
                    </span>
                  </p>
                </div>
              )}

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

            <div className="mt-7 flex flex-wrap gap-3">
              {empleadoId && (
                <button
                  type="button"
                  onClick={rotar}
                  className="u-btn u-btn-secondary"
                >
                  Regenerar token
                </button>
              )}
              <button
                type="button"
                onClick={() => setAbierto(false)}
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
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
