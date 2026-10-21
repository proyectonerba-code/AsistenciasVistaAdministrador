/**
 * GET /api/admin/reporte/excel?semana=YYYY-MM-DD
 * Exporta el reporte semanal a Excel (.xlsx). Solo admin.
 */
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { obtenerSesion } from "@/server/auth";
import { obtenerReporteSemana } from "@/server/reporte";
import { minutosAHHMM } from "@/lib/tz";
import { z } from "zod";

export const runtime = "nodejs";

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verificación de sesión y rol en el route handler (no solo middleware)
  const sesion = await obtenerSesion();
  if (!sesion) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }
  if (sesion.rol !== "admin") {
    return NextResponse.json(
      { error: "Solo administradores pueden exportar" },
      { status: 403 }
    );
  }

  const param = request.nextUrl.searchParams.get("semana");
  const validado = FechaSchema.safeParse(param);

  const partes = validado.success
    ? validado.data.split("-").map(Number)
    : (() => {
        const hoy = new Date();
        return [hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, hoy.getUTCDate()];
      })();

  const lunes = new Date(
    Date.UTC(partes[0], partes[1] - 1, partes[2], 12, 0, 0, 0)
  );
  const reporte = await obtenerReporteSemana(lunes);

  const libro = new ExcelJS.Workbook();
  libro.creator = "Control de Asistencia";
  libro.created = new Date();

  const hoja = libro.addWorksheet("Reporte General");

  hoja.mergeCells("A1:G1");
  hoja.getCell("A1").value = `REPORTE GENERAL — Semana del ${reporte.lunes}`;
  hoja.getCell("A1").font = { bold: true, size: 14 };
  hoja.getCell("A1").alignment = { horizontal: "center" };

  hoja.addRow([]);
  const encabezado = hoja.addRow([
    "Trabajador",
    "Correo",
    "Área",
    "Horas trabajadas",
    "Horas extra",
    "Asistencias",
    "Faltas",
  ]);
  encabezado.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1A1A1A" },
    };
  });

  for (const fila of reporte.filas) {
    hoja.addRow([
      fila.nombre,
      fila.correo,
      fila.area,
      minutosAHHMM(fila.trabajadasMin),
      minutosAHHMM(fila.extraMin),
      fila.asistencias,
      fila.faltas,
    ]);
  }

  const total = hoja.addRow([
    "TOTAL GENERAL",
    "",
    "",
    minutosAHHMM(reporte.total.trabajadasMin),
    minutosAHHMM(reporte.total.extraMin),
    reporte.total.asistencias,
    reporte.total.faltas,
  ]);
  total.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3D0000" },
    };
  });

  hoja.columns.forEach((col) => {
    col.width = 22;
  });
  hoja.getColumn(2).width = 32;

  const buffer = await libro.xlsx.writeBuffer();

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-${reporte.lunes}.xlsx"`,
    },
  });
}
