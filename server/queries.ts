/**
 * Consultas a Supabase.
 *
 * En producción usa la tabla real (service role del servidor).
 * Si SUPABASE_DEMO=1 usa un cliente simulado en memoria con el mismo catálogo
 * de 11 usuarios y 6 semanas de historial, para poder ver el sistema
 * funcionando sin base de datos.
 */
import { esDemo } from "@/lib/demo/cliente";
import * as real from "./queries-real";
import * as demo from "./queries-demo";

export type {
  Usuario,
  ConfigSistema,
  ReglaHorarioEspecial,
  Marca,
  AjusteManual,
} from "./queries-real";

export const obtenerUsuariosActivos = esDemo()
  ? demo.obtenerUsuariosActivos
  : real.obtenerUsuariosActivos;

export const obtenerUsuarioPorId = esDemo()
  ? demo.obtenerUsuarioPorId
  : real.obtenerUsuarioPorId;

export const obtenerConfig = esDemo() ? demo.obtenerConfig : real.obtenerConfig;

export const obtenerHorariosEspeciales = esDemo()
  ? demo.obtenerHorariosEspeciales
  : real.obtenerHorariosEspeciales;

export const obtenerMarcasPorUsuarioFecha = esDemo()
  ? demo.obtenerMarcasPorUsuarioFecha
  : real.obtenerMarcasPorUsuarioFecha;

export const obtenerAjusteManual = esDemo()
  ? demo.obtenerAjusteManual
  : real.obtenerAjusteManual;

export const obtenerMarcasRango = esDemo()
  ? demo.obtenerMarcasRango
  : real.obtenerMarcasRango;

export const obtenerAjustesRango = esDemo()
  ? demo.obtenerAjustesRango
  : real.obtenerAjustesRango;

export const obtenerFaltasRango = esDemo()
  ? demo.obtenerFaltasRango
  : real.obtenerFaltasRango;

export const obtenerLunes = real.obtenerLunes;
export const fechasSemana = real.fechasSemana;
