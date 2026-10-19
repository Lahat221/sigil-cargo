// Produits sénégalais courants cités en wolof dans les descriptions de colis.
// Sert de culture générale à l'IA quand le référentiel n'a pas (encore) le
// produit ; il ne contient volontairement AUCUN code HS : le classement vient
// du référentiel (corrections validées) ou de l'estimation de l'IA.
// Les sens marqués « à confirmer » sont indicatifs.

const TERMES: [terme: string, sens: string][] = [
  ["bissap (bissab)", "fleurs séchées d'hibiscus (oseille de Guinée), pour boisson"],
  ["bouye (buy, bouy)", "pulpe séchée du fruit du baobab (pain de singe), en poudre"],
  ["maad (madd, made)", "fruit séché de Saba senegalensis (liane saba)"],
  ["ditakh (ditax)", "fruit du Detarium senegalense, frais ou séché"],
  ["daqaar", "tamarin (fruit du tamarinier)"],
  ["solom (solome)", "tamarin noir / tamarin velours (Dialium guineense), petit fruit séché"],
  ["soump (soumpou)", "fruit séché du dattier du désert (Balanites aegyptiaca)"],
  ["jaxatu (diakhatou)", "aubergine amère africaine"],
  ["kinkéliba", "feuilles séchées de Combretum micranthum, pour tisane"],
  ["nététou (netetou)", "condiment fermenté à base de graines de néré (soumbala)"],
  ["gouro (guro)", "noix de cola séchée"],
  ["gerte (guerté)", "arachide ; « noflaye » : poudre d'arachide finement moulue"],
  ["araw (arraw), sankal, soungouf", "mil concassé / semoule ou farine de mil"],
  ["thiéré (thiere, tiere)", "couscous de mil"],
  ["thiakry (thiakri, tiakry)", "préparation sucrée à base de couscous de mil et de lait (caillé ou en poudre)"],
  ["laax (lakh)", "bouillie ou dessert à base de mil"],
  ["soow", "lait caillé"],
  ["niébé", "haricot à œil noir"],
  ["fonio", "céréale fonio"],
  ["thiouraye (thouraye, tiouraye), gowé, mbouraké", "encens traditionnels / mélanges parfumés à brûler"],
  ["safara", "mélange de plantes séchées pour bain traditionnel (à confirmer)"],
  ["lékète", "calebasse séchée et évidée, utilisée comme récipient"],
  ["kéthiakh (ketiakh), guedj (gejj), yété (yeet)", "poissons / mollusques séchés, fumés ou fermentés (produits d'origine animale)"],
  ["boubou, ensemble, complet, bazin", "vêtements traditionnels (boubou, ensemble en bazin ou en wax)"],
  ["tangal", "AMBIGU : peut désigner une écorce/racine séchée (condiment) OU des bonbons pour enfants — selon le contexte, sinon confiance basse"],
];

/** Bloc de texte à insérer dans les consignes de l'IA. */
export function glossaireWolof(): string {
  const liste = TERMES.map(([terme, sens]) => `- ${terme} : ${sens}`).join("\n");
  return `LANGUES ET VOCABULAIRE : les descriptions mélangent français, wolof et parfois anglais, avec une
orthographe phonétique très variable (ex. bissap/bissab, thiakry/tiakri, nététou/netetou/ntetou). Reconnais
le terme même mal écrit. Repères sur les produits sénégalais fréquents (indicatifs, sans code HS) :
${liste}

Pour un terme wolof : garde le nom local (orthographe corrigée) dans "description_produit" et décris le
produit en français dans "description_douane". Si un terme t'est inconnu ou ambigu, NE DEVINE PAS un produit
précis : classe-le comme produit alimentaire ou divers "à préciser", mets une confiance basse (< 0,7) et note
"terme wolof non identifié : X" dans "anomalies".`;
}
