"use client";

/**
 * Panel del día (client): maneja la edición inline de entrada/salida y
 * llama a la server action para guardar el ajuste manual.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DiaTabla,
  type DiaFila,
  type ValoresEdicion,
} from "@/components/ui/dia-tabla";
import { guardarAjusteManualDirecto } from "@/server/actions";

export interface DiaPanelProps {
  fecha: string;
  filas: DiaFila[];
  esAdmin: boolean;
  fechaAnterior: string;
  fechaSiguiente: string;
}

export function DiaPanel({
  fecha,
  filas,
  esAdmin,
  fechaAnterior,
  fechaSiguiente,
}: DiaPanelProps): JSX.Element {
  const router = useRouter();
  const [valores, setValores] = useState<ValoresEdicion>({});
  const [editando, setEditando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(
    null
  );

  const actualizar = (
    usuarioId: string,
    campo: "entrada" | "salida",
    valor: string
  ) => {
    setValores((prev) => {
      const actual = prev[usuarioId] || {
        entrada: filas.find((f) => f.id === usuarioId)?.entrada ?? "",
        salida: filas.find((f) => f.id === usuarioId)?.salida ?? "",
      };
      return { ...prev, [usuarioId]: { ...actual, [campo]: valor } };
    });
  };

  const guardar = async (
    usuarioId: string,
    fechaEdicion: string,
    entrada: string | null,
    salida: string | null,
    observaciones: string
  ) => {
    setMensaje(null);
    const resultado = await guardarAjusteManualDirecto({
      usuarioId,
      fecha: fechaEdicion,
      entrada,
      salida,
      observaciones,
    });

    if (resultado.error) {
      setMensaje({ texto: resultado.error, error: true });
      return;
    }

    setMensaje({ texto: "Registro guardado." });
    setEditando(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Selector de fecha */}
      <div className="u-card flex flex-wrap items-center gap-2 p-3">
        <a
          href={`/admin/asistencia?fecha=${fechaAnterior}`}
          className="u-btn u-btn-secondary u-btn-sm"
        >
          ← Día anterior
        </a>

        <form action="/admin/asistencia" method="get" className="flex items-center gap-2">
          <input
            type="date"
            name="fecha"
            defaultValue={fecha}
            className="u-input u-sm h-9 w-auto text-sm"
            aria-label="Fecha"
          />
          <button type="submit" className="u-btn u-btn-secondary u-btn-sm">
            Ir
          </button>
        </form>

        <a
          href={`/admin/asistencia?fecha=${fechaSiguiente}`}
          className="u-btn u-btn-secondary u-btn-sm"
        >
          Día siguiente →
        </a>

        <a href="/admin/asistencia" className="u-btn u-btn-ghost u-btn-sm">
          Hoy
        </a>
      </div>

      {mensaje && (
        <div
          role="status"
          className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${
            mensaje.error
              ? "border border-primary/20 bg-primary-wash text-primary"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <DiaTabla
        fecha={fecha}
        filas={filas}
        valoresEdicion={valores}
        editando={editando}
        esAdmin={esAdmin}
        onEditar={(id) => {
          setEditando(id);
          setMensaje(null);
        }}
        onCancelar={() => setEditando(null)}
        onCambioEntrada={(id, v) => actualizar(id, "entrada", v)}
        onCambioSalida={(id, v) => actualizar(id, "salida", v)}
        onGuardarAjuste={guardar}
      />
    </div>
  );
}
