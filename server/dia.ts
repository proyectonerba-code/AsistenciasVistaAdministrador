/**
 * Lógica para armar los datos de /admin/asistencia (tabla del día).
 */
import {
  minutosAHHMM,
  fechaLocal,
  ahoraMx,
  formatoHM,
  hhmmAMinutos,
} from "@/lib/tz";
import { cargarContexto, calcularDiaDeUsuario } from "./calculo";

export interface DiaGrupo {
  area: string;
  etiqueta: string;
  filas: DiaFila[];
}

export interface DiaFila {
  id: string;
  nombre: string;
  area: string;
  legajo: number | null;
  etiquetaNfc: string | null;
  entrada: string | null;
  salida: string | null;
  /** Horas trabajadas del día (netas). */
  horasTrabajadas: string;
  horasExtra: string;
  estado: string;
  /** Origen real de la marca: nfc | qr | manual. */
  origen: string;
  observaciones: string;
  bruto: string;
  comida: string;
  jornada: string;
}

const ETIQUETAS: Record<string, string> = {
  Oficina: "Oficina",
  Técnico: "Técnicos",
  "Sin asignar": "Sin área asignada",
};

const ORDEN_AREAS = ["Oficina", "Técnico", "Sin asignar"];

/**
 * Obtiene los datos agrupados por área para una fecha dada.
 */
export async function obtenerDatosDia(fecha?: string): Promise<{
  fecha: string;
  grupos: DiaGrupo[];
  totales: {
    personas: number;
    conEntrada: number;
    conSalida: number;
    horasMin: number;
    extraMin: number;
  };
}> {
  const fechaStr = fecha ?? fechaLocal(ahoraMx());
  const ctx = await cargarContexto(fechaStr, fechaStr);

  const areas: Record<string, typeof ctx.usuarios> = {
    Oficina: [],
    Técnico: [],
    "Sin asignar": [],
  };

  for (const u of ctx.usuarios) {
    if (areas[u.area]) {
      areas[u.area].push(u);
    } else {
      areas["Sin asignar"].push(u);
    }
  }

  const grupos: DiaGrupo[] = [];
  let conEntrada = 0;
  let conSalida = 0;
  let horasMin = 0;
  let extraMin = 0;

  for (const area of ORDEN_AREAS) {
    const filas: DiaFila[] = [];

    for (const u of areas[area]) {
      const resultado = calcularDiaDeUsuario(ctx, u, fechaStr);
      const marcas = ctx.marcas.get(`${u.id}|${fechaStr}`) ?? [];

      // Origen real de la marca del día.
      let origen = "manual";
      if (resultado.origen === "Marcas" || resultado.origen === "Marcas + Manual") {
        const marcasNfc = marcas.filter((m) => m.origen === "nfc");
        const marcasQr = marcas.filter((m) => m.origen === "qr");
        origen =
          marcasNfc.length >= marcasQr.length ? "nfc" : "qr";
      } else if (resultado.origen === "Manual") {
        origen = "manual";
      } else {
        origen = "—";
      }

      if (resultado.entrada) conEntrada++;
      if (resultado.salida) conSalida++;

      // Con la entrada abierta todavía no hay horas "trabajadas": se muestra
      // el tiempo que lleva abierta la jornada (lo que ve el supervisor).
      let horasVisiblesMin = resultado.netas;
      if (!resultado.salida && resultado.entrada) {
        const entradaMin = hhmmAMinutos(resultado.entrada);
        const ahoraMin = hhmmAMinutos(formatoHM(ahoraMx()));
        if (entradaMin !== null && ahoraMin !== null) {
          horasVisiblesMin = Math.max(0, ahoraMin - entradaMin);
        }
      }

      horasMin += resultado.netas;
      extraMin += resultado.extra;

      filas.push({
        id: u.id,
        nombre: u.nombre,
        area: u.area,
        legajo: u.legajo ?? null,
        etiquetaNfc: u.etiquetaNfc ?? null,
        entrada: resultado.entrada,
        salida: resultado.salida,
        horasTrabajadas:
          resultado.entrada === null
            ? "—"
            : minutosAHHMM(horasVisiblesMin),
        horasExtra: resultado.extra > 0 ? minutosAHHMM(resultado.extra) : "0:00",
        estado: resultado.estado,
        origen,
        observaciones: resultado.observaciones,
        bruto: minutosAHHMM(resultado.brutas),
        comida: minutosAHHMM(resultado.comida),
        jornada: resultado.jornada.etiqueta,
      });
    }

    const horario = ctx.config.horariosPorArea[area];
    const etiquetaHorario = horario
      ? `  ·  Horario ${horario.inicio} a ${horario.fin}`
      : "";

    grupos.push({
      area,
      etiqueta: `${ETIQUETAS[area] ?? area}${etiquetaHorario}`,
      filas,
    });
  }

  return {
    fecha: fechaStr,
    grupos,
    totales: {
      personas: ctx.usuarios.length,
      conEntrada,
      conSalida,
      horasMin,
      extraMin,
    },
  };
}
