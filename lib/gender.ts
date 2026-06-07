/**
 * Heuristický odhad pohlaví z (českého) jména — jen pro volbu vzhledu avataru.
 * Vrací "female" | "male" | "unknown". Záměrně konzervativní: co si není jisté,
 * nechá "unknown" (neutrální avatar). Není to spolehlivé u přezdívek a cizích jmen.
 */

function strip(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const FEMALE_FIRST = new Set([
  "jana", "marie", "eva", "hana", "anna", "lenka", "katerina", "lucie", "alena",
  "petra", "veronika", "jaroslava", "tereza", "martina", "zuzana", "michaela",
  "barbora", "monika", "ivana", "jitka", "helena", "vera", "lada", "klara",
  "nikola", "kristyna", "denisa", "simona", "andrea", "gabriela", "dagmar",
  "romana", "sona", "magdalena", "adela", "natalie", "karolina", "iveta", "sara",
  "aneta", "pavla", "renata", "vendula", "marketa", "blanka", "olga", "dana",
]);

const MALE_FIRST = new Set([
  "jan", "jiri", "petr", "josef", "pavel", "martin", "tomas", "jaroslav",
  "miroslav", "zdenek", "frantisek", "vaclav", "michal", "david", "lukas",
  "jakub", "ondrej", "marek", "filip", "adam", "vojtech", "stepan", "roman",
  "milan", "ladislav", "radek", "vladimir", "daniel", "matej", "ales", "rostislav",
  "patrik", "dominik", "robert", "kamil", "dusan", "richard", "karel", "antonin",
  "stanislav", "ivan", "oldrich", "lubomir", "viktor", "samuel", "premysl",
]);

export type Gender = "female" | "male" | "unknown";

export function guessGender(name: string): Gender {
  const raw = (name ?? "").trim();
  if (!raw) return "unknown";
  const tokens = strip(raw).split(/[\s._\-@]+/).filter(Boolean);
  if (!tokens.length) return "unknown";

  // 1) Silný signál: české přechýlené příjmení „-ová".
  if (tokens.some((t) => t.endsWith("ova"))) return "female";

  // 2) Slovník křestních jmen.
  for (const t of tokens) {
    if (FEMALE_FIRST.has(t)) return "female";
    if (MALE_FIRST.has(t)) return "male";
  }

  // 3) Adjektivní příjmení „-ý" (Novotný→novotny, Veselý→vesely) → muž.
  if (tokens.some((t) => t.length > 3 && /(ny|vy|ky|ly|ry|cky|sky|dy|ty)$/.test(t)))
    return "male";

  // 4) Slabý fallback z koncovky prvního tokenu (české křestní).
  const first = tokens[0];
  if (first.length > 2 && (first.endsWith("a") || first.endsWith("e")))
    return "female";

  return "unknown";
}
