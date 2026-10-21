import { NextRequest, NextResponse } from "next/server";
import { obtenerSemanasDePersona } from "@/server/personas";
import { obtenerUsuarioPorId, obtenerUsuariosActivos } from "@/server/queries";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const usuarios = await obtenerUsuariosActivos();
  const usuario = await obtenerUsuarioPorId(id);
  const data = await obtenerSemanasDePersona(id, 2);

  return NextResponse.json({
    totalUsuarios: usuarios.length,
    primerUsuario: usuarios[0] ?? null,
    usuarioPorId: usuario,
    semanas: data ? data.semanas.length : null,
    error: data ? null : "obtenerSemanasDePersona devolvio null",
  });
}
