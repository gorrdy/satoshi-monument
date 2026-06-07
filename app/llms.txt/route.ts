import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://satoshi.jednadvacet.org";

/**
 * /llms.txt — strojově čitelný souhrn pro AI agenty (llmstxt.org).
 * Obsahuje aktuální stav sbírky a klíčové odkazy.
 */
export async function GET() {
  let raised = "";
  try {
    const s = await getStats();
    raised = `Raised so far: ${s.raisedBtc.toFixed(8)} BTC of ${s.goalBtc} BTC goal (${s.percent.toFixed(1)}%), ${s.donorCount} contributors.`;
  } catch {
    raised = "";
  }

  const body = `# Satoshi Monument

> A community, non-profit fundraiser to build and install a statue of Satoshi Nakamoto
> in the public space of Prague, Czech Republic — the same statue that already stands in
> Lugano and is being raised in 21 cities worldwide. Goal: 1 BTC.

Run by the association The Malahar Network z.s. Funded purely by voluntary contributions,
no public grants, no commercial sponsorship. Contributions are accepted in Bitcoin (on-chain
and Lightning, via BTCPayServer) and in CZK by bank transfer (QR Payment / SPAYD). Every
contribution is converted to its BTC equivalent at the time it is received. The list of
contributors will become a permanent part of the statue's website, linked by a QR code on
the monument's pedestal.

${raised}

## Key pages
- Home / donate: ${SITE}/en (Czech: ${SITE}/cs)
- Story of the monument: ${SITE}/en/pribeh
- Collection rules (what happens with the funds): ${SITE}/en/pravidla
- Beyond this statue (vision / partners): ${SITE}/en/dalsi

## Data
- Live campaign stats (JSON): ${SITE}/api/stats

## How to contribute
- Bitcoin (on-chain or Lightning) or CZK bank transfer via QR — all on the home page.
- To change a displayed name/message or to match a payment you already sent, email the team.

## Contact
- Email: monument@jednadvacet.org

## Note
Tento web je dvojjazyčný (čeština/angličtina). Cíl sbírky je 1 BTC.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
