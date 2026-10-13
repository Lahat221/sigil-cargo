import { IconGlobe } from "@/components/ui/Icons";
import { SectionTitre } from "./Sections";

export type ReseauSocial = { id: string; titre: string; lien: string };
export type Plateforme =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "youtube"
  | "autre";

// Reconnaît la plateforme d'après le lien (ou, à défaut, le titre saisi).
export function plateforme(r: ReseauSocial): Plateforme {
  const texte = `${r.lien} ${r.titre}`.toLowerCase();
  if (texte.includes("tiktok")) return "tiktok";
  if (texte.includes("instagram")) return "instagram";
  if (texte.includes("facebook") || texte.includes("fb.com")) return "facebook";
  if (texte.includes("youtube") || texte.includes("youtu.be")) return "youtube";
  return "autre";
}

// TikTok en premier, puis l'ordre défini dans Publicités.
export function trierReseaux(reseaux: ReseauSocial[]): ReseauSocial[] {
  return [...reseaux].sort(
    (a, b) => Number(plateforme(b) === "tiktok") - Number(plateforme(a) === "tiktok")
  );
}

export function IconReseau({
  plateforme: p,
  size = 20,
  className,
}: {
  plateforme: Plateforme;
  size?: number;
  className?: string;
}) {
  const trait = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (p === "tiktok") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    );
  }
  if (p === "instagram") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden {...trait}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (p === "facebook") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M14 8.2h2.2V5H13.6C11.4 5 10 6.4 10 8.6V10H7.8v3.2H10V20h3.2v-6.8h2.4l.4-3.2h-2.8V8.9c0-.5.3-.7.8-.7Z" />
      </svg>
    );
  }
  if (p === "youtube") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden {...trait}>
        <rect x="2.5" y="6" width="19" height="12" rx="3.5" />
        <path d="M10 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return <IconGlobe size={size} className={className} />;
}

const NOMS: Record<Plateforme, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  autre: "",
};

// Rangée d'icônes discrète (sous l'accroche de l'accueil).
export function BarreReseaux({ reseaux }: { reseaux: ReseauSocial[] }) {
  if (reseaux.length === 0) return null;
  return (
    <div className="mt-8 flex items-center gap-3">
      <span className="text-sm text-white/45">Suivez-nous</span>
      {trierReseaux(reseaux).map((r) => {
        const p = plateforme(r);
        return (
          <a
            key={r.id}
            href={r.lien}
            target="_blank"
            rel="noreferrer"
            aria-label={NOMS[p] || r.titre}
            title={NOMS[p] || r.titre}
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all hover:-translate-y-0.5 ${
              p === "tiktok"
                ? "border-gold-1/50 bg-gold-1/15 text-gold-1 hover:bg-gold-1/25"
                : "border-white/15 bg-white/[0.05] text-white/75 hover:bg-white/15 hover:text-white"
            }`}
          >
            <IconReseau plateforme={p} size={18} />
          </a>
        );
      })}
    </div>
  );
}

// Section dédiée : TikTok en grande carte mise en avant, les autres réseaux
// en cartes secondaires.
export function SectionReseaux({ reseaux }: { reseaux: ReseauSocial[] }) {
  if (reseaux.length === 0) return null;
  const tries = trierReseaux(reseaux);
  const tiktok = tries.find((r) => plateforme(r) === "tiktok");
  const autres = tries.filter((r) => r !== tiktok);

  return (
    <section id="reseaux" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitre
          eyebrow="Communauté"
          titre="Suivez-nous"
          description="Départs, colis et coulisses du fret : retrouvez-nous au quotidien."
        />

        <div
          className={`grid gap-5 ${
            tiktok && autres.length > 0 ? "lg:grid-cols-[1.3fr_1fr]" : ""
          }`}
        >
          {tiktok && (
            <a
              href={tiktok.lien}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-3xl border border-gold-1/30 bg-gradient-to-br from-gold-1/[0.14] via-white/[0.04] to-transparent p-8 transition-all hover:-translate-y-1 hover:border-gold-1/60 sm:p-10"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-gold-1/20 blur-[70px] transition-opacity group-hover:opacity-100"
              />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gold-gradient text-navy shadow-lg shadow-gold-2/30">
                  <IconReseau plateforme="tiktok" size={38} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-1">
                    Notre réseau phare
                  </p>
                  <h3 className="mt-1 text-2xl font-bold sm:text-3xl">
                    Suivez-nous sur TikTok
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-white/65">
                    Nos départs, nos colis et les coulisses du fret en vidéo. Abonnez-vous pour ne
                    rien manquer.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-navy shadow-md transition-all group-hover:shadow-lg">
                    Voir notre TikTok
                    <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </a>
          )}

          {autres.length > 0 && (
            <div
              className={`grid gap-4 ${
                tiktok ? "content-center" : "sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {autres.map((r) => {
                const p = plateforme(r);
                return (
                  <a
                    key={r.id}
                    href={r.lien}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-all hover:-translate-y-0.5 hover:border-gold-1/30 hover:bg-white/[0.08]"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-1/15 text-gold-1">
                      <IconReseau plateforme={p} size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-white">{NOMS[p] || r.titre}</span>
                      <span className="block text-xs text-white/50">Suivre notre page</span>
                    </span>
                    <span aria-hidden className="text-gold-1 transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
