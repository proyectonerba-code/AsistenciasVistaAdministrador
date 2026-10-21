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
});
