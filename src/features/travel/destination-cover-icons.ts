/**
 * Iconic photo queries for destinations — the sights people travel there for
 * (aurora, famous peaks, lagoons, ruins), not generic cityscapes.
 */

export type DestinationIconicCoverEntry = {
  /** Case-insensitive phrases matched against destination + title. */
  phrases: readonly string[];
  /** Wikimedia / Unsplash search strings (place token first). */
  queries: readonly string[];
};

/**
 * Longer / more specific phrases win. Keep queries destination-anchored so
 * Commons/Unsplash do not drift to unrelated icons.
 */
export const DESTINATION_ICONIC_COVER_QUERIES: readonly DestinationIconicCoverEntry[] =
  [
    {
      phrases: ['reykjavik', 'reykjavík', 'iceland'],
      queries: [
        'Iceland northern lights aurora borealis',
        'Iceland Gullfoss waterfall',
        'Iceland Blue Lagoon geothermal',
        'Iceland Jökulsárlón glacier lagoon',
        'Iceland Kirkjufell mountain',
        'Reynisfjara black sand beach Iceland',
        'Iceland volcano landscape',
      ],
    },
    {
      phrases: ['antigua guatemala', 'antigua', 'guatemala'],
      queries: [
        'Antigua Guatemala Santa Catalina Arch',
        'Volcan de Agua Antigua Guatemala',
        'Antigua Guatemala colonial volcano',
        'Acatenango volcano Guatemala',
      ],
    },
    {
      phrases: ['paris', 'france'],
      queries: [
        'Eiffel Tower Paris',
        'Louvre Pyramid Paris',
        'Sacré-Cœur Montmartre Paris',
        'Palace of Versailles France',
      ],
    },
    {
      phrases: ['tokyo', 'japan', 'kyoto', 'osaka'],
      queries: [
        'Mount Fuji Japan',
        'Fushimi Inari Kyoto',
        'Tokyo Skytree Japan',
        'Arashiyama bamboo grove Kyoto',
        'Itsukushima torii gate Japan',
      ],
    },
    {
      phrases: ['rome', 'italy', 'florence', 'venice', 'milan'],
      queries: [
        'Colosseum Rome',
        'Trevi Fountain Rome',
        'Venice Grand Canal Italy',
        'Florence Duomo Italy',
        'Amalfi Coast Italy',
      ],
    },
    {
      phrases: ['bali', 'indonesia'],
      queries: [
        'Bali rice terraces Tegallalang',
        'Tanah Lot temple Bali',
        'Mount Batur Bali sunrise',
        'Uluwatu temple cliff Bali',
      ],
    },
    {
      phrases: ['norway', 'oslo', 'bergen', 'tromsø', 'tromso'],
      queries: [
        'Norway northern lights aurora',
        'Geirangerfjord Norway',
        'Trolltunga Norway',
        'Lofoten islands Norway',
      ],
    },
    {
      phrases: ['new zealand', 'auckland', 'queenstown', 'rotorua'],
      queries: [
        'Milford Sound New Zealand',
        'Hobbiton New Zealand',
        'Mount Cook New Zealand',
        'Rotorua geysers New Zealand',
      ],
    },
    {
      phrases: ['peru', 'cusco', 'cuzco', 'lima'],
      queries: [
        'Machu Picchu Peru',
        'Rainbow Mountain Peru',
        'Huacachina oasis Peru',
        'Sacred Valley Peru',
      ],
    },
    {
      phrases: ['egypt', 'cairo', 'luxor', 'giza'],
      queries: [
        'Pyramids of Giza Egypt',
        'Sphinx Giza Egypt',
        'Abu Simbel Egypt',
        'Nile River Luxor Egypt',
      ],
    },
    {
      phrases: ['greece', 'athens', 'santorini', 'mykonos'],
      queries: [
        'Santorini blue domes Greece',
        'Acropolis Athens Greece',
        'Mykonos windmills Greece',
        'Navagio beach Zakynthos Greece',
      ],
    },
    {
      phrases: ['switzerland', 'zurich', 'zermatt', 'geneva', 'interlaken'],
      queries: [
        'Matterhorn Zermatt Switzerland',
        'Jungfrau Switzerland Alps',
        'Lake Geneva Switzerland',
        'Swiss Alps scenic',
      ],
    },
    {
      phrases: ['hawaii', 'maui', 'oahu', 'honolulu', 'kauai'],
      queries: [
        'Hawaii Na Pali coast',
        'Hawaii volcano lava',
        'Waikiki Beach Honolulu',
        'Maui Road to Hana waterfall',
      ],
    },
    {
      phrases: ['patagonia', 'argentina', 'chile', 'buenos aires'],
      queries: [
        'Patagonia Torres del Paine',
        'Perito Moreno glacier Argentina',
        'Iguazu Falls Argentina',
        'Atacama Desert Chile',
      ],
    },
    {
      phrases: ['morocco', 'marrakech', 'marrakesh', 'fez'],
      queries: [
        'Sahara desert Morocco dunes',
        'Jardin Majorelle Marrakech',
        'Chefchaouen blue city Morocco',
        'Ait Benhaddou Morocco',
      ],
    },
  ];

/** Generic “why people go” suffixes when no curated pack matches. */
export const DESTINATION_ICONIC_DRAW_SUFFIXES = [
  'iconic',
  'famous attraction',
  'scenic landscape',
] as const;

function normalizeHaystack(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Curated iconic search strings for a trip’s destination/title, if known.
 * Empty when the place has no pack — callers fall back to draw suffixes.
 */
export function resolveIconicCoverQueries(
  destination: string,
  title = '',
): string[] {
  const haystack = normalizeHaystack(`${destination} ${title}`);
  if (haystack.length < 2) return [];

  let best: DestinationIconicCoverEntry | undefined;
  let bestPhraseLen = 0;
  for (const entry of DESTINATION_ICONIC_COVER_QUERIES) {
    for (const phrase of entry.phrases) {
      const needle = normalizeHaystack(phrase);
      if (!needle || !haystack.includes(needle)) continue;
      if (needle.length > bestPhraseLen) {
        best = entry;
        bestPhraseLen = needle.length;
      }
    }
  }
  return best ? [...best.queries] : [];
}
