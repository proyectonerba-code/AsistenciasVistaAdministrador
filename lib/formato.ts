/**
 * Formateadores compartidos entre componentes de servidor y de cliente.
 *
 * IMPORTANTE: este archivo NO debe tener "use client". Los componentes de
 * servidor no pueden llamar funciones exportadas desde un módulo de cliente
 * (Next las convierte en referencias de cliente y fallan en runtime).
 */

/**
 * Convierte "1:44" en "1h 44m".
 * "0:00" -> "0m" · "2:00" -> "2h" · "0:30" -> "30m"
 */
export function formatoHorasLegible(hhmm: string): string {
  if (!hhmm || hhmm === "—") return "—";

  const partes = hhmm.split(":");
  if (partes.length < 2) return hhmm;

  const h = Number(partes[0]);
  const m = Number(partes[1]);

  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  if (h === 0 && m === 0) return "0m";
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;

  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/**
 * Convierte minutos a "1:44" (HH:mm).
 */
export function minutosAHHMM(minutos: number): string {
  const total = Math.max(0, Math.round(minutos || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Convierte minutos a "42.1 h" (una decimal), para los totales de semana.
 */
export function minutosADecimalHoras(minutos: number): string {
  return `${(Math.max(0, minutos || 0) / 60).toFixed(1)} h`;
}
