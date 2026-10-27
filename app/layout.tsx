import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NerWork · Panel de Administración",
  description:
    "Panel de administración del Control de Asistencia NerWork: registros del día, reportes semanales, empleados y horarios.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#DC2626",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es-MX"
      className="font-fallbacks"
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
