# Satoshi Monument — sbírkový web

Onepager pro veřejnou sbírku na sochu Satoshiho Nakamota v Praze.
Cíl sbírky **1 BTC**. Přispívat lze on-chain Bitcoinem, přes Lightning (oboje
přes BTCPayServer) a fiat bankovním převodem v CZK (QR Platba / SPAYD).

Web: `satoshi.jednadvacet.org`.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- Prisma 6 + SQLite
- next-intl (CZ/EN)
- BTCPayServer Greenfield API + modal overlay (`btcpay.js`)
- `qrcode` pro QR Platbu (SPAYD)

## Vývoj

```bash
npm install
npx prisma migrate dev      # vytvoří SQLite DB
npm run dev                 # http://localhost:3000
```

Konfigurace je v `.env` (vzor v `.env.example`).

## Jak to funguje

- **BTC příspěvek** → backend vytvoří invoice přes BTCPay Greenfield API,
  frontend otevře BTCPay modal overlay. Po `InvoiceSettled` webhook automaticky
  potvrdí příspěvek a započítá ho do součtu.
- **CZK příspěvek** → backend vygeneruje variabilní symbol + SPAYD řetězec,
  frontend vykreslí QR. Příspěvek čeká jako `pending`, dokud ho **admin ručně
  nepotvrdí** v `/admin` (po přijetí převodu na účet). Potvrzením se přepočte
  CZK→BTC aktuálním kurzem a vzkaz se objeví na zdi přispěvatelů.

Souhrn (progress bar) = součet `amountBtc` všech potvrzených příspěvků;
BTC ekvivalent CZK darů se fixuje v okamžiku potvrzení.

## Admin

`/admin` — přihlášení heslem z `ADMIN_PASSWORD`. Filtruje čekající/potvrzené/
zamítnuté, umožňuje potvrdit/zamítnout platbu a skrýt nevhodný vzkaz ze zdi.
Neveřejné vzkazy organizátorům jsou vidět jen zde.

## Dokončení BTCPay integrace

V BTCPay storu „Satoshi Monument" (btcpayserver.cz):

1. **API key** (Account → Manage account → API Keys) s oprávněním
   `btcpay.store.cancreateinvoice` → `BTCPAY_API_KEY`.
2. **Webhook** (Store Settings → Webhooks) na
   `https://<doména>/api/btcpay/webhook`, událost `Invoice Settled`.
   Secret webhooku → `BTCPAY_WEBHOOK_SECRET`.
3. `BTCPAY_STORE_ID` = ID storu (z URL nastavení storu).

## Nasazení

1. Nastav `.env` (produkční hodnoty, silné `ADMIN_PASSWORD` a `SESSION_SECRET`,
   `NEXT_PUBLIC_SITE_URL` na veřejnou doménu). V produkci appka bez
   `SESSION_SECRET`/`ADMIN_PASSWORD` schválně spadne.
2. `npm run build && npm start` (za reverzní proxy s HTTPS).
3. `npx prisma migrate deploy` pro migraci DB na serveru.
4. Po doplnění finálního čísla účtu uprav `BANK_ACCOUNT` / `BANK_CODE`.

Bezpečnostní hlavičky (CSP s povolením BTCPay, Permissions-Policy, X-Frame-Options,
nosniff, Referrer-Policy) řeší `next.config.ts`. **HSTS a HTTP/2** patří na reverzní
proxy (nginx). Cron endpointy (`/api/cron/fio-sync`, `/api/cron/daily-report`) je
potřeba periodicky volat (systemd timer / cron) s hlavičkou `x-cron-key: $CRON_SECRET`.

## Strojová čitelnost / AI

- `/llms.txt` — souhrn projektu pro AI agenty (llmstxt.org) + živý stav sbírky.
- JSON-LD (schema.org Organization + WebSite) v hlavičce stránek.
- `/api/stats` — veřejný JSON se stavem sbírky.
- [`mcp/`](mcp/) — MCP server zpřístupňující stav sbírky AI asistentům (viz `mcp/README.md`).

## Licence

Zdrojový kód je pod licencí **MIT** (viz [`LICENSE`](LICENSE)).

Obrázky, fotografie a značka projektu (např. `public/`, logo Bitcoinu, fotky
instalací sochy, vizuály) **nejsou** součástí MIT licence a mohou podléhat
právům třetích stran. Pokud projekt forkujete, použijte vlastní obrazové
podklady.
