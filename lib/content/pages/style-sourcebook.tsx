import type { PageContent } from "./types";

const styles = [
  {
    name: "Scandinavian Minimalism",
    description:
      "Clean lines, natural materials, and a muted colour palette. Scandinavian design is all about functionality meeting beauty — creating spaces that feel calm, uncluttered, and effortlessly stylish.",
    keyPieces: [
      "Light oak dining tables",
      "Simple slatted shelving",
      "Linen upholstered sofas",
      "Rounded-edge coffee tables",
    ],
    palette: ["White", "Light Oak", "Soft Grey", "Warm Beige"],
    tip: "Less is more. Choose a few statement pieces and let negative space do the work. Keep surfaces clear and let natural light flood in.",
  },
  {
    name: "Mid-Century Modern",
    description:
      "Bold yet refined, mid-century modern takes inspiration from the 1950s and 60s. Think tapered legs, organic shapes, and a mix of natural and manufactured materials that feels both retro and contemporary.",
    keyPieces: [
      "Walnut sideboards",
      "Hairpin leg desks",
      "Velvet accent chairs",
      "Tapered leg sofas",
    ],
    palette: ["Walnut", "Mustard", "Teal", "Cream"],
    tip: "Mix wood tones for warmth, and don't be afraid of a bold accent colour. A single mustard or teal piece can anchor an entire room.",
  },
  {
    name: "Coastal Casual",
    description:
      "Inspired by the Australian coastline, this style is relaxed, airy, and light. Natural textures, woven details, and a blue-and-white palette create a breezy, holiday-at-home feel.",
    keyPieces: [
      "Rattan dining chairs",
      "Whitewashed timber tables",
      "Woven storage baskets",
      "Linen-look sofas",
    ],
    palette: ["White", "Sandy Beige", "Ocean Blue", "Natural Rattan"],
    tip: "Layer textures rather than colours. Combine linen, rattan, timber, and cotton to create depth without visual clutter.",
  },
  {
    name: "Modern Rustic",
    description:
      "Warmth and character meet contemporary design. Modern rustic celebrates raw, natural materials — reclaimed timber, matte metals, and earthy tones — with a clean, updated sensibility.",
    keyPieces: [
      "Solid timber dining tables",
      "Metal-frame shelving",
      "Leather accent chairs",
      "Chunky timber benches",
    ],
    palette: ["Dark Timber", "Charcoal", "Burnt Orange", "Olive Green"],
    tip: "Let the materials tell the story. A single piece of raw timber furniture can become the centrepiece of a room. Pair with matte black accents for a modern edge.",
  },
];

function Content() {
  return (
    <div className="space-y-10">
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Not sure where to start? Our Style Sourcebook breaks down four popular interior styles to
        help you find the look that fits your home and lifestyle. Mix and match across styles or
        commit to one — there are no rules, just inspiration.
      </p>

      <div className="space-y-8">
        {styles.map((style) => (
          <div
            key={style.name}
            className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-3">
              {style.name}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5">
              {style.description}
            </p>

            <div className="grid gap-6 sm:grid-cols-2 mb-5">
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Key Pieces
                </h3>
                <ul className="space-y-1.5">
                  {style.keyPieces.map((piece) => (
                    <li key={piece} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      {piece}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Colour Palette
                </h3>
                <div className="flex flex-wrap gap-2">
                  {style.palette.map((colour) => (
                    <span
                      key={colour}
                      className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                    >
                      {colour}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">Styling tip: </span>
                {style.tip}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Need help finding the right look for your space? Chat with our AI shopping assistant — it
          can suggest pieces that match your style.
        </p>
      </div>
    </div>
  );
}

export const styleSourcebookPage: PageContent = {
  meta: {
    title: "Style Sourcebook",
    subtitle: "Get inspired for your next room transformation",
    description:
      "Explore interior design styles with the Kozy. Style Sourcebook. From Scandinavian minimalism to modern rustic — find your look.",
  },
  content: Content,
};
