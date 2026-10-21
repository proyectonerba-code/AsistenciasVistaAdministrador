/**
 * Layout protegido del panel admin: verifica sesión en el servidor.
 * Si no hay sesión, redirige al login.
 */
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/server/auth";
import { AdminLayout as AdminShell } from "@/components/ui/admin-layout";
import { LogoutButton } from "@/components/admin/logout-button";

export default async function AdminProtegidoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await obtenerSesion();
  if (!sesion) {
    redirect("/admin/login");
  }

  return (
    <AdminShell sesion={sesion} contenidoNav={<LogoutButton />}>
      {children}
    </AdminShell>
  );
}
