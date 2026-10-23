/**
 * GET /api/admin/reporte/pdf?semana=YYYY-MM-DD
 * Exporta el reporte semanal a PDF. Solo admin.
 *
 * Se usa `pdf-lib` (JS puro) en lugar de `pdfkit` porque `pdfkit` depende de
 * `fs` para leer sus fuentes AFM y eso no existe en Cloudflare Workers.
 */
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { obtenerSesion } from "@/server/auth";
import { obtenerReporteSemana } from "@/server/reporte";
import { minutosAHHMM } from "@/lib/tz";
import { z } from "zod";

export const runtime = "nodejs";

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const ANCHO = 612; // LETTER
const ALTO = 792;
const MARGEN = 40;
const ANCHO_TABLA = 465;

interface Columna {
  titulo: string;
  ancho: number;
}

const COLUMNAS: Columna[] = [
  { titulo: "Trabajador", ancho: 150 },
  { titulo: "Área", ancho: 80 },
  { titulo: "Trabajadas", ancho: 75 },
  { titulo: "Extra", ancho: 60 },
  { titulo: "Asist.", ancho: 50 },
  { titulo: "Faltas", ancho: 50 },
];

/** Recorta el texto para que quepa en el ancho indicado. */
function ajustar(texto: string, font: PDFFont, size: number, ancho: number): string {
  if (font.widthOfTextAtSize(texto, size) <= ancho) return texto;
  let recortado = texto;
  while (recortado.length > 1 && font.widthOfTextAtSize(`${recortado}…`, size) > ancho) {
    recortado = recortado.slice(0, -1);
  }
  return `${recortado}…`;
}

function dibujarEncabezado(
  page: PDFPage,
  bold: PDFFont,
  y: number
): number {
  page.drawRectangle({
    x: MARGEN,
    y: y - 4,
    width: ANCHO_TABLA,
    height: 18,
    color: rgb(0.1, 0.1, 0.1),
  });
  let x = MARGEN;
  for (const col of COLUMNAS) {
    page.drawText(ajustar(col.titulo, bold, 9, col.ancho - 8), {
      x: x + 4,
      y: y + 1,
      size: 9,
      font: bold,
      color: rgb(1, 1, 1),
    });
    x += col.ancho;
  }
  return y - 20;
}

function dibujarFila(
  page: PDFPage,
  font: PDFFont,
  valores: string[],
  y: number
): number {
  let x = MARGEN;
  for (let i = 0; i < COLUMNAS.length; i++) {
    page.drawText(ajustar(valores[i] ?? "", font, 9, COLUMNAS[i].ancho - 8), {
      x: x + 4,
      y,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
    x += COLUMNAS[i].ancho;
  }
  return y - 14;
}

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

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([ANCHO, ALTO]);

  page.drawText("REPORTE GENERAL DE ASISTENCIA", {
    x: MARGEN,
    y: ALTO - 60,
    size: 16,
    font: bold,
    color: rgb(0, 0, 0),
  });
  page.drawText(`Semana del ${reporte.lunes} al ${reporte.sabado}`, {
    x: MARGEN,
    y: ALTO - 80,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  let y = dibujarEncabezado(page, bold, ALTO - 110);

  for (const fila of reporte.filas) {
    if (y < 80) {
      page = pdf.addPage([ANCHO, ALTO]);
      y = dibujarEncabezado(page, bold, ALTO - 60);
    }
    y = dibujarFila(
      page,
      font,
      [
        fila.nombre,
        fila.area,
        minutosAHHMM(fila.trabajadasMin),
        minutosAHHMM(fila.extraMin),
        String(fila.asistencias),
        String(fila.faltas),
      ],
      y
    );
  }

  if (y < 80) {
    page = pdf.addPage([ANCHO, ALTO]);
    y = ALTO - 60;
  }

  page.drawRectangle({
    x: MARGEN,
    y: y - 4,
    width: ANCHO_TABLA,
    height: 18,
    color: rgb(0.24, 0, 0),
  });
  let x = MARGEN;
  const totales = [
    "TOTAL GENERAL",
    "",
    minutosAHHMM(reporte.total.trabajadasMin),
    minutosAHHMM(reporte.total.extraMin),
    String(reporte.total.asistencias),
    String(reporte.total.faltas),
  ];
  for (let i = 0; i < COLUMNAS.length; i++) {
    page.drawText(ajustar(totales[i], bold, 9, COLUMNAS[i].ancho - 8), {
      x: x + 4,
      y: y + 1,
      size: 9,
      font: bold,
      color: rgb(1, 1, 1),
    });
    x += COLUMNAS[i].ancho;
  }

  const bytes = await pdf.save();

  return new NextResponse(new Uint8Array(bytes) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${reporte.lunes}.pdf"`,
    },
  });
}
