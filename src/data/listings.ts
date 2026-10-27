export type Category = "Wohnen" | "Technik" | "Freizeit";
export type ListingStatus = "available" | "reserved" | "sold";
export interface Listing {
  slug: string;
  title: string;
  subtitle: string;
  category: Category;
  price: number;
  negotiable: boolean;
  condition: string;
  status: ListingStatus;
  image: string;
  imageAlt: string;
  extraImages?: { src: string; alt: string }[];
  description: string[];
  details: [string, string][];
  date: string;
}

// Temporary build-time content. Replace this source with PocketBase records later.
export const listings: Listing[] = [
  {
    slug: "patagonia-jacke",
    title: "Patagonia Jacke – so gut wie neu",
    subtitle: "Robuste Jacke in Rot und Blau",
    category: "Freizeit",
    price: 89,
    negotiable: false,
    condition: "So gut wie neu",
    status: "available",
    image: "/images/patagonia-jacke-vorne.jpg",
    imageAlt: "Rot-blaue Patagonia Jacke mit Kapuze und Logo auf der Vorderseite",
    date: "2026-10-27",
    extraImages: [
      {
        src: "/images/patagonia-jacke-hinten.jpg",
        alt: "Rückseite der Patagonia Jacke in Blau mit roten Ärmeln und Kapuze",
      },
    ],
    description: [
      "Patagonia Jacke so gut wie neu – nur einmal getragen. Robustes Material in Rot und Blau, komplett modern.",
      "Nur Selbstabholung – 89 €.",
    ],
    details: [
      ["Marke", "Patagonia"],
      ["Farbe", "Rot / Blau"],
      ["Material", "Robustes Material"],
      ["Übergabe", "Nur Selbstabholung"],
    ],
  },
  {
    slug: "loungesessel",
    title: "Ein Platz zum Abschalten",
    subtitle: "Gemütlicher Loungesessel",
    category: "Wohnen",
    price: 85,
    negotiable: true,
    condition: "Sehr gut",
    status: "available",
    image: "/images/sessel.jpg",
    imageAlt: "Heller, gepolsterter Loungesessel mit Holzbeinen",
    date: "2026-10-26",
    extraImages: [
      {
        src: "/images/sessel-detail.jpg",
        alt: "Detail des Stoffbezugs und der Polsterung",
      },
    ],
    description: [
      "Meine Leseecke bekommt ein kleines Update, deshalb darf dieser gemütliche Sessel weiterziehen. Perfekt für ein gutes Buch, den ersten Kaffee oder einfach mal fünf Minuten Pause.",
      "Er wurde sorgsam benutzt und hat nur leichte Gebrauchsspuren. Der Bezug ist sauber, die Beine sind stabil. Wenn du genaue Maße oder weitere Fotos möchtest, schreib mir einfach.",
    ],
    details: [
      ["Material", "Stoffbezug, Holzbeine"],
      ["Farbe", "Creme / Natur"],
      ["Übergabe", "Abholung nach Absprache"],
    ],
  },
  {
    slug: "digitalkamera",
    title: "Für die nächsten Abenteuer",
    subtitle: "Digitalkamera mit Objektiv",
    category: "Technik",
    price: 240,
    negotiable: true,
    condition: "Gut",
    status: "available",
    image: "/images/kamera.jpg",
    imageAlt: "Schwarze Digitalkamera mit Objektiv auf dunklem Untergrund",
    date: "2026-10-25",
    description: [
      "Eine treue Begleiterin für Ausflüge, die bei mir inzwischen viel zu oft im Schrank liegt. Vielleicht hält sie bald deine nächsten Abenteuer fest.",
      "Die Kamera funktioniert einwandfrei und hat normale Gebrauchsspuren. Objektiv, Akku und Ladegerät sind dabei. Fragen zum Modell oder zum Zubehör beantworte ich dir gerne.",
    ],
    details: [
      ["Dabei", "Objektiv, Akku, Ladegerät"],
      ["Farbe", "Schwarz"],
      ["Übergabe", "Nach Absprache"],
    ],
  },
  {
    slug: "citybike",
    title: "Lieber radeln als stehen",
    subtitle: "Citybike für jeden Tag",
    category: "Freizeit",
    price: 120,
    negotiable: true,
    condition: "Gut",
    status: "available",
    image: "/images/fahrrad.jpg",
    imageAlt: "Schlankes Fahrrad in Seitenansicht vor einer dunklen Wand",
    date: "2026-10-24",
    description: [
      "Für den Weg zum Bäcker, eine kleine Runde nach der Arbeit oder einfach ein bisschen frische Luft. Dieses Rad ist bereit für neue Wege.",
      "Es hat ein paar Gebrauchsspuren, fährt sich aber gut. Am besten kommst du vorbei und probierst es aus. Rahmengröße und weitere Details gerne auf Anfrage.",
    ],
    details: [
      ["Typ", "Citybike"],
      ["Zubehör", "Wie abgebildet"],
      ["Übergabe", "Abholung nach Absprache"],
    ],
  },
  {
    slug: "tischlampe",
    title: "Ein bisschen Abendgemütlichkeit",
    subtitle: "Schlichte Tischlampe",
    category: "Wohnen",
    price: 25,
    negotiable: false,
    condition: "Sehr gut",
    status: "available",
    image: "/images/lampe.jpg",
    imageAlt: "Tischlampe für gemütliche Beleuchtung",
    date: "2026-10-23",
    description: [
      "Kleines Licht, große Gemütlichkeit. Diese Tischlampe macht sich auf dem Schreibtisch genauso gut wie neben dem Sofa.",
      "Funktioniert einwandfrei und sucht nur deshalb ein neues Zuhause, weil ich umgestaltet habe.",
    ],
    details: [
      ["Typ", "Tischlampe"],
      ["Anschluss", "Steckdose"],
      ["Übergabe", "Nach Absprache"],
    ],
  },
  {
    slug: "kopfhoerer",
    title: "Deine kleine Auszeit",
    subtitle: "Over-Ear-Kopfhörer",
    category: "Technik",
    price: 55,
    negotiable: true,
    condition: "Gut",
    status: "reserved",
    image: "/images/kopfhoerer.jpg",
    imageAlt: "Schwarze Over-Ear-Kopfhörer",
    date: "2026-10-22",
    description: [
      "Musik an, Alltag aus. Ich habe mir ein anderes Paar zugelegt und gebe diese Kopfhörer deshalb weiter.",
      "Alles funktioniert, die Polster sind gepflegt. Aktuell sind sie schon für jemanden reserviert. Falls du Interesse hast, melde dich trotzdem – vielleicht klappt es ja noch.",
    ],
    details: [
      ["Bauform", "Over-Ear"],
      ["Farbe", "Schwarz"],
      ["Übergabe", "Nach Absprache"],
    ],
  },
  {
    slug: "rucksack",
    title: "Noch lange nicht ausgereist",
    subtitle: "Rucksack für unterwegs",
    category: "Freizeit",
    price: 30,
    negotiable: false,
    condition: "Gut",
    status: "available",
    image: "/images/rucksack.jpg",
    imageAlt: "Rucksack mit mehreren Fächern",
    date: "2026-10-21",
    description: [
      "Ein praktischer Begleiter für den Alltag oder den nächsten Wochenendausflug. Hat Platz für alles, was unterwegs mit muss.",
      "Alle Reißverschlüsse funktionieren. Leichte Gebrauchsspuren, aber noch viele Ausflüge vor sich.",
    ],
    details: [
      ["Typ", "Tagesrucksack"],
      ["Zustand", "Gepflegt, leichte Gebrauchsspuren"],
      ["Übergabe", "Nach Absprache"],
    ],
  },
  {
    slug: "pflanzentopf",
    title: "Platz für etwas Grünes",
    subtitle: "Pflanze mit Übertopf",
    category: "Wohnen",
    price: 0,
    negotiable: false,
    condition: "Sehr gut",
    status: "available",
    image: "/images/pflanze.jpg",
    imageAlt: "Grüne Zimmerpflanze in einem hellen Übertopf",
    date: "2026-10-20",
    description: [
      "Meine Fensterbank ist voll. Deshalb darf dieses grüne Mitbewohnerchen mitsamt Übertopf bei jemand anderem einziehen.",
      "Ich verschenke die Pflanze gerne an ein neues Zuhause. Einfach melden und wir machen uns eine Übergabe aus.",
    ],
    details: [
      ["Dabei", "Pflanze und Übertopf"],
      ["Preis", "Zu verschenken"],
      ["Übergabe", "Abholung nach Absprache"],
    ],
  },
  {
    slug: "kaffeezubehoer",
    title: "Für einen guten Start",
    subtitle: "Kaffeezubehör",
    category: "Wohnen",
    price: 20,
    negotiable: false,
    condition: "Sehr gut",
    status: "sold",
    image: "/images/kaffee.jpg",
    imageAlt: "Frisch zubereiteter Kaffee auf einem Tisch",
    date: "2026-10-19",
    description: [
      "Ein paar schöne Dinge für das tägliche Kaffeeritual. Viel zu schade, um unbenutzt im Schrank zu bleiben.",
      "Dieses Stück hat bereits ein neues Zuhause gefunden. Schau dich gerne bei den anderen Dingen um.",
    ],
    details: [
      ["Kategorie", "Küche & Kaffee"],
      ["Übergabe", "Bereits vergeben"],
    ],
  },
  {
    slug: "buecherpaket",
    title: "Ein paar neue Geschichten",
    subtitle: "Kleines Bücherpaket",
    category: "Freizeit",
    price: 10,
    negotiable: false,
    condition: "Gut",
    status: "available",
    image: "/images/buecher.jpg",
    imageAlt: "Auswahl von Büchern mit bunten Buchrücken",
    date: "2026-10-18",
    description: [
      "Einmal gelesen, gerne weitergegeben. Diese Bücher haben mir schöne Stunden geschenkt und dürfen jetzt jemand anderen begleiten.",
      "Gelesener, gepflegter Zustand. Wenn du wissen möchtest, welche Titel dabei sind, schreib mir einfach.",
    ],
    details: [
      ["Umfang", "Mehrere Bücher im Paket"],
      ["Sprache", "Deutsch"],
      ["Übergabe", "Nach Absprache"],
    ],
  },
];
export const categories: Category[] = ["Wohnen", "Technik", "Freizeit"];
export const statusLabels: Record<ListingStatus, string> = {
  available: "Noch zu haben",
  reserved: "Reserviert",
  sold: "Vergeben",
};
export const formatPrice = (price: number) =>
  price === 0
    ? "Zu verschenken"
    : `€ ${new Intl.NumberFormat("de-AT", { maximumFractionDigits: 0 }).format(price)}`;
