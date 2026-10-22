"use client";

/**
 * Barra superior del panel: marca, navegación por secciones y reloj.
 * La navegación se resuelve en el cliente con usePathname para poder marcar
 * la sección activa sin pasar props por cada página.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";

export interface AdminLayoutProps {
  sesion: { correo: string; rol: string };
  children: React.ReactNode;
  contenidoNav?: React.ReactNode;
}

const SECCIONES = [
  { href: "/admin/asistencia", texto: "Asistencia y Registros" },
  { href: "/admin/empleados", texto: "Empleados" },
  { href: "/admin/horarios", texto: "Horarios" },
  { href: "/admin/dispositivos", texto: "Dispositivos" },
];

const SECCIONES_SECUNDARIAS = [
  { href: "/admin/pendientes", texto: "Pendientes" },
  { href: "/admin/rechazados", texto: "Rechazados" },
];

function useReloj(): { hora: string; fecha: string } {
  const [reloj, setReloj] = useState({ hora: "--:--:--", fecha: "" });

  useEffect(() => {
    const formatear = () => {
      const d = new Date();
      setReloj({
        hora: [d.getHours(), d.getMinutes(), d.getSeconds()]
          .map((n) => String(n).padStart(2, "0"))
          .join(":"),
        fecha: new Intl.DateTimeFormat("es-MX", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(d),
      });
    };
    formatear();
    const id = setInterval(formatear, 1000);
    return () => clearInterval(id);
  }, []);

  return reloj;
}

export function AdminLayout({
  sesion,
  children,
  contenidoNav,
}: AdminLayoutProps): JSX.Element {
  const pathname = usePathname();
  const { hora, fecha } = useReloj();

  const esActiva = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="u-glass sticky top-0 z-30 border-b border-black/5">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 sm:px-6 lg:px-12">
          <Link href="/admin/asistencia" className="shrink-0">
            <Logo height={24} />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {SECCIONES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`u-btn u-btn-sm ${
                  esActiva(s.href)
                    ? "u-btn-primary"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                {s.texto}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 lg:flex">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-wash text-primary">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <span className="u-mono tnum text-xs font-semibold text-ink">
                {hora}
              </span>
              <span className="text-xs text-ink-muted">{fecha}</span>
            </div>

            {contenidoNav}

            <span
              className="hidden text-xs text-ink-muted xl:inline"
              title={`Sesión de ${sesion.rol}`}
            >
              {sesion.correo}
            </span>
          </div>
        </div>

        {/* Navegación secundaria (pendientes / rechazados) */}
        <div className="border-t border-black/5 bg-white/60 md:hidden">
          <div className="mx-auto flex max-w-[1280px] gap-1 overflow-x-auto px-4 py-2 sm:px-6">
            {[...SECCIONES, ...SECCIONES_SECUNDARIAS].map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`u-btn u-btn-sm whitespace-nowrap ${
                  esActiva(s.href)
                    ? "u-btn-primary"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                {s.texto}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-12 lg:py-12">
        {children}
      </main>
    </div>
  );
}
