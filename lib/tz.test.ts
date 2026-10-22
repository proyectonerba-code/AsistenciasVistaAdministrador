import { describe, it, expect } from "vitest";
import {
  formatoHM,
  fechaLocal,
  esDomingoMx,
  esSabadoMx,
  esDiaLaboralMx,
  hhmmAMinutos,
  minutosAHHMM,
  diaSemanaNumericoMx,
  inicioDiaMx,
  finDiaMx,
} from "./tz";

describe("admin — tz (zona America/Mexico_City)", () => {
  it("formatoHH en zona México", () => {
    expect(formatoHM(new Date(Date.UTC(2026, 0, 15, 12, 0)))).toBe("06:00");
  });

  it("fechaLocal devuelve YYYY-MM-DD en zona México", () => {
    expect(fechaLocal(new Date(Date.UTC(2026, 0, 15, 5, 0)))).toBe("2026-01-14");
  });

  it("fechaLocal de string se interpreta como día de México", () => {
    expect(fechaLocal("2026-06-13")).toBe("2026-06-13");
  });

  it("detecta domingo, sábado y día laboral", () => {
    expect(esDomingoMx("2026-06-14")).toBe(true);
    expect(esSabadoMx("2026-06-13")).toBe(true);
    expect(esDiaLaboralMx("2026-06-13")).toBe(true);
    expect(esDiaLaboralMx("2026-06-14")).toBe(false);
  });

  it("día de la semana numérico (0=domingo)", () => {
    expect(diaSemanaNumericoMx("2026-06-14")).toBe(0);
    expect(diaSemanaNumericoMx("2026-06-15")).toBe(1);
  });

  it("conversiones HH:mm <-> minutos", () => {
    expect(minutosAHHMM(540)).toBe("09:00");
    expect(hhmmAMinutos("09:00")).toBe(540);
    expect(hhmmAMinutos("")).toBeNull();
    expect(hhmmAMinutos("99:99")).toBeNull();
  });

  it("el día en México empieza a las 06:00 UTC, no a las 00:00 UTC", () => {
    // 2026-06-15 00:00 en México = 2026-06-15 06:00 UTC.
    expect(inicioDiaMx("2026-06-15").toISOString()).toBe(
      "2026-06-15T06:00:00.000Z"
    );
  });

  it("el día en México termina a las 23:59:59 local del mismo día", () => {
    // 2026-06-16 05:59:59.999 UTC = 2026-06-15 23:59:59.999 en México.
    expect(finDiaMx("2026-06-15").toISOString()).toBe(
      "2026-06-16T05:59:59.999Z"
    );
  });

  it("una marca a las 22:00 local pertenece a ese mismo día", () => {
    // 2026-06-16 04:00 UTC = 2026-06-15 22:00 en México.
    const marcaTarde = new Date("2026-06-16T04:00:00.000Z");
    const inicio = inicioDiaMx("2026-06-15");
    const fin = finDiaMx("2026-06-15");
    expect(marcaTarde.getTime()).toBeGreaterThanOrEqual(inicio.getTime());
    expect(marcaTarde.getTime()).toBeLessThanOrEqual(fin.getTime());
    expect(fechaLocal(marcaTarde)).toBe("2026-06-15");
  });

  it("una marca a las 02:00 local NO pertenece a ese mismo día", () => {
    // 2026-06-16 08:00 UTC = 2026-06-16 02:00 en México.
    const marcaDeMadrugada = new Date("2026-06-16T08:00:00.000Z");
    const fin = finDiaMx("2026-06-15");
    expect(marcaDeMadrugada.getTime()).toBeGreaterThan(fin.getTime());
  });
});
