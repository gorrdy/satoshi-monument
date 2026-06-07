import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";

/**
 * Generativní avatar dárce — deterministický „obličej" (DiceBear / Notionists)
 * vykreslený lokálně jako inline SVG (žádné externí zdroje → OK s CSP).
 * Stejný seed = vždy stejný avatar.
 */
export default function Identicon({
  seed,
  className = "",
}: {
  seed: string;
  className?: string;
}) {
  const svg = createAvatar(notionists, {
    seed: seed || "satoshi",
    // Světlé pastelové pozadí (DiceBear vybere deterministicky dle seedu),
    // ať jsou tmavé linky obličeje čitelné i na tmavém webu.
    backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "f7d9a6"],
    backgroundType: ["solid"],
  }).toString();

  return (
    <div
      // vnořené <svg> roztáhnout na celý kontejner (DiceBear svg nemá width/height)
      className={`${className} [&>svg]:block [&>svg]:w-full [&>svg]:h-full`}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
