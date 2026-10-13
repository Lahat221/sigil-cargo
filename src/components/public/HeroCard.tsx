"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCalculator, IconTruck, IconWhatsApp } from "@/components/ui/Icons";
import type { ReglesPrix } from "@/lib/parametres";

export type DestinationPrix = { nom: string; tarif: number | null };

type Onglet = "estimer" | "suivi";

const CHAMP =
  "w-full rounded-lg border border-white/15 bg-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-gold-1 focus:outline-none [&>option]:text-slate-900";

export function HeroCard({
  destinations,
  regles,
  whatsapp,
  devise,
}: {
  destinations: DestinationPrix[];
  regles: ReglesPrix;
  whatsapp: string | null;
  devise: string;
}) {
  const calculateurActif = destinations.length > 0;
  const [onglet, setOnglet] = useState<Onglet>(calculateurActif ? "estimer" : "suivi");

  const [destination, setDestination] = useState(destinations[0]?.nom ?? "");
  const [type, setType] = useState<"colis" | "enveloppe">("colis");
  const [poids, setPoids] = useState("");

  // Les liens de la page (#suivi, #estimer) ouvrent le bon onglet.
  useEffect(() => {
    function synchroniser() {
      if (window.location.hash === "#suivi") setOnglet("suivi");
      else if (window.location.hash === "#estimer" && calculateurActif) setOnglet("estimer");
    }
    synchroniser();
    window.addEventListener("hashchange", synchroniser);
    return () => window.removeEventListener("hashchange", synchroniser);
  }, [calculateurActif]);

  const format = useMemo(
    () => new Intl.NumberFormat("fr-FR", { style: "currency", currency: devise }),
    [devise]
  );

  const resultat = useMemo(() => {
    const dest = destinations.find((d) => d.nom === destination);
    if (!dest) return null;
    if (type === "enveloppe") {
      return { total: regles.forfaitEnveloppe, detail: "Forfait enveloppe (documents)" };
    }
    const kg = parseFloat(poids.replace(",", "."));
    if (Number.isNaN(kg) || kg <= 0) return null;
    const petit = kg < regles.seuilPetitColisKg;
    const tarif = petit ? regles.petitColisParKg : dest.tarif;
    if (tarif === null) return { total: null, detail: "Tarif sur demande pour cette destination" };
    return {
      total: kg * tarif,
      detail: `${kg.toLocaleString("fr-FR")} kg × ${format.format(tarif)}/kg${
        petit ? " (tarif petit colis)" : ""
      }`,
    };
  }, [destinations, destination, type, poids, regles, format]);

  const lienWhatsapp =
    whatsapp && resultat
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
          `Bonjour, je souhaite envoyer ${
            type === "enveloppe" ? "une enveloppe" : `${poids} kg`
          } vers ${destination}${
            resultat.total !== null ? ` (estimation ${format.format(resultat.total)})` : ""
          }.`
        )}`
      : null;

  return (
    <div
      id="suivi"
      className="scroll-mt-28 rounded-2xl border border-white/15 bg-white/[0.06] p-2 shadow-2xl shadow-black/30 backdrop-blur-md"
    >
      <span id="estimer" className="block scroll-mt-28" />
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1">
        {calculateurActif && (
          <button
            type="button"
            role="tab"
            aria-selected={onglet === "estimer"}
            onClick={() => setOnglet("estimer")}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              onglet === "estimer"
                ? "bg-gold-gradient text-navy shadow"
                : "text-white/70 hover:text-white"
            }`}
          >
            <IconCalculator size={16} />
            Estimer mon envoi
          </button>
        )}
        <button
          type="button"
          role="tab"
          aria-selected={onglet === "suivi"}
          onClick={() => setOnglet("suivi")}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
            calculateurActif ? "" : "col-span-2"
          } ${
            onglet === "suivi"
              ? "bg-gold-gradient text-navy shadow"
              : "text-white/70 hover:text-white"
          }`}
        >
          <IconTruck size={16} />
          Suivre mon colis
        </button>
      </div>

      <div className="p-4 sm:p-5">
        {onglet === "estimer" && calculateurActif ? (
          <div className="space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">
                Destination
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className={CHAMP}
              >
                {destinations.map((d) => (
                  <option key={d.nom} value={d.nom}>
                    {d.nom}
                    {d.tarif !== null && ` — ${format.format(d.tarif)}/kg`}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/20 p-1 text-sm">
              {(
                [
                  ["colis", "Colis / valise"],
                  ["enveloppe", "Enveloppe"],
                ] as const
              ).map(([valeur, label]) => (
                <button
                  key={valeur}
                  type="button"
                  onClick={() => setType(valeur)}
                  className={`rounded-md px-3 py-2 font-medium transition-colors ${
                    type === valeur ? "bg-white/15 text-white" : "text-white/55 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {type === "colis" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Poids (kg)
                </label>
                <input
                  inputMode="decimal"
                  value={poids}
                  onChange={(e) => setPoids(e.target.value)}
                  placeholder="Ex. 23"
                  className={CHAMP}
                />
              </div>
            )}

            <div className="rounded-xl border border-gold-1/25 bg-gold-1/[0.07] p-4 text-center">
              {resultat ? (
                <>
                  <p className="text-xs font-medium uppercase tracking-wider text-gold-1">
                    Estimation
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-white">
                    {resultat.total !== null ? format.format(resultat.total) : "Sur demande"}
                  </p>
                  <p className="mt-1 text-xs text-white/60">{resultat.detail}</p>
                </>
              ) : (
                <p className="py-2 text-sm text-white/55">
                  Indiquez le poids pour voir votre estimation.
                </p>
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-white/40">
              Estimation indicative : le montant définitif est confirmé lors du dépôt de
              votre colis.
            </p>

            <p className="text-center text-xs text-white/55">
              Grand colis, palettes ou professionnel ?{" "}
              <a href="#devis" className="font-semibold text-gold-1 hover:underline">
                Demandez un devis
              </a>
            </p>

            {lienWhatsapp && (
              <a
                href={lienWhatsapp}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-gold-gradient px-4 py-3 text-sm font-semibold text-navy shadow-md transition-all hover:brightness-105"
              >
                <IconWhatsApp size={16} />
                Envoyer cette demande sur WhatsApp
              </a>
            )}
          </div>
        ) : (
          <form action="/suivi" className="space-y-3.5">
            <p className="text-sm leading-relaxed text-white/60">
              Entrez le numéro de colis et le téléphone donnés lors du dépôt pour voir
              l&apos;avancement en temps réel.
            </p>
            <input
              type="text"
              name="numero"
              placeholder="N° de colis"
              required
              className={CHAMP}
            />
            <input
              type="tel"
              name="telephone"
              placeholder="Téléphone donné au dépôt"
              required
              className={CHAMP}
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-gold-gradient px-4 py-3 text-sm font-semibold text-navy shadow-md transition-all hover:brightness-105"
            >
              Suivre en temps réel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
