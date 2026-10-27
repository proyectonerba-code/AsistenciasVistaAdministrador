"use client";

import { useState } from "react";
import { guardarNipEnrolamiento } from "@/server/actions";

export function NipEnrolamiento(): JSX.Element {
  const [pin, setPin] = useState("");
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function guardar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setOcupado(true); setMensaje(null);
    const resultado = await guardarNipEnrolamiento(pin);
    setOcupado(false);
    if (resultado.error) { setMensaje({ texto: resultado.error, error: true }); return; }
    setPin(""); setMensaje({ texto: "NIP de enrolamiento actualizado." });
  }

  return <form onSubmit={guardar} className="u-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
    <div><h2 className="font-bold text-ink">NIP para registrar celulares</h2><p className="mt-1 text-sm text-ink-muted">El trabajador lo usa una sola vez al solicitar el alta de su dispositivo.</p></div>
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="nip-enrolamiento">Nuevo NIP de cuatro dígitos</label>
      <input id="nip-enrolamiento" inputMode="numeric" autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className="u-input w-32 text-center tracking-[0.3em]" placeholder="••••" required />
      <button disabled={ocupado || pin.length !== 4} className="u-btn u-btn-primary u-btn-sm">{ocupado ? "Guardando…" : "Guardar NIP"}</button>
      {mensaje && <span role="status" className={`text-sm ${mensaje.error ? "text-danger" : "text-emerald-700"}`}>{mensaje.texto}</span>}
    </div>
  </form>;
}
