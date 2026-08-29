import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

// Marque vectorielle SIGIL CARGO — spécifique à ce tenant. Un autre tenant
// avec son propre logo (fichier fourni, déposé dans /public et référencé
// par BRAND.logoImagePath) affiche directement ce fichier ; sans fichier
// fourni, le texte seul (dans Logo ci-dessous) sert de repli fonctionnel.
export function LogoMark({ size = 32 }: { size?: number }) {
  if (BRAND.slug !== "sigil-cargo") {
    if (!BRAND.logoImagePath) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={BRAND.logoImagePath}
        alt={BRAND.nom}
        width={size}
        height={size}
        className="shrink-0 rounded object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="sigil-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7D97A" />
          <stop offset="0.55" stopColor="#EBBF52" />
          <stop offset="1" stopColor="#C9962F" />
        </linearGradient>
        <radialGradient id="sigil-sun" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#FCEBAE" />
          <stop offset="0.6" stopColor="#F3CE63" />
          <stop offset="1" stopColor="#D9A63C" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="33" r="9.5" fill="url(#sigil-sun)" />
      <path
        d="M28,77 L60,43 L92,77 L79,77 L60,57 L41,77 Z"
        fill="url(#sigil-gold)"
      />
      <path
        d="M41,92 L60,71 L79,92 L70,92 L60,81 L50,92 Z"
        fill="url(#sigil-gold)"
        opacity="0.55"
      />
    </svg>
  );
}

export function Logo({
  tagline = false,
  size = 32,
}: {
  tagline?: boolean;
  size?: number;
}) {
  const [premier, ...reste] = BRAND.nom.split(" ");
  const suite = reste.join(" ");

  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      <div className="leading-none">
        <div className="text-lg font-extrabold tracking-wide text-white">
          {premier}
          {suite && <span className="font-semibold text-gold-1"> {suite}</span>}
        </div>
        {tagline && (
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-1">
            {BRAND.tagline}
          </div>
        )}
      </div>
    </div>
  );
}
