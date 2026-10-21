import { redirect } from "next/navigation";

/** El reporte general ahora vive dentro de /admin/asistencia. */
export default function ReportePage(): never {
  redirect("/admin/asistencia");
}
