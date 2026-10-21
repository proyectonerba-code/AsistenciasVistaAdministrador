"use client";

/**
 * Página de login del panel admin (client component).
 * Usa la server action loginConCredenciales para autenticar vía Supabase Auth.
 */
import { useState } from "react";
import { LoginForm } from "@/components/ui/login-form";
import { loginConCredenciales } from "@/server/actions";

export default function LoginPage() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await loginConCredenciales(email, password);
      if (resultado?.error) {
        setError(resultado.error);
      }
    } catch (err: unknown) {
      // redirect de Next.js: no es un error real
      const digest =
        typeof err === "object" && err !== null && "digest" in err
          ? String((err as { digest: unknown }).digest)
          : "";
      if (!digest.includes("NEXT_REDIRECT")) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo iniciar sesión."
        );
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <LoginForm onLogin={handleLogin} cargando={cargando} error={error} />
  );
}
