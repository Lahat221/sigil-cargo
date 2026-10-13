"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  sauvegarderReglagesIA,
  testerAgentIA,
} from "@/app/(dashboard)/parametres/agent-whatsapp/actions";
import type { ReglagesIA } from "@/lib/whatsapp-ia/reglages";
import { MessageForm } from "./MonCompteForms";
import { BOUTON_PRIMAIRE, BOUTON_SECONDAIRE, INPUT_CLASS } from "./styles";

type Prerequis = { claude: boolean; twilio: boolean; proprietaire: boolean };

const LIBELLES_OUTILS: Record<string, string> = {
  suivre_colis: "suivi de colis",
  estimer_prix: "estimation de prix",
  prochains_departs: "prochains départs",
  enregistrer_demande_devis: "demande de devis",
  transferer_a_un_humain: "transfert à un humain",
};

export function AgentIAForm({
  initial,
  prerequis,
}: {
  initial: ReglagesIA;
  prerequis: Prerequis;
}) {
  const [actif, setActif] = useState(initial.actif);
  const [consignes, setConsignes] = useState(initial.consignes);
  const [contacts, setContacts] = useState(initial.contacts);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [testMessage, setTestMessage] = useState("");
  const [testTelephone, setTestTelephone] = useState("");
  const [testEnCours, startTest] = useTransition();
  const [testResultat, setTestResultat] = useState<
    { reponse: string; outils: string[]; transfert: boolean } | { error: string } | null
  >(null);

  const pret = prerequis.claude && prerequis.twilio;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const r = await sauvegarderReglagesIA({ actif, consignes, contacts });
      setMessage(
        "error" in r
          ? { type: "erreur", texte: r.error }
          : {
              type: "ok",
              texte: actif
                ? "Enregistré — l'agent répond maintenant aux clients."
                : "Enregistré — l'agent est désactivé.",
            }
      );
    });
  }

  function handleTest() {
    setTestResultat(null);
    startTest(async () => {
      setTestResultat(await testerAgentIA(testMessage, testTelephone, consignes, contacts));
    });
  }

  const ligne = (ok: boolean, texte: string) => (
    <li className={ok ? "text-green-700" : "text-red-600"}>
      {ok ? "✓" : "✗"} {texte}
    </li>
  );

  return (
    <div className="space-y-6">
      <ul className="space-y-0.5 text-sm">
        {ligne(prerequis.claude, "Clé Claude (Anthropic) configurée")}
        {ligne(prerequis.twilio, "WhatsApp (Twilio) configuré")}
        {ligne(prerequis.proprietaire, "Votre numéro d'alerte configuré")}
      </ul>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
          <input
            type="checkbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
            disabled={!pret}
            className="h-4 w-4"
          />
          <span className="text-sm">
            <span className="font-medium text-slate-900">Activer l&apos;agent IA</span>
            <span className="block text-slate-500">
              Testez-le d&apos;abord ci-dessous avant de l&apos;activer.
            </span>
          </span>
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Numéros à communiquer aux clients
          </label>
          <textarea
            value={contacts}
            onChange={(e) => setContacts(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={"France (WhatsApp) : +33 6 95 81 11 29\nDakar : +221 77 000 00 00"}
            className={INPUT_CLASS}
          />
          <p className="mt-1 text-xs text-slate-500">
            L&apos;agent donne ces numéros quand un client veut plus d&apos;informations ou
            parler à quelqu&apos;un, et jamais d&apos;autres. Vide : il donne le WhatsApp du
            site (Paramètres → Site public).
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Informations et consignes pour l&apos;agent
          </label>
          <textarea
            value={consignes}
            onChange={(e) => setConsignes(e.target.value)}
            rows={5}
            maxLength={3000}
            placeholder="Plus vous en écrivez, plus l'agent répond seul. Ex : Paiement accepté : espèces, Wave, Orange Money. Dépôt ouvert du lundi au samedi, 9h-18h. Les colis doivent être fermés et étiquetés. Pour Marseille, premier départ début novembre."
            className={INPUT_CLASS}
          />
          <p className="mt-1 text-xs text-slate-500">
            Tout ce que l&apos;agent doit savoir : modes de paiement, jours d&apos;ouverture,
            conditions, réponses types... Il l&apos;utilise comme source fiable. Il ne
            révèle jamais vos chiffres internes (CA, dépenses, marges), les données des
            autres clients ni vos contrats fournisseurs, et ne promet ni remboursement ni
            réduction. Les tarifs viennent de la page Tarifs.
          </p>
        </div>

        <MessageForm message={message} />
        <button type="submit" disabled={isPending} className={BOUTON_PRIMAIRE}>
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>

      <div className="space-y-3 border-t border-slate-200 pt-5">
        <h3 className="font-semibold text-slate-900">Tester l&apos;agent</h3>
        <p className="text-sm text-slate-500">
          Simulation : Claude répond vraiment, mais rien n&apos;est envoyé ni enregistré.
          Indiquez un numéro de client pour tester le suivi de ses colis.
        </p>
        <input
          value={testTelephone}
          onChange={(e) => setTestTelephone(e.target.value)}
          placeholder="Numéro de client (optionnel), ex. +33 6 12 34 56 78"
          className={INPUT_CLASS}
        />
        <textarea
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          rows={2}
          placeholder="Ex : Combien coûte un colis de 12 kg pour Lyon ?"
          className={INPUT_CLASS}
        />
        <button
          type="button"
          onClick={handleTest}
          disabled={testEnCours || !prerequis.claude}
          className={BOUTON_SECONDAIRE}
        >
          {testEnCours ? "L'agent réfléchit..." : "Envoyer le test"}
        </button>

        {testResultat && "error" in testResultat && (
          <MessageForm message={{ type: "erreur", texte: testResultat.error }} />
        )}
        {testResultat && "reponse" in testResultat && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="whitespace-pre-wrap text-slate-800">{testResultat.reponse}</p>
            {(testResultat.outils.length > 0 || testResultat.transfert) && (
              <p className="mt-2 text-xs text-slate-500">
                Outils utilisés :{" "}
                {testResultat.outils.map((o) => LIBELLES_OUTILS[o] ?? o).join(", ") || "aucun"}
                {testResultat.transfert && " — aurait transféré à un humain"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
