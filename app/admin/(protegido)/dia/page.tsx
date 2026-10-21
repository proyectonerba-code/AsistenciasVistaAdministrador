import { redirect } from "next/navigation";

/**
 * /admin/dia se redirige a la pǭgina principal del panel.
 *
 * `force-dynamic` es necesario: sin esto Next.js puede prerenderizar esta
 * página como estática y el `redirect()` prerenderizado se sirve roto
 * (error 500) en producción.
 */
export const dynamic = "force-dynamic";

export default function DiaPage(): never {
  redirect("/admin/asistencia");
}
