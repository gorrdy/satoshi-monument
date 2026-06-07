# Satoshi Monument — MCP server

MCP (Model Context Protocol) server, který AI asistentům (Claude Desktop, Claude Code, …)
zpřístupní aktuální stav sbírky **Satoshi Monument** a návod, jak přispět.
Čte pouze veřejné API `${SITE_URL}/api/stats` — neobsahuje žádná tajemství.

## Nástroje
- `get_campaign_stats` — vybráno/cíl v BTC, procenta, počet přispěvatelů, kurz.
- `get_top_supporters` — žebříček největších přispěvatelů (volitelně `limit`).
- `how_to_donate` — návod, jak přispět (BTC / Lightning / QR Platba CZK).

## Instalace
```bash
cd mcp
npm install
```

## Spuštění
```bash
SITE_URL=https://satoshi.jednadvacet.org node server.mjs
```
(`SITE_URL` je volitelné, default `https://satoshi.jednadvacet.org`.)

## Konfigurace v MCP klientovi
**Claude Desktop** (`claude_desktop_config.json`) / **Claude Code** (`.mcp.json`):
```json
{
  "mcpServers": {
    "satoshi-monument": {
      "command": "node",
      "args": ["/absolutni/cesta/k/mcp/server.mjs"],
      "env": { "SITE_URL": "https://satoshi.jednadvacet.org" }
    }
  }
}
```
