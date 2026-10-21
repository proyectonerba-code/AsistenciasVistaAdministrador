"use client";

/**
 * Formulario de acceso al panel de administración.
 */
import { useState } from "react";
import { Logo } from "./logo";

export interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  cargando: boolean;
  error?: string | null;
}

export function LoginForm({
  onLogin,
  cargando,
  error,
}: LoginFormProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      {/* Halo carmesí de fondo */}
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(520px 320px at 50% 28%, rgba(220,38,38,0.13), transparent 70%)",
        }}
      />

      <div className="u-card relative w-full max-w-md p-8 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <Logo height={30} />

          <h1 className="u-display mt-7 text-2xl font-bold text-ink">
            Acceso Administrador
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Usuario o Correo electrónico
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nerwork.mx"
                required
                className="u-input pl-10"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Contraseña
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type={verPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="u-input px-10"
              />
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={
                  verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle transition hover:text-ink"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {verPassword ? (
                    <>
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </>
                  ) : (
                    <>
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-line text-primary focus:ring-2 focus:ring-primary/25"
              />
              Recordar sesión
            </label>
            <a
              href="mailto:admin@nerwork.mx?subject=Recuperar%20contrase%C3%B1a"
              className="text-sm text-ink-muted underline-offset-4 transition hover:text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-primary/20 bg-primary-wash px-3.5 py-2.5 text-sm font-medium text-primary"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="u-btn u-btn-primary w-full"
          >
            {cargando ? "Iniciando sesión…" : "Iniciar Sesión"}
            {!cargando && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            )}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 border-t border-line pt-6">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <p className="u-label text-[10px]">
            Sistema operacional · v8 · Seguro
          </p>
        </div>
      </div>
    </div>
  );
}
