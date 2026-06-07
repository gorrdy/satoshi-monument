#!/usr/bin/env node
/**
 * MCP server pro projekt Satoshi Monument.
 * Zpřístupňuje AI agentům aktuální stav sbírky a návod, jak přispět.
 * Čte pouze veřejné API (${SITE_URL}/api/stats) — žádná tajemství.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const SITE_URL = (process.env.SITE_URL ?? "https://satoshi.jednadvacet.org").replace(
  /\/$/,
  "",
);

async function fetchStats() {
  const res = await fetch(`${SITE_URL}/api/stats`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`/api/stats vrátilo ${res.status}`);
  return res.json();
}

const text = (t) => ({ content: [{ type: "text", text: t }] });

const server = new McpServer({
  name: "satoshi-monument",
  version: "1.0.0",
});

server.tool(
  "get_campaign_stats",
  "Aktuální stav veřejné sbírky Satoshi Monument: vybraná částka v BTC, cíl, procenta a počet přispěvatelů.",
  {},
  async () => {
    try {
      const { stats } = await fetchStats();
      return text(
        [
          `Satoshi Monument — stav sbírky:`,
          `- Vybráno: ${Number(stats.raisedBtc).toFixed(8)} BTC`,
          `- Cíl: ${stats.goalBtc} BTC`,
          `- Splněno: ${Number(stats.percent).toFixed(1)} %`,
          `- Přispěvatelů: ${stats.donorCount}`,
          `- Kurz: ${Math.round(stats.btcCzkRate).toLocaleString("cs-CZ")} CZK/BTC`,
          `Web: ${SITE_URL}`,
        ].join("\n"),
      );
    } catch (e) {
      return text(`Nepodařilo se načíst stav sbírky: ${e.message}`);
    }
  },
);

server.tool(
  "get_top_supporters",
  "Vrátí žebříček největších přispěvatelů (seřazeno od nejvyššího příspěvku).",
  { limit: z.number().int().min(1).max(50).optional() },
  async ({ limit }) => {
    try {
      const { wall } = await fetchStats();
      const top = (wall ?? []).slice(0, limit ?? 10);
      if (!top.length) return text("Zatím žádní přispěvatelé.");
      const lines = top.map((e, i) => {
        const amount =
          e.currency === "CZK"
            ? `${e.amount} CZK`
            : `${Number(e.amountBtc ?? e.amount).toFixed(8)} BTC`;
        return `${i + 1}. ${e.name} — ${amount}`;
      });
      return text(`Největší přispěvatelé:\n${lines.join("\n")}`);
    } catch (e) {
      return text(`Nepodařilo se načíst přispěvatele: ${e.message}`);
    }
  },
);

server.tool(
  "how_to_donate",
  "Návod, jak přispět na sochu Satoshiho Nakamota v Praze.",
  {},
  async () =>
    text(
      [
        `Jak přispět na Satoshi Monument (cíl 1 BTC):`,
        `1) Bitcoin on-chain nebo Lightning — přes platební bránu na webu.`,
        `2) CZK bankovním převodem — web vygeneruje QR Platbu (SPAYD).`,
        `Každý příspěvek se v okamžiku přijetí přepočítá na BTC. Seznam přispěvatelů`,
        `bude trvalou součástí webu sochy (QR na podstavci).`,
        `Přispět: ${SITE_URL}`,
        `Kontakt (změna jména/vzkazu, párování platby): monument@jednadvacet.org`,
      ].join("\n"),
    ),
);

const transport = new StdioServerTransport();
await server.connect(transport);
