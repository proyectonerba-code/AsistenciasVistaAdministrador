import { describe, it, expect } from "vitest";
import {
  calcularDia,
  calcularSemana,
  resolverHorarioReferencia,
  seleccionarHorarioEspecial,
  type ResultadoDia,
  type ReglaHorarioEspecial,
} from "./motor-horas";
import { esDiaLaboralMx } from "./tz";

/**
 * Crea una Date cuya hora LOCAL de México sea la indicada (UTC-6).
 */
function mx(ano: number, mes: number, dia: number, h: number, min: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia, h + 6, min, 0, 0));
}

function marca(h: number, min: number, dia = 8, mes = 6) {
  return { ts: mx(2026, mes, dia, h, min) };
}

const HORARIO_OFICINA = {
  inicio: 540,
  fin: 1140,
  etiqueta: "09:00 - 19:00",
  origen: "área" as const,
  descanso: false,
};

const HORARIO_SABADO = {
  inicio: 540,
  fin: 900,
  etiqueta: "09:00 - 15:00",
  origen: "sábado" as const,
  descanso: false,
};

const HORARIO_DESCANSO = {
  inicio: 0,
  fin: 0,
  etiqueta: "Descanso",
  origen: "sábado" as const,
  descanso: true,
};

const HORARIOS_AREA = {
  Oficina: { inicio: "09:00", fin: "19:00" },
  Técnico: { inicio: "09:00", fin: "20:00" },
  "Sin asignar": { inicio: "09:00", fin: "19:00" },
};

const LUNES = mx(2026, 6, 8, 12, 0);

