/**
 * Verificación de sesión en páginas y route handlers del panel.
 * Lanza Error de servidor con código HTTP (401/403) si no tiene acceso.
 */
import { obtenerSesion, type RolAdmin, type SesionAdmin } from "./auth";

export class ErrorDeAcceso extends Error {
  readonly status: number;

  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.name = "ErrorDeAcceso";
    this.status = status;
  }
}

/**
 * Exige sesión válida (admin o supervisor).
 */
export async function requireSesion(): Promise<SesionAdmin> {
  const sesion = await obtenerSesion();
  if (!sesion) {
    throw new ErrorDeAcceso("No autorizado", 401);
  }
  return sesion;
}

/**
 * Exige rol admin (supervisor es solo lectura).
 */
export async function requireAdmin(): Promise<SesionAdmin> {
  const sesion = await requireSesion();
  if (sesion.rol !== "admin") {
    throw new ErrorDeAcceso("Solo administradores", 403);
  }
  return sesion;
}

/**
 * Indica si la sesión tiene el rol requerido.
 */
export function tieneRol(
  sesion: SesionAdmin | null,
  rolRequerido: RolAdmin
): boolean {
  if (!sesion) return false;
  if (sesion.rol === "admin") return true;
  return rolRequerido === "supervisor";
}
