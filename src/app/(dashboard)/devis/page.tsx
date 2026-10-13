import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { chiffresWhatsapp } from "@/lib/devis/format";
import { DevisActions } from "@/components/devis/DevisActions";
import { IconWhatsApp } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const jourFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

const STATUTS = [
  { valeur: "", label: "Toutes" },
  { valeur: "nouvelle", label: "Nouvelles" },
  { valeur: "en_cours", label: "En cours" },
  { valeur: "traitee", label: "Traitées" },
] as const;

const STYLE_STATUT: Record<string, string> = {
  nouvelle: "bg-gold-1/20 text-gold-2",
  en_cours: "bg-blue-100 text-blue-800",
  traitee: "bg-green-100 text-green-800",
};

export default async function DemandesDevisPage({
  searchParams,
}: {
  searchParams: { statut?: string };
}) {
  const supabase = createClient();
  const filtre = STATUTS.some((s) => s.valeur === searchParams.statut)
    ? (searchParams.statut ?? "")
    : "";

  let requete = supabase
    .from("demandes_devis")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filtre) requete = requete.eq("statut", filtre as "nouvelle" | "en_cours" | "traitee");

  const [{ data: demandes, error }, { count: nbNouvelles }] = await Promise.all([
    requete,
    supabase
      .from("demandes_devis")
      .select("id", { count: "exact", head: true })
      .eq("statut", "nouvelle"),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-xl font-bold text-ink">Demandes de devis</h1>
      <p className="mb-4 text-sm text-ink-muted">
        Demandes envoyées depuis le site public (grands colis et professionnels).
        {(nbNouvelles ?? 0) > 0 && (
          <span className="ml-1 font-semibold text-gold-1">
            {nbNouvelles} nouvelle{(nbNouvelles ?? 0) > 1 ? "s" : ""} à traiter.
          </span>
        )}
      </p>

      <nav className="mb-5 flex flex-wrap gap-1 rounded-lg bg-white/5 p-1">
        {STATUTS.map((s) => (
          <Link
            key={s.valeur}
            href={s.valeur ? `/devis?statut=${s.valeur}` : "/devis"}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filtre === s.valeur
                ? "bg-gold-1/15 text-gold-1"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Erreur : {error.message}
        </p>
      ) : !demandes || demandes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/20 px-4 py-12 text-center text-sm text-ink-muted">
          Aucune demande de devis pour l&apos;instant.
        </p>
      ) : (
        <div className="space-y-3">
          {demandes.map((d) => (
            <article
              key={d.id}
              className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    {d.nom}
                    {d.entreprise && (
                      <span className="font-normal text-slate-500">· {d.entreprise}</span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE_STATUT[d.statut]}`}
                    >
                      {d.statut === "nouvelle" ? "Nouvelle" : d.statut === "en_cours" ? "En cours" : "Traitée"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {d.type === "professionnel" ? "Professionnel" : "Grand colis"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {dateFormatter.format(new Date(d.created_at))}
                  </p>
                </div>
                <DevisActions id={d.id} statut={d.statut} />
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {d.destination && (
                  <div>
                    <dt className="text-xs text-slate-400">Destination</dt>
                    <dd className="font-medium text-slate-800">{d.destination}</dd>
                  </div>
                )}
                {d.poids_estime && (
                  <div>
                    <dt className="text-xs text-slate-400">Poids / volume estimé</dt>
                    <dd className="font-medium text-slate-800">{d.poids_estime}</dd>
                  </div>
                )}
                {d.date_souhaitee && (
                  <div>
                    <dt className="text-xs text-slate-400">Date souhaitée</dt>
                    <dd className="font-medium text-slate-800">
                      {jourFormatter.format(new Date(d.date_souhaitee))}
                    </dd>
                  </div>
                )}
                {d.email && (
                  <div>
                    <dt className="text-xs text-slate-400">Email</dt>
                    <dd className="font-medium text-slate-800">
                      <a href={`mailto:${d.email}`} className="hover:underline">
                        {d.email}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 px-3.5 py-3 text-sm text-slate-700">
                {d.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <a
                  href={`tel:${d.telephone}`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                >
                  {d.telephone}
                </a>
                <a
                  href={`https://wa.me/${chiffresWhatsapp(d.telephone)}?text=${encodeURIComponent(
                    `Bonjour ${d.nom}, merci pour votre demande de devis. `
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-gold-gradient px-3 py-1.5 font-semibold text-navy shadow-sm hover:brightness-105"
                >
                  <IconWhatsApp size={15} />
                  Répondre sur WhatsApp
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