describe("admin — motor de horas", () => {
  it("día normal sin extra", () => {
    const r = calcularDia({
      fecha: LUNES,
      marcas: [marca(9, 0), marca(18, 0)],
      ajusteManual: null,
      minutosComida: 60,
      horarioReferencia: HORARIO_OFICINA,
    });
    expect(r.entrada).toBe("09:00");
    expect(r.salida).toBe("18:00");
    expect(r.brutas).toBe(540);
    expect(r.comida).toBe(60);
    expect(r.netas).toBe(480);
    expect(r.extra).toBe(0);
    expect(r.estado).toBe("Completado");
  });

  it("día con extra", () => {
    const r = calcularDia({
      fecha: LUNES,
      marcas: [marca(9, 0), marca(20, 0)],
      ajusteManual: null,
      minutosComida: 60,
      horarioReferencia: HORARIO_OFICINA,
    });
    expect(r.extra).toBe(60);
    expect(r.estado).toBe("Completado con horas extra");
  });

  it("jornada de 4 h no descuenta comida", () => {
    const r = calcularDia({
      fecha: LUNES,
      marcas: [marca(9, 0), marca(13, 0)],
      ajusteManual: null,
      minutosComida: 60,
      horarioReferencia: HORARIO_OFICINA,
    });
    expect(r.comida).toBe(0);
    expect(r.netas).toBe(240);
  });

  it("jornada de exactamente 5 h sí descuenta comida", () => {
    const r = calcularDia({
      fecha: LUNES,
      marcas: [marca(9, 0), marca(14, 0)],
      ajusteManual: null,
      minutosComida: 60,
      horarioReferencia: HORARIO_OFICINA,
    });
    expect(r.comida).toBe(60);
    expect(r.netas).toBe(240);
  });

  it("sábado no descuenta comida", () => {
    const r = calcularDia({
      fecha: mx(2026, 6, 13, 12, 0),
      marcas: [marca(9, 0, 13), marca(15, 0, 13)],
      ajusteManual: null,
      minutosComida: 60,
      horarioReferencia: HORARIO_SABADO,
    });
    expect(r.comida).toBe(0);
    expect(r.netas).toBe(360);
  });

  it("domingo es incidencia con 0 horas pero conserva la marca", () => {
    const r = calcularDia({
      fecha: mx(2026, 6, 14, 12, 0),
      marcas: [marca(9, 0, 14), marca(18, 0, 14)],
      ajusteManual: null,
      minutosComida: 60,
      horarioReferencia: HORARIO_OFICINA,
    });
    expect(r.estado).toBe("Incidencia: domingo");
    expect(r.entrada).toBe("09:00");
    expect(r.salida).toBe("18:00");
    expect(r.netas).toBe(0);
    expect(r.extra).toBe(0);
  });

  it("sábado de descanso es incidencia y no suma horas", () => {
    const r = calcularDia({
      fecha: mx(2026, 6, 13, 12, 0),
      marcas: [marca(9, 0, 13), marca(15, 0, 13)],
      ajusteManual: null,
      minutosComida: 60,
      horarioReferencia: HORARIO_DESCANSO,
    });
    expect(r.estado).toBe("Incidencia: descanso");
    expect(r.netas).toBe(0);
    expect(r.extra).toBe(0);
  });

  it("doble marca a menos de 5 min queda pendiente", () => {
    const r = calcularDia({
      fecha: LUNES,
      marcas: [marca(9, 0), marca(9, 3)],
      ajusteManual: null,
      minutosComida: 60,
      horarioReferencia: HORARIO_OFICINA,
    });
    expect(r.salida).toBeNull();
    expect(r.estado).toBe("Entrada registrada (salida pendiente)");
  });

  it("3 marcas: la intermedia va a rechazados una sola vez", () => {
    const r = calcularDia({
      fecha: LUNES,
      marcas: [marca(9, 0), marca(9, 3), marca(18, 0)],
      ajusteManual: null,
      minutosComida: 60,
      horarioReferencia: HORARIO_OFICINA,
    });
    expect(r.salida).toBe("18:00");
    expect(r.marcasAdicionales).toEqual(["09:03"]);
  });

  it("manual completo se respeta tal cual", () => {
    const r = calcularDia({
      fecha: LUNES,
      marcas: [marca(8, 0), marca(17, 0)],
      ajusteManual: { entrada: "09:00", salida: "18:00" },
      minutosComida: 60,
      horarioReferencia: HORARIO_OFICINA,
    });
    expect(r.entrada).toBe("09:00");
    expect(r.salida).toBe("18:00");
    expect(r.origen).toBe("Manual");
  });

  it("manual solo entrada toma la última marca como salida", () => {
    const r = calcularDia({
      fecha: LUNES,
      marcas: [marca(9, 0), marca(18, 0)],
      ajusteManual: { entrada: "09:00" },
      minutosComida: 60,
      horarioReferencia: HORARIO_OFICINA,
    });
    expect(r.entrada).toBe("09:00");
    expect(r.salida).toBe("18:00");
    expect(r.origen).toBe("Marcas + Manual");
  });

  it("manual solo salida sin marcas: no hay registro", () => {
    const r = calcularDia({
      fecha: LUNES,
      marcas: [],
      ajusteManual: { salida: "18:00" },
      minutosComida: 60,
      horarioReferencia: HORARIO_OFICINA,
    });
    expect(r.entrada).toBeNull();
    expect(r.estado).toBe("Sin registro");
  });

  it("zona horaria: 23:50 MX cae en ese día", () => {
    const r = calcularDia({
      fecha: mx(2026, 6, 10, 23, 50),
      marcas: [marca(23, 50, 10)],
      ajusteManual: null,
      minutosComida: 60,
      horarioReferencia: HORARIO_OFICINA,
    });
    expect(r.fecha).toBe("2026-06-10");
    expect(r.entrada).toBe("23:50");
    expect(esDiaLaboralMx(r.fecha)).toBe(true);
  });

  it("horario especial gana al del área y al del sábado", () => {
    const h = resolverHorarioReferencia({
      area: "Oficina",
      fecha: mx(2026, 6, 13, 12, 0),
      horarioEspecial: {
        inicio: 480,
        fin: 840,
        etiqueta: "08:00 - 14:00",
        origen: "horario especial",
        descanso: false,
      },
      horariosPorArea: HORARIOS_AREA,
      horarioSabado: { inicio: "09:00", fin: "15:00" },
    });
    expect(h.inicio).toBe(480);
    expect(h.fin).toBe(840);
    expect(h.origen).toBe("horario especial");
  });

  it("sábado con descanso configurado por área", () => {
    const h = resolverHorarioReferencia({
      area: "Oficina",
      fecha: mx(2026, 6, 13, 12, 0),
      horarioEspecial: null,
      horariosPorArea: {
        ...HORARIOS_AREA,
        Oficina: { inicio: "09:00", fin: "19:00", sabado: null },
      },
      horarioSabado: { inicio: "09:00", fin: "15:00" },
    });
    expect(h.descanso).toBe(true);
    expect(h.etiqueta).toBe("Descanso");
  });

  it("varias reglas: gana la de vigente desde más reciente", () => {
    const reglas: ReglaHorarioEspecial[] = [
      {
        usuarioId: "u1",
        diaSemana: 1,
        entrada: "09:00",
        salida: "18:00",
        vigenteDesde: "2026-06-01",
        vigenteHasta: null,
        activo: true,
      },
      {
        usuarioId: "u1",
        diaSemana: 1,
        entrada: "08:00",
        salida: "14:00",
        vigenteDesde: "2026-06-10",
        vigenteHasta: null,
        activo: true,
      },
    ];
    const h = seleccionarHorarioEspecial(reglas, "u1", mx(2026, 6, 15, 12, 0));
    expect(h).not.toBeNull();
    if (h) expect(h.inicio).toBe(480);
  });

  it("semana: extra del sábado pasa a la semana siguiente", () => {
    const dias: ResultadoDia[] = [];
    for (let i = 0; i < 5; i++) {
      dias.push(
        calcularDia({
          fecha: mx(2026, 6, 8 + i, 12, 0),
          marcas: [marca(9, 0, 8 + i), marca(20, 0, 8 + i)],
          ajusteManual: null,
          minutosComida: 60,
          horarioReferencia: HORARIO_OFICINA,
        })
      );
    }
    dias.push(
      calcularDia({
        fecha: mx(2026, 6, 13, 12, 0),
        marcas: [marca(9, 0, 13), marca(17, 0, 13)],
        ajusteManual: null,
        minutosComida: 60,
        horarioReferencia: HORARIO_SABADO,
      })
    );

    const s = calcularSemana(dias, LUNES, true, 0);
    expect(s.extraPropia).toBe(300);
    expect(s.extraSabadoEstaSemana).toBe(120);
    expect(s.extraTotal).toBe(300);
    expect(s.extraASiguienteSemana).toBe(120);
    expect(s.asistencias).toBe(6);
  });
});

