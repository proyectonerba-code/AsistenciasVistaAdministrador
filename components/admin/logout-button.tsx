"use client";

/**
 * Botón de cerrar sesión (client): invoca la server action logoutAction.
 */
import { logoutAction } from "@/server/actions";

export function LogoutButton(): JSX.Element {
  return (
    <button
      onClick={() => {
        void logoutAction();
      }}
      className="text-sm text-[#f4cccc] hover:text-white underline"
    >
      Cerrar sesión
    </button>
  );
}
