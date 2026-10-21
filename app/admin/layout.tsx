/**
 * Layout base de /admin (sin verificación de sesión).
 * La verificación vive en app/admin/(protegido)/layout.tsx para que
 * /admin/login no entre en un bucle de redirección.
 */
export default function AdminBaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
