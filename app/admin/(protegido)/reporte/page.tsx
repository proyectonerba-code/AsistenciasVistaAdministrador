import { redirect } from "next/navigation";

/**
 * El reporte general ahora vive dentro de /admin/asistencia.
 *
 * `force-dynamic` es necesario: sin esto Next.js prerenderiza esta página
 * como estática y el `redirect()` prerenderizado se sirve roto (error 500)
 * en producción. En modo dev funcionaba, en build no.
 */
export const dynamic = "force-dynamic";

export default function ReportePage(): never {
  redirect("/admin/asistencia");
}
