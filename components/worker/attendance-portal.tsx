'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';

type EstadoDispositivo = { registrado: boolean; estado?: 'pendiente' | 'activo' | 'revocado'; nombre?: string; area?: string };
type RespuestaMarca = { ok?: boolean; tipo?: 'ENTRADA' | 'SALIDA'; hora?: string; nombre?: string; aviso?: string | null; error?: { motivo?: string; mensaje?: string } };

const CLAVE_HUELLA = 'nerwork-dispositivo';
const API = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

function nombreDispositivo() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua)) return 'iPhone / iPad';
  if (/Android/i.test(ua)) return 'Android';
  return 'Navegador móvil';
}

async function jsonFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) }, cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.mensaje ?? payload?.error ?? 'No se pudo conectar con el sistema.';
    throw new Error(typeof message === 'string' ? message : 'No se pudo conectar con el sistema.');
  }
  return payload as T;
}

function obtenerUbicacion(): Promise<{ lat: number; lng: number; accuracy: number }> {
  if (!navigator.geolocation) return Promise.reject(new Error('Este navegador no permite obtener ubicación GPS.'));
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
    (error) => reject(new Error(error.code === error.PERMISSION_DENIED
      ? 'Permite el GPS para registrar tu asistencia.'
      : error.code === error.TIMEOUT
        ? 'No se obtuvo la ubicación a tiempo. Activa el GPS y vuelve a abrir el enlace.'
        : 'No se pudo obtener la ubicación GPS.')),
    { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
  ));
}

