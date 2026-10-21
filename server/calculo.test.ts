import { describe, it, expect, vi } from "vitest";

/**
 * `server/calculo.ts` importa `./queries`, que al cargarse exige las variables
 * de entorno de Supabase. Este test es unitario: solo ejercita el cálculo,
 * así que las consultas se sustituyen por stubs.
 */
vi.mock("./queries", () => ({
  obtenerUsuariosActivos: vi.fn(async () => []),
  obtenerConfig: vi.fn(async () => ({})),
  obtenerHorariosEspeciales: vi.fn(async () => []),
  obtenerMarcasRango: vi.fn(async () => []),
  obtenerAjustesRango: vi.fn(async () => []),
  obtenerFaltasRango: vi.fn(async () => new Map()),
  obtenerUsuarioPorId: vi.fn(async () => null),
  obtenerLunes: vi.fn(async () => new Date()),
  fechasSemana: vi.fn(async () => []),
}));

import { diasDeSemanaLaboral, type ContextoCalculo } from "./calculo";
import type { Usuario, Marca } from "./queries-real";
import { fechaLocal } from "@/lib/tz";

/**
 * Crea una Date cuya hora LOCAL de México sea la indicada (UTC-6).
 */
function mx(ano: number, mes: number, dia: number, h: number, min: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia, h + 6, min, 0, 0));
}

const USUARIO: Usuario = {
  id: "11111111-1111-1111-1111-111111111111",
  nombre: "Jesus Guadarrama",
  correo: "jesus.guadarrama@gmail.com",
  area: "Oficina",
  minutosComida: 60,
  legajo: 1042,
  etiquetaNfc: "NFC-1000-A",
  activo: true,
};

const CONFIG = {
  horariosPorArea: {
    Oficina: { inicio: "09:00", fin: "19:00" },
    Técnico: { inicio: "09:00", fin: "20:00" },
    "Sin asignar": { inicio: "09:00", fin: "19:00" },
  },
  horarioSabado: { inicio: "09:00", fin: "15:00" },
  minutosComidaDefault: 60,
  minutosMinimosComida: 300,
  minEntreMarcas: 5,
  horaMinRegistro: "06:00",
  horaMaxRegistro: "23:30",
  trasladaExtraSabado: true,
};

/** Lunes 8 de junio de 2026. */
const LUNES = mx(2026, 6, 8, 12, 0);
/** Domingo 14 de junio de 2026. */
const DOMINGO = mx(2026, 6, 14, 12, 0);

function marca(ts: Date): Marca {
  return {
    id: `m-${ts.getTime()}`,
    usuarioId: USUARIO.id,
    ts,
    origen: "nfc",
  };
}

/** Arma un contexto con las marcas indicadas (indexadas por usuario|fecha). */
function contextoConMarcas(marcas: Date[]): ContextoCalculo {
  const mapa = new Map<string, Marca[]>();
  for (const ts of marcas) {
    const k = `${USUARIO.id}|${fechaLocal(ts)}`;
    const lista = mapa.get(k) ?? [];
    lista.push(marca(ts));
    mapa.set(k, lista);
  }
  return {
    config: CONFIG,
    usuarios: [USUARIO],
    reglasHorario: [],
    marcas: mapa,
    ajustes: new Map(),
    faltas: new Map(),
  };
}

describe("admin — días de la semana laboral", () => {
  it("devuelve lunes a sábado cuando no hay registro el domingo", () => {
    const ctx = contextoConMarcas([]);
    const dias = diasDeSemanaLaboral(ctx, USUARIO, LUNES);

    expect(dias).toHaveLength(6);
    expect(dias[0].nombreDia).toBe("Lunes");
    expect(dias[5].nombreDia).toBe("Sábado");
  });

  it("incluye el domingo cuando hay marcas: queda como incidencia, no como falta", () => {
    const ctx = contextoConMarcas([mx(2026, 6, 14, 10, 0), mx(2026, 6, 14, 13, 0)]);
    const dias = diasDeSemanaLaboral(ctx, USUARIO, LUNES);

    expect(dias).toHaveLength(7);
    const domingo = dias[6];
    expect(domingo.nombreDia).toBe("Domingo");
    expect(domingo.esDomingo).toBe(true);
    expect(domingo.estado).toBe("Incidencia: domingo");

    // No suma horas ni horas extra.
    expect(domingo.netas).toBe(0);
    expect(domingo.extra).toBe(0);
  });

  it("un domingo con marcas nunca se cuenta como falta", () => {
    const ctx = contextoConMarcas([mx(2026, 6, 14, 10, 0)]);
    const dias = diasDeSemanaLaboral(ctx, USUARIO, LUNES);

    const domingo = dias.find((d) => d.esDomingo);
    expect(domingo).toBeDefined();
    expect(domingo!.estado).not.toBe("Sin registro");
    expect(domingo!.estado).not.toBe("Falta");
  });

  it("no incluye el domingo si solo hay ajuste manual pero tampoco hay marcas", () => {
    const ctx = contextoConMarcas([]);
    ctx.ajustes.set(`${USUARIO.id}|${fechaLocal(DOMINGO)}`, {
      id: "a-1",
      usuarioId: USUARIO.id,
      fecha: fechaLocal(DOMINGO),
      entrada: "10:00",
      salida: "13:00",
      observaciones: null,
      creadoPor: "admin@test.com",
      creadoEn: new Date(),
    });

    const dias = diasDeSemanaLaboral(ctx, USUARIO, LUNES);
    expect(dias).toHaveLength(7);
    expect(dias[6].estado).toBe("Incidencia: domingo");
    expect(dias[6].entrada).toBe("10:00");
  });
});
