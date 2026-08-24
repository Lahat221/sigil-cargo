"use client";

import { useState, useTransition } from "react";
import {
  genererDocumentsFrance,
  regenererDepuisDernierJson,
  type ResultatDocumentsFrance,
} from "@/app/(dashboard)/gestion-douaniere/dedouanement-france/actions";
import { IconDownload, IconFileText } from "@/components/ui/Icons";

function telechargerBase64(base64: string, filename: string) {
  const octets = atob(base64);
  const tableau = new Uint8Array(octets.length);
  for (let i = 0; i < octets.length; i++) tableau[i] = octets.charCodeAt(i);
  const blob = new Blob([tableau], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const montantFormatter = new Intl.NumberFormat("fr-FR");

export function GenerationFranceSection({ projetId }: { projetId: string }) {
  const [isPending, startTransition] = useTransition();
  const [resultat, setResultat] = useState<ResultatDocumentsFrance | null>(null);
  const [copie, setCopie] = useState(false);

  function generer() {
    setResultat(null);
    startTransition(async () => {
      const r = await genererDocumentsFrance(projetId);
      setResultat(r);
    });
  }

  function regenerer() {
    setResultat(null);
    startTransition(async () => {
      const r = await regenererDepuisDernierJson(projetId);
      setResultat(r);
    });
  }

  function copierMail(texte: string) {
    navigator.clipboard.writeText(texte).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">Génération des documents</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={regenerer}
            disabled={isPending}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            title="Reconstruit les 3 fichiers à partir de la dernière analyse déjà validée, sans rappeler l'IA (gratuit, instantané)."
          >
            Régénérer (sans rappeler l&apos;IA)
          </button>
          <button
            type="button"
            onClick={generer}
            disabled={isPending}
            className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy shadow-sm transition-all hover:shadow-md hover:brightness-105 disabled:opacity-50"
          >
            {isPending ? "Génération en cours (Claude analyse le packing)..." : "Générer les documents"}
          </button>
        </div>
      </div>

      {resultat && "error" in resultat && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {resultat.error}
        </p>
      )}

      {resultat && "ok" in resultat && resultat.ok && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Valeur</p>
              <p className="font-semibold text-navy">
                {montantFormatter.format(resultat.recap.valeurTotaleFcfa)} FCFA
              </p>
              <p className="text-xs text-slate-400">{resultat.recap.valeurTotaleEur.toFixed(2)} €</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Poids</p>
              <p className="font-semibold text-navy">{resultat.recap.poidsTotalKg} kg</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Lignes DAU</p>
              <p className="font-semibold text-navy">
                {resultat.recap.nbLignesRegroupees}{" "}
                <span className="text-xs font-normal text-slate-400">
                  (vs {resultat.recap.nbLignesBrutes})
                </span>
              </p>
              <p className="text-xs text-emerald-600">
                -{resultat.recap.economieTransitaireEur} € transitaire
              </p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Part REX</p>
              <p className="font-semibold text-navy">{resultat.recap.partRexPct.toFixed(1)}%</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Droits de douane</p>
              <p className="font-semibold text-navy">{resultat.recap.droitsTotauxEur.toFixed(2)} €</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">TVA (autoliquidée ATVAI)</p>
              <p className="font-semibold text-navy">{resultat.recap.tvaTotaleEur.toFixed(2)} €</p>
              <p className="text-xs text-emerald-600">0,00 € cash</p>
            </div>
          </div>

          {resultat.recap.alertes.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p className="mb-1 font-medium">Alertes</p>
              <ul className="list-inside list-disc">
                {resultat.recap.alertes.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => telechargerBase64(resultat.fichiers.facture.base64, resultat.fichiers.facture.filename)}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <IconDownload size={15} />
              Facture commerciale
            </button>
            <button
              type="button"
              onClick={() =>
                telechargerBase64(resultat.fichiers.packingList.base64, resultat.fichiers.packingList.filename)
              }
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <IconDownload size={15} />
              Packing list
            </button>
            <button
              type="button"
              onClick={() =>
                telechargerBase64(
                  resultat.fichiers.declarationDouane.base64,
                  resultat.fichiers.declarationDouane.filename
                )
              }
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <IconDownload size={15} />
              Déclaration douane
            </button>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <IconFileText size={15} />
                Mail transitaire
              </p>
              <button
                type="button"
                onClick={() => copierMail(resultat.mail)}
                className="text-xs text-gold-2 hover:underline"
              >
                {copie ? "Copié !" : "Copier"}
              </button>
            </div>
            <textarea
              readOnly
              value={resultat.mail}
              rows={12}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
            />
          </div>
        </div>
      )}
    </div>
  );
}
