import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";
import { guessGender } from "@/lib/gender";

/**
 * Generativní avatar dárce (DiceBear / Avataaars) jako lokální inline SVG
 * (žádné externí zdroje → OK s CSP). Stejný `seed` = vždy stejný avatar.
 * Z `name` se heuristicky odhadne pohlaví a podle něj se zvolí účes/vousy.
 */

// Účesy laděné žensky (dlouhé) vs. mužsky (krátké) — z hodnot `top` u Avataaars.
const FEMALE_TOP = [
  "bob", "bun", "curly", "curvy", "frida", "longButNotTooLong", "miaWallace",
  "straight01", "straight02", "straightAndStrand", "bigHair", "fro",
] as const;
const MALE_TOP = [
  "shortCurly", "shortFlat", "shortRound", "shortWaved", "theCaesar",
  "theCaesarAndSidePart", "sides", "dreads01", "dreads02", "shavedSides",
] as const;
const PASTELS = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "f7d9a6"];

export default function Identicon({
  seed,
  name,
  className = "",
}: {
  seed: string;
  name?: string;
  className?: string;
}) {
  const gender = guessGender(name ?? seed);

  const genderOpts =
    gender === "female"
      ? { top: [...FEMALE_TOP], topProbability: 100, facialHairProbability: 0 }
      : gender === "male"
        ? { top: [...MALE_TOP], topProbability: 100, facialHairProbability: 40 }
        : {};

  const svg = createAvatar(avataaars, {
    seed: seed || "satoshi",
    backgroundColor: PASTELS,
    backgroundType: ["solid"],
    ...genderOpts,
  }).toString();

  return (
    <div
      className={`${className} [&>svg]:block [&>svg]:w-full [&>svg]:h-full`}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
