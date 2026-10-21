/**
 * GET /api/admin/reporte/pdf?semana=YYYY-MM-DD
 * Exporta el reporte semanal a PDF. Solo admin.
 */
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { obtenerSesion } from "@/server/auth";
import { obtenerReporteSemana } from "@/server/reporte";
import { minutosAHHMM } from "@/lib/tz";
import { z } from "zod";

export const runtime = "nodejs";

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sesion = await obtenerSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (sesion.rol !== "admin") {
    return NextResponse.json(
      { error: "Solo administradores pueden exportar" },
      { status: 403 }
    );
  }

  const param = request.nextUrl.searchParams.get("semana");
  const validado = FechaSchema.safeParse(param);

  const hoy = new Date();
  const partes = validado.success
    ? validado.data.split("-").map(Number)
    : [hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, hoy.getUTCDate()];

  const lunes = new Date(
    Date.UTC(partes[0], partes[1] - 1, partes[2], 12, 0, 0, 0)
  );
  const reporte = await obtenerReporteSemana(lunes);

  const doc = new PDFDocument({ size: "LETTER", margin: 40 });
  const chunks: Buffer[] = [];

  const terminado = new Promise<Buffer>((resolve) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(16).font("Helvetica-Bold");
  doc.text(`REPORTE GENERAL DE ASISTENCIA`, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(11).font("Helvetica");
  doc.text(`Semana del ${reporte.lunes} al ${reporte.sabado}`, {
    align: "center",
  });
  doc.moveDown(1);

  const columnas = [
    { titulo: "Trabajador", ancho: 150 },
    { titulo: "Área", ancho: 80 },
    { titulo: "Trabajadas", ancho: 75 },
    { titulo: "Extra", ancho: 60 },
    { titulo: "Asist.", ancho: 50 },
    { titulo: "Faltas", ancho: 50 },
  ];

  const dibujarEncabezado = () => {
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(9);
    let x = doc.page.margins.left;
    doc.rect(x, y - 2, 465, 18).fill("#1a1a1a");
    doc.fillColor("#ffffff");
    for (const col of columnas) {
      doc.text(col.titulo, x + 4, y + 4, { width: col.ancho - 8, ellipsis: true });
      x += col.ancho;
    }
    doc.fillColor("#000000");
    doc.y = y + 20;
  };

  dibujarEncabezado();

  doc.font("Helvetica").fontSize(9);
  for (const fila of reporte.filas) {
    const y = doc.y;
    if (y > doc.page.height - 80) {
      doc.addPage();
      dibujarEncabezado();
      doc.font("Helvetica").fontSize(9);
    }
    const valores = [
      fila.nombre,
      fila.area,
      minutosAHHMM(fila.trabajadasMin),
      minutosAHHMM(fila.extraMin),
      String(fila.asistencias),
      String(fila.faltas),
    ];
    let x = doc.page.margins.left;
    for (let i = 0; i < columnas.length; i++) {
      doc.text(valores[i], x + 4, doc.y, {
        width: columnas[i].ancho - 8,
        ellipsis: true,
      });
      x += columnas[i].ancho;
    }
    doc.moveDown(0.35);
  }

  doc.moveDown(0.5);
  const yTotal = doc.y;
  doc.rect(doc.page.margins.left, yTotal - 2, 465, 18).fill("#3d0000");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  const totales = [
    "TOTAL GENERAL",
    "",
    minutosAHHMM(reporte.total.trabajadasMin),
    minutosAHHMM(reporte.total.extraMin),
    String(reporte.total.asistencias),
    String(reporte.total.faltas),
  ];
  let x = doc.page.margins.left;
  for (let i = 0; i < columnas.length; i++) {
    doc.text(totales[i], x + 4, yTotal + 4, {
      width: columnas[i].ancho - 8,
      ellipsis: true,
    });
    x += columnas[i].ancho;
  }
  doc.fillColor("#000000");

  doc.end();
  const buffer = await terminado;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${reporte.lunes}.pdf"`,
    },
  });
}
