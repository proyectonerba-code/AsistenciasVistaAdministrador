/**
 * /admin/personas/[id] — ficha individual con el detalle semana por semana.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerSemanasDePersona } from "@/server/personas";
import { PersonaSemana } from "@/components/ui/persona-semana";

export default async function PersonaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ficha = await obtenerSemanasDePersona(id, 6);

  if (!ficha) notFound();

  const { usuario } = ficha;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/asistencia"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition hover:text-primary"
      >
        ← Volver al panel
      </Link>

      <header className="u-card flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="u-display text-3xl font-extrabold leading-tight text-ink lg:text-4xl">
            {usuario.nombre}
          </h1>
          <p className="mt-2 text-ink-muted">{usuario.correo}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="u-badge u-badge-neutral">{usuario.area}</span>
            {ficha.legajo && (
              <span className="u-badge u-badge-info">
                Legajo #{ficha.legajo}
              </span>
            )}
            {ficha.etiquetaNfc && (
              <span className="u-badge u-badge-neutral">
                <span className="u-mono normal-case tracking-normal">
                  #{ficha.etiquetaNfc}
                </span>
              </span>
            )}
            <span className="u-badge u-badge-neutral">
              {usuario.minutosComida} min de comida
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="u-label">Lunes a viernes</dt>
            <dd className="u-mono tnum mt-1 font-semibold text-ink">
              {ficha.jornada}
            </dd>
          </div>
          <div>
            <dt className="u-label">Sábado</dt>
            <dd className="u-mono tnum mt-1 font-semibold text-ink">
              {ficha.sabado}
            </dd>
          </div>
        </dl>
      </header>

      <div className="flex items-center justify-between">
        <h2 className="u-display text-xl font-bold text-ink">
          Historial semanal
        </h2>
        <span className="u-badge u-badge-neutral">
          Semana más reciente arriba
        </span>
      </div>

      <PersonaSemana semanas={ficha.semanas} />
    </div>
  );
}