export function AttendancePortal() {
  const [pin, setPin] = useState('');
  const [estado, setEstado] = useState<EstadoDispositivo | null>(null);
  const [marca, setMarca] = useState<RespuestaMarca | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [hora, setHora] = useState('--:--');

  useEffect(() => {
    const actualizarHora = () => setHora(new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date()));
    actualizarHora();
    const timer = window.setInterval(actualizarHora, 15_000);

    const huella = localStorage.getItem(CLAVE_HUELLA);
    if (!huella) return () => window.clearInterval(timer);

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === 'reload') {
      setMensaje('Recarga detectada. No registramos una nueva marca; vuelve a abrir el enlace para continuar.');
      return () => window.clearInterval(timer);
    }

    let cancelar = false;
    async function revisarYMarcar() {
      setOcupado(true);
      try {
        const estadoActual = await jsonFetch<EstadoDispositivo>(`/api/dispositivo/estado?huella=${encodeURIComponent(huella!)}`);
        if (cancelar) return;
        setEstado(estadoActual);
        if (!estadoActual.registrado || estadoActual.estado !== 'activo') return;

        setMensaje('Validando GPS y zona permitida…');
        const gps = await obtenerUbicacion();
        const result = await jsonFetch<RespuestaMarca>('/api/checar', {
          method: 'POST',
          body: JSON.stringify({ dispositivo: huella, etiqueta: nombreDispositivo(), ...gps }),
        });
        if (cancelar) return;
        setMarca(result);
        setMensaje(result.aviso ?? 'La marca se guardó con la hora oficial del servidor.');
      } catch (error) {
        if (!cancelar) setMensaje(error instanceof Error ? error.message : 'No se pudo registrar la asistencia.');
      } finally {
        if (!cancelar) setOcupado(false);
      }
    }
    void revisarYMarcar();
    return () => { cancelar = true; window.clearInterval(timer); };
  }, []);

  async function registrarDispositivo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{4}$/.test(pin)) { setMensaje('El NIP debe tener cuatro dígitos.'); return; }
    setOcupado(true); setMensaje('Registrando este celular…');
    try {
      const huella = crypto.randomUUID();
      const result = await jsonFetch<{ estado: 'pendiente'; mensaje: string }>('/api/dispositivo/registrar', {
        method: 'POST',
        body: JSON.stringify({ pin, huella, etiqueta: nombreDispositivo(), agente: navigator.userAgent }),
      });
      localStorage.setItem(CLAVE_HUELLA, huella);
      setEstado({ registrado: true, estado: result.estado });
      setPin('');
      setMensaje(result.mensaje);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo registrar este celular.');
    } finally { setOcupado(false); }
  }

  const pendiente = estado?.registrado && estado.estado === 'pendiente';
  const revocado = estado?.registrado && estado.estado === 'revocado';

  return (
    <main className="worker-shell">
      <header className="worker-topbar">
        <Link className="worker-brand" href="/" aria-label="NerWork, inicio"><span className="worker-brand-mark">✓</span><span>nerwork<span className="worker-brand-dot">.</span></span></Link>
        <Link className="worker-admin-link" href="/admin/login">Administración <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="worker-hero">
        <div className="worker-eyebrow"><span /> CONTROL DE EQUIPO</div>
        <h1>Tu jornada,<br /><span>en orden.</span></h1>
        <p>Registra tu asistencia de forma sencilla y segura.</p>
        <div className="worker-orbit worker-orbit-one" /><div className="worker-orbit worker-orbit-two" />
        <div className="worker-stamp"><span className="worker-stamp-icon">◉</span><span>Simple.<br />Claro.<br />Confiable.</span></div>
      </section>

      <section className="worker-card" aria-labelledby="worker-title">
        <div className="worker-card-heading"><div><span className="worker-kicker">PORTAL DEL TRABAJADOR</span><h2 id="worker-title">Hola, buen día</h2></div><span className="worker-date">{new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span></div>
        <div className="worker-clock"><span>HORA LOCAL</span><strong>{hora}</strong><small>La hora oficial se valida en el servidor</small></div>

        {!estado?.registrado && <>
          <div className="worker-info-row"><span className="worker-icon">◉</span><div><strong>Registra este celular</strong><span>Ingresa el NIP que te proporcionó el administrador.</span></div><span className="worker-pill">NIP</span></div>
          <form className="worker-enroll-form" onSubmit={registrarDispositivo}>
            <label htmlFor="worker-pin">NIP de cuatro dígitos</label>
            <div><input id="worker-pin" inputMode="numeric" autoComplete="one-time-code" maxLength={4} pattern="[0-9]{4}" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" required /><button type="submit" disabled={ocupado}>{ocupado ? 'Registrando…' : 'Vincular celular'}</button></div>
          </form>
        </>}

        {pendiente && <div className="worker-info-row"><span className="worker-icon">◷</span><div><strong>Dispositivo pendiente</strong><span>El administrador debe asignarlo a tu nombre.</span></div><span className="worker-pill pending">Pendiente</span></div>}
        {revocado && <div className="worker-info-row"><span className="worker-icon">!</span><div><strong>Celular revocado</strong><span>Contacta al administrador para solicitar una nueva asignación.</span></div><span className="worker-pill pending">Revocado</span></div>}
        {estado?.estado === 'activo' && <div className="worker-info-row"><span className="worker-icon">✓</span><div><strong>{estado.nombre ?? 'Dispositivo autorizado'}</strong><span>GPS obligatorio · sin mapas</span></div><span className="worker-pill active">Autorizado</span></div>}

        {marca?.ok && <div className="worker-result"><span className="worker-result-mark">✓</span><div><strong>{marca.tipo === 'ENTRADA' ? 'Entrada registrada' : 'Salida registrada'}</strong><span>{marca.hora} · {marca.nombre}</span></div></div>}
        {ocupado && estado?.estado === 'activo' && <div className="worker-result"><span className="worker-spinner" /><div><strong>Registrando asistencia…</strong><span>Validamos GPS y zona permitida.</span></div></div>}
        {mensaje && <p className={`worker-message ${marca?.ok ? 'success' : ''}`} role="status">{mensaje}</p>}
        <p className="worker-privacy">⌑ La ubicación solo se consulta al intentar marcar y no se muestra en mapas.</p>
      </section>

      <footer className="worker-footer"><span>CONTROL DE ASISTENCIA</span><span>Hecho para trabajar mejor <b>✳</b></span></footer>
    </main>
  );
}
