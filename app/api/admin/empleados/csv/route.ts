/**
 * GET /api/admin/empleados/csv?semana=YYYY-MM-DD
 * Exporta el catálogo de empleados con su carga de la semana a CSV.
 */
import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/server/auth";
import { obtenerDetalleSemanaEmpleados } from "@/server/empleados";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Escapa un valor para CSV (comillas dobles y separadores). */
function csv(valor: unknown): string {
  const texto = String(valor ?? "");
  if (/[",;\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sesion = await obtenerSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const param = request.nextUrl.searchParams.get("semana");
  const validado = FechaSchema.safeParse(param);

  const lunes = validado.success
    ? validado.data
    : (() => {
        const hoy = new Date();
        const d = new Date(
          Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate(), 12)
        );
        const dia = d.getUTCDay();
        d.setUTCDate(d.getUTCDate() + (dia === 0 ? -6 : 1 - dia));
        return d.toISOString().slice(0, 10);
      })();

  const detalle = await obtenerDetalleSemanaEmpleados(
    new Date(`${lunes}T12:00:00Z`)
  );

  const encabezado = [
    "Empleado",
    "Legajo",
    "Correo",
    "Área",
    "Etiqueta NFC",
    "Total horas semana",
    "Horas extra",
    "Asistencias",
    "Faltas",
    "Estado",
  ];

  const filas = detalle.filas.map((f) => [
    f.nombre,
    f.legajo ?? "",
    f.correo,
    f.area,
    f.etiquetaNfc ?? "",
    (f.totalHorasMin / 60).toFixed(2),
    (f.extraMin / 60).toFixed(2),
    f.asistencias,
    f.faltas,
    f.estado,
  ]);

  const csvTexto =
    "﻿" + // BOM para que Excel respete UTF-8
    [encabezado, ...filas].map((r) => r.map(csv).join(",")).join("\r\n");

  return new NextResponse(csvTexto, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="empleados-semana-${lunes}.csv"`,
    },
  });
}
