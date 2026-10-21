import { redirect } from "next/navigation";

/** /admin/dia se redirige a la página principal del panel. */
export default function DiaPage(): never {
  redirect("/admin/asistencia");
}
