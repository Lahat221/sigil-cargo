"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { envoyerDemandeDevis } from "@/lib/devis/actions";
import { IconCheckCircle } from "@/components/ui/Icons";

const CHAMP =
  "w-full rounded-lg border border-white/15 bg-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-gold-1 focus:outline-none [&>option]:text-slate-900";
const LABEL = "mb-1.5 block text-xs font-medium text-white/60";

export function DevisForm({
  destinations,
  legalDisponible,
}: {
  destinations: string[];
  legalDisponible: boolean;
}) {
  const ouvertA = useRef(Date.now());
  const [type, setType] = useState<"grand_colis" | "professionnel">("grand_colis");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const f = new FormData(e.currentTarget);
    const lire = (cle: string) => String(f.get(cle) ?? "");

    startTransition(async () => {
      const r = await envoyerDemandeDevis({
        type,
        nom: lire("nom"),
        entreprise: lire("entreprise"),
        telephone: lire("telephone"),
        email: lire("email"),
        destination: lire("destination"),
        poidsEstime: lire("poids"),
        description: lire("description"),
        dateSouhaitee: lire("date"),
        siteWeb: lire("site_web"),
        ouvertA: ouvertA.current,
      });
      if ("error" in r) setErreur(r.error);
      else setEnvoye(true);
    });
  }

  if (envoye) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-gold-1/30 bg-gold-1/[0.07] p-10 text-center">
        <IconCheckCircle size={44} className="text-gold-1" />
        <h3 className="text-xl font-bold">Demande envoyée</h3>
        <p className="max-w-sm text-sm leading-relaxed text-white/65">
          Merci ! Nous étudions votre besoin et revenons vers vous rapidement, de préférence
          par WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-white/15 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-7"
    >
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1 text-sm">
        {(
          [
            ["grand_colis", "Grand colis"],
            ["professionnel", "Professionnel"],
          ] as const
        ).map(([valeur, label]) => (
          <button
            key={valeur}
            type="button"
            onClick={() => setType(valeur)}
            className={`rounded-lg px-3 py-2.5 font-semibold transition-colors ${
              type === valeur ? "bg-gold-gradient text-navy shadow" : "text-white/65 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="devis-nom">Votre nom *</label>
          <input id="devis-nom" name="nom" required maxLength={100} className={CHAMP} />
        </div>
        <div>
          <label className={LABEL} htmlFor="devis-tel">Téléphone / WhatsApp *</label>
          <input
            id="devis-tel"
            name="telephone"
            type="tel"
            required
            maxLength={30}
            placeholder="+221 …"
            className={CHAMP}
          />
        </div>
      </div>

      {type === "professionnel" && (
        <div>
          <label className={LABEL} htmlFor="devis-entreprise">Entreprise</label>
          <input id="devis-entreprise" name="entreprise" maxLength={120} className={CHAMP} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="devis-email">Email (optionnel)</label>
          <input id="devis-email" name="email" type="email" maxLength={120} className={CHAMP} />
        </div>
        <div>
          <label className={LABEL} htmlFor="devis-destination">Destination</label>
          {destinations.length > 0 ? (
            <select id="devis-destination" name="destination" className={CHAMP} defaultValue="">
              <option value="">— À préciser —</option>
              {destinations.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          ) : (
            <input id="devis-destination" name="destination" maxLength={80} className={CHAMP} />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="devis-poids">Poids / volume estimé</label>
          <input
            id="devis-poids"
            name="poids"
            maxLength={80}
            placeholder="Ex. 300 kg, 4 palettes"
            className={CHAMP}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="devis-date">Date d&apos;envoi souhaitée</label>
          <input id="devis-date" name="date" type="date" className={CHAMP} />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="devis-description">Marchandises à envoyer *</label>
        <textarea
          id="devis-description"
          name="description"
          required
          rows={4}
          maxLength={2000}
          placeholder="Nature des marchandises, nombre de colis, dimensions, contraintes particulières…"
          className={CHAMP}
        />
      </div>

      {/* Champ piège anti-robots : invisible pour les humains. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {erreur && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
          {erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-gold-gradient px-5 py-3.5 text-sm font-semibold text-navy shadow-lg shadow-gold-2/25 transition-all hover:brightness-105 disabled:opacity-60"
      >
        {isPending ? "Envoi en cours…" : "Demander mon devis"}
      </button>

      <p className="text-[11px] leading-relaxed text-white/40">
        Vos informations servent uniquement à répondre à votre demande
        {legalDisponible && (
          <>
            {" "}(voir la{" "}
            <Link href="/legal/confidentialite" className="underline hover:text-white/70">
              politique de confidentialité
            </Link>
            )
          </>
        )}
        .
      </p>
    </form>
  );
}