describe("admin — jornada propia del colaborador", () => {
  const SABADO = mx(2026, 6, 13, 12, 0);

  it("sin jornada propia, manda el horario del área", () => {
    const h = resolverHorarioReferencia({
      area: "Oficina",
      fecha: LUNES,
      horarioEspecial: null,
      horariosPorArea: HORARIOS_AREA,
      horarioSabado: { inicio: "09:00", fin: "15:00" },
    });
    expect(h.inicio).toBe(540);
    expect(h.fin).toBe(1140);
    expect(h.origen).toBe("área");
  });

  it("la jornada propia del colaborador pisa al horario del área", () => {
    const h = resolverHorarioReferencia({
      area: "Oficina",
      fecha: LUNES,
      horarioEspecial: null,
      horariosPorArea: HORARIOS_AREA,
      horarioSabado: { inicio: "09:00", fin: "15:00" },
      jornadaUsuario: {
        jornadaInicio: "08:00",
        jornadaFin: "17:00",
        sabadoTrabaja: null,
        sabadoInicio: null,
        sabadoFin: null,
      },
    });
    expect(h.inicio).toBe(480);
    expect(h.fin).toBe(1020);
    expect(h.etiqueta).toBe("08:00 - 17:00");
    expect(h.origen).toBe("colaborador");
  });

  it("un null en la jornada propia significa heredar, no vaciar", () => {
    const h = resolverHorarioReferencia({
      area: "Oficina",
      fecha: LUNES,
      horarioEspecial: null,
      horariosPorArea: HORARIOS_AREA,
      horarioSabado: { inicio: "09:00", fin: "15:00" },
      jornadaUsuario: {
        jornadaInicio: "08:00",
        jornadaFin: null,
        sabadoTrabaja: null,
        sabadoInicio: null,
        sabadoFin: null,
      },
    });
    expect(h.inicio).toBe(480);
    expect(h.fin).toBe(1140);
  });

  it("el colaborador puede marcar el sábado como descanso", () => {
    const h = resolverHorarioReferencia({
      area: "Oficina",
      fecha: SABADO,
      horarioEspecial: null,
      horariosPorArea: HORARIOS_AREA,
      horarioSabado: { inicio: "09:00", fin: "15:00" },
      jornadaUsuario: {
        jornadaInicio: null,
        jornadaFin: null,
        sabadoTrabaja: false,
        sabadoInicio: null,
        sabadoFin: null,
      },
    });
    expect(h.descanso).toBe(true);
    expect(h.etiqueta).toBe("Descanso");
  });

  it("el colaborador puede definir su propia jornada del sábado", () => {
    const h = resolverHorarioReferencia({
      area: "Oficina",
      fecha: SABADO,
      horarioEspecial: null,
      horariosPorArea: HORARIOS_AREA,
      horarioSabado: { inicio: "09:00", fin: "15:00" },
      jornadaUsuario: {
        jornadaInicio: null,
        jornadaFin: null,
        sabadoTrabaja: true,
        sabadoInicio: "09:00",
        sabadoFin: "13:00",
      },
    });
    expect(h.descanso).toBe(false);
    expect(h.inicio).toBe(540);
    expect(h.fin).toBe(780);
    expect(h.origen).toBe("colaborador");
  });

  it("el horario especial sigue mandando sobre la jornada propia", () => {
    const h = resolverHorarioReferencia({
      area: "Oficina",
      fecha: LUNES,
      horarioEspecial: { ...HORARIO_OFICINA, inicio: 600, fin: 1080 },
      horariosPorArea: HORARIOS_AREA,
      horarioSabado: { inicio: "09:00", fin: "15:00" },
      jornadaUsuario: {
        jornadaInicio: "08:00",
        jornadaFin: "17:00",
        sabadoTrabaja: null,
        sabadoInicio: null,
        sabadoFin: null,
      },
    });
    expect(h.inicio).toBe(600);
    expect(h.fin).toBe(1080);
  });

  it("el sábado no descuenta comida si el colaborador no tiene receso", () => {
    const r = calcularDia({
      fecha: SABADO,
      marcas: [marca(9, 0, 13), marca(17, 0, 13)],
      ajusteManual: null,
      minutosComida: 60,
      minutosComidaSabado: 0,
      horarioReferencia: HORARIO_SABADO,
    });
    expect(r.brutas).toBe(480);
    expect(r.comida).toBe(0);
    expect(r.netas).toBe(480);
  });

  it("el receso del sábado se descuenta si el colaborador lo tiene", () => {
    const r = calcularDia({
      fecha: SABADO,
      marcas: [marca(9, 0, 13), marca(17, 0, 13)],
      ajusteManual: null,
      minutosComida: 60,
      minutosComidaSabado: 30,
      horarioReferencia: HORARIO_SABADO,
    });
    expect(r.brutas).toBe(480);
    expect(r.comida).toBe(30);
    expect(r.netas).toBe(450);
  });
});
