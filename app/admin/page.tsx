import { redirect } from "next/navigation";

/**
 * `force-dynamic` es necesario: sin esto Next.js puede prerenderizar esta
 * página como estática y el `redirect()` prerenderizado se sirve roto
 * (error 500) en producción.
 */
export const dynamic = "force-dynamic";

export default function AdminPage(): never {
  redirect("/admin/asistencia");
}
