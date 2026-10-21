/**
 * Componente de presentación puro: badge de estado de asistencia.
 * Recibe el estado y renderiza el color semántico correspondiente.
 */
export interface EstadoBadgeProps {
  estado: string;
  /** Versión compacta para tablas densas. */
  compacto?: boolean;
}

interface Config {
  clase: string;
  texto: string;
}

const ESTADOS: Record<string, Config> = {
  Completado: { clase: "u-badge-success", texto: "Completado" },
  "Completado con horas extra": {
    clase: "u-badge-danger",
    texto: "Completado + Extra",
  },
  "Entrada registrada (salida pendiente)": {
    clase: "u-badge-warning",
    texto: "En jornada activa",
  },
  "Incidencia: domingo": { clase: "u-badge-info", texto: "Domingo" },
  "Incidencia: descanso": { clase: "u-badge-info", texto: "Descanso" },
  Falta: { clase: "u-badge-danger", texto: "Falta" },
  "Falta justificada": { clase: "u-badge-neutral", texto: "Falta justificada" },
  "Sin registro": { clase: "u-badge-neutral", texto: "Sin registro" },
};

export function EstadoBadge({
  estado,
  compacto = false,
}: EstadoBadgeProps): JSX.Element {
  const c = ESTADOS[estado] ?? ESTADOS["Sin registro"];

  return (
    <span className={`u-badge ${c.clase}`}>
      <span className="u-dot" />
      {compacto ? c.texto : c.texto}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Origen del registro                                                  */
/* ------------------------------------------------------------------ */

export interface OrigenBadgeProps {
  origen: string;
}

export function OrigenBadge({ origen }: OrigenBadgeProps): JSX.Element {
  const clave = String(origen || "").toLowerCase();

  if (clave.includes("nfc")) {
    return (
      <span className="u-badge u-badge-success">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
          <path d="M12 6.21a11.76 11.76 0 0 1 0 11.58" />
          <path d="M18 4.1a15.91 15.91 0 0 1 .01 15.79" />
        </svg>
        Tag NFC
      </span>
    );
  }

  if (clave.includes("qr")) {
    return (
      <span className="u-badge u-badge-info">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
        QR
      </span>
    );
  }

  if (clave.includes("manual")) {
    return (
      <span className="u-badge u-badge-warning">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Manual Admin
      </span>
    );
  }

  return <span className="u-badge u-badge-neutral">{origen || "—"}</span>;
}
