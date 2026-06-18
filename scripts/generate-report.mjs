import fs from "fs";
import { execFileSync } from "child_process";
import path from "path";
const REPORT_DIR = process.env.REPORT_DIR || "/home/ubuntu/monument-data/report";
fs.mkdirSync(REPORT_DIR, { recursive: true });
for (const line of fs.readFileSync("/home/ubuntu/monument-data/.env","utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g,"");
}
const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient();
const URL=process.env.BTCPAY_URL, STORE=process.env.BTCPAY_STORE_ID, KEY=process.env.BTCPAY_API_KEY, SATS=1e8;

// ---- pomocné formátování ----
const cz = n => Math.round(n).toLocaleString("cs-CZ");
const cz2 = n => n.toLocaleString("cs-CZ",{minimumFractionDigits:2,maximumFractionDigits:2});
const btc = n => n.toFixed(8).replace(/0+$/,"").replace(/\.$/,"");
const med = arr => { const a=[...arr].sort((x,y)=>x-y); const n=a.length; return n?(n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2):0; };
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

// ---- kurzy ----
const stats = await (await fetch("https://satoshi.jednadvacet.org/api/stats")).json();
const rateCzk = stats.stats.btcCzkRate, rateUsd = stats.stats.btcUsdRate;

// ---- data ----
const all = await p.donation.findMany({ select:{id:true,name:true,currency:true,amount:true,amountBtc:true,donorKey:true,status:true,createdAt:true,confirmedAt:true}});
const profiles = await p.donorProfile.findMany({ select:{donorKey:true,name:true}});
const profName = new Map(profiles.map(x=>[x.donorKey,x.name]));
const conf = all.filter(d=>d.status==="confirmed");
const C_BTC = conf.filter(d=>d.currency==="BTC");
const C_CZK = conf.filter(d=>d.currency==="CZK");

// ---- objemy ----
const btcSats = Math.round(C_BTC.reduce((s,d)=>s+(d.amountBtc??0),0)*SATS);
const czkKc = C_CZK.reduce((s,d)=>s+d.amount,0);
const czkSats = Math.round(C_CZK.reduce((s,d)=>s+(d.amountBtc??0),0)*SATS);
const totSats = btcSats+czkSats;
const totBtc = totSats/SATS;

// ---- přispěvatelé ----
const pk = d => d.donorKey ? "k:"+d.donorKey : "s:"+d.id;
const btcPeople = new Set(C_BTC.map(pk)), czkPeople = new Set(C_CZK.map(pk));
const allPeople = new Set(conf.map(pk));
const both = [...btcPeople].filter(k=>czkPeople.has(k)).length;

// ---- statistiky na platbu ----
const btcAmts = C_BTC.map(d=>Math.round((d.amountBtc??0)*SATS));
const czkAmts = C_CZK.map(d=>d.amount);
const allEquivSats = conf.map(d=>Math.round((d.amountBtc??0)*SATS));

// ---- distribuce (dle BTC ekvivalentu na platbu, sats) ----
const buckets = [
  ["< 1 000", 0, 1000],["1 000–9 999",1000,10000],["10 000–49 999",10000,50000],
  ["50 000–99 999",50000,100000],["100 000–499 999",100000,500000],
  ["500 000–999 999",500000,1000000],["1 000 000+",1000000,Infinity],
];
const dist = buckets.map(([lbl,lo,hi])=>({lbl,count:allEquivSats.filter(s=>s>=lo&&s<hi).length, sum:allEquivSats.filter(s=>s>=lo&&s<hi).reduce((a,b)=>a+b,0)}));

// ---- vývoj v čase (dle confirmedAt, den) ----
const dayMap = new Map();
for(const d of conf){ if(!d.confirmedAt) continue; const k=d.confirmedAt.toISOString().slice(0,10);
  if(!dayMap.has(k)) dayMap.set(k,{count:0,sats:0,btc:0,czk:0});
  const e=dayMap.get(k); e.count++; e.sats+=Math.round((d.amountBtc??0)*SATS); if(d.currency==="BTC")e.btc++; else e.czk++; }
const days=[...dayMap.entries()].sort((a,b)=>a[0]<b[0]?-1:1).map(([day,e])=>({day,...e}));
const maxDaySats=Math.max(1,...days.map(d=>d.sats));
const peakDay=[...days].sort((a,b)=>b.sats-a.sats)[0];

// ---- top přispěvatelé (skupiny dle identifikátoru) ----
const grp=new Map();
for(const d of conf){ const k=pk(d); if(!grp.has(k)) grp.set(k,{sats:0,count:0,name:d.name,key:d.donorKey});
  const e=grp.get(k); e.sats+=Math.round((d.amountBtc??0)*SATS); e.count++; e.name=d.name; }
// jméno: profil přebíjí
for(const [k,e] of grp){ if(e.key && profName.has(e.key)) e.name=profName.get(e.key); }
const top=[...grp.values()].sort((a,b)=>b.sats-a.sats).slice(0,20);

// ---- skupiny / opakované ----
const repeats=[...grp.values()].filter(e=>e.count>1).length;
const groupCount=new Set(conf.filter(d=>d.donorKey).map(d=>d.donorKey)).size;

// ---- stavy ----
const byStatus={}; for(const d of all){ const k=d.status+"/"+d.currency; byStatus[k]=(byStatus[k]||0)+1; }
const createdCount=all.length;

// ---- LN vs on-chain (BTCPay) ----
let ln=0,lnurl=0,chain=0,lnCnt=0,chCnt=0;
const inv=C_BTC.filter(d=>d.btcpayInvoiceId);
// pozn: btcpayInvoiceId není v selectu výše, doplň
const invRows = await p.donation.findMany({ where:{status:"confirmed",currency:"BTC",btcpayInvoiceId:{not:null}}, select:{btcpayInvoiceId:true}});
let i=0; const N=18;
async function one(d){
  try{ const r=await fetch(`${URL}/api/v1/stores/${STORE}/invoices/${d.btcpayInvoiceId}/payment-methods`,{headers:{Authorization:`token ${KEY}`},signal:AbortSignal.timeout(15000)});
    if(!r.ok) return; let hadLn=false,hadCh=false;
    for(const pm of await r.json()){ const c=(pm.paymentMethodId||"").toUpperCase();
      for(const pay of (pm.payments||[])){ if((pay.status||"")!=="Settled")continue; const v=Math.round(Number(pay.value||0)*SATS); if(!Number.isFinite(v))continue;
        if(c.includes("LNURL")){lnurl+=v;hadLn=true;} else if(c.includes("LN")){ln+=v;hadLn=true;} else if(c.includes("CHAIN")){chain+=v;hadCh=true;} } }
    if(hadLn)lnCnt++; if(hadCh)chCnt++;
  }catch{}
}
await Promise.all(Array.from({length:N},async()=>{while(i<invRows.length)await one(invRows[i++]);}));
const lnTot=ln+lnurl;

// ====== HTML ======
const now=new Date();
const dStr=now.toLocaleString("cs-CZ",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});
const pct = (a,b)=> b? (a/b*100).toFixed(1)+" %":"0 %";
const bar = (val,max,color="#f7931a")=>`<div style="background:#eee;border-radius:3px;height:9px;width:100%;overflow:hidden"><div style="background:${color};height:9px;width:${Math.max(1,val/max*100).toFixed(1)}%"></div></div>`;

const html = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box}
body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;font-size:11px;line-height:1.45;margin:0}
h1{font-size:23px;margin:0 0 2px}
h2{font-size:15px;margin:22px 0 8px;color:#b45309;border-bottom:2px solid #f7931a;padding-bottom:3px}
h3{font-size:12px;margin:14px 0 5px;color:#444}
.sub{color:#666;font-size:11px;margin-bottom:2px}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:10.5px}
th,td{border:1px solid #ddd;padding:4px 7px;text-align:left}
th{background:#faf3e8;font-weight:700}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
.kpis{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.kpi{flex:1;min-width:120px;border:1px solid #eadfce;border-radius:8px;padding:8px 10px;background:#fffdf9}
.kpi .l{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#888}
.kpi .v{font-size:18px;font-weight:800;color:#b45309;margin-top:2px}
.kpi .h{font-size:9px;color:#999}
.muted{color:#888}
.foot{margin-top:24px;border-top:1px solid #ddd;padding-top:8px;color:#999;font-size:9px}
.tag{display:inline-block;background:#f7931a;color:#fff;border-radius:4px;padding:1px 6px;font-size:9px;font-weight:700}
</style></head><body>

<h1>Satoshi Monument — manažerský report sbírky</h1>
<div class="sub">Veřejná komunitní sbírka na sochu Satoshiho Nakamota v Praze · The Malahar Network z.s.</div>
<div class="sub">Vygenerováno: ${dStr} · zdroj: produkční databáze + BTCPay Server</div>

<h2>1 · Souhrn (KPI)</h2>
<div class="kpis">
  <div class="kpi"><div class="l">Vybráno celkem</div><div class="v">${btc(totBtc)} BTC</div><div class="h">${cz(totSats)} sats</div></div>
  <div class="kpi"><div class="l">% základního cíle (1 BTC)</div><div class="v">${(totBtc*100).toFixed(1)} %</div><div class="h">strop sbírky 1,3 BTC</div></div>
  <div class="kpi"><div class="l">Hodnota (CZK)</div><div class="v">${cz(totBtc*rateCzk)} Kč</div><div class="h">kurzem ${cz(rateCzk)} Kč/BTC</div></div>
  <div class="kpi"><div class="l">Hodnota (USD)</div><div class="v">$${cz(totBtc*rateUsd)}</div><div class="h">kurzem $${cz(rateUsd)}/BTC</div></div>
</div>
<div class="kpis">
  <div class="kpi"><div class="l">Přispěvatelé (unikátní)</div><div class="v">${cz(allPeople.size)}</div><div class="h">dle identifikátoru</div></div>
  <div class="kpi"><div class="l">Potvrzené platby</div><div class="v">${cz(conf.length)}</div><div class="h">BTC ${C_BTC.length} · CZK ${C_CZK.length}</div></div>
  <div class="kpi"><div class="l">Ø na platbu</div><div class="v">${cz(totSats/conf.length)} sats</div><div class="h">medián ${cz(med(allEquivSats))} sats</div></div>
  <div class="kpi"><div class="l">Skupin / identit</div><div class="v">${cz(groupCount)}</div><div class="h">opakovaných dárců ${repeats}</div></div>
</div>

<h2>2 · Podle způsobu platby</h2>
<table>
<tr><th>Způsob</th><th class="n">Přispěvatelé</th><th class="n">Platby</th><th class="n">Objem (sats)</th><th class="n">Objem (BTC)</th><th class="n">Podíl objemu</th></tr>
<tr><td><b>Bitcoin</b></td><td class="n">${cz(btcPeople.size)}</td><td class="n">${cz(C_BTC.length)}</td><td class="n">${cz(btcSats)}</td><td class="n">${btc(btcSats/SATS)}</td><td class="n">${pct(btcSats,totSats)}</td></tr>
<tr><td style="padding-left:18px">— Lightning</td><td class="n muted">—</td><td class="n">${cz(lnCnt)}</td><td class="n">${cz(lnTot)}</td><td class="n">${btc(lnTot/SATS)}</td><td class="n">${pct(lnTot,totSats)}</td></tr>
<tr><td style="padding-left:18px">— On-chain</td><td class="n muted">—</td><td class="n">${cz(chCnt)}</td><td class="n">${cz(chain)}</td><td class="n">${btc(chain/SATS)}</td><td class="n">${pct(chain,totSats)}</td></tr>
<tr><td><b>Fiat (CZK / banka)</b></td><td class="n">${cz(czkPeople.size)}</td><td class="n">${cz(C_CZK.length)}</td><td class="n">${cz(czkSats)}</td><td class="n">${btc(czkSats/SATS)}</td><td class="n">${pct(czkSats,totSats)}</td></tr>
<tr style="font-weight:700;background:#faf3e8"><td>Celkem</td><td class="n">${cz(allPeople.size)}<sup>*</sup></td><td class="n">${cz(conf.length)}</td><td class="n">${cz(totSats)}</td><td class="n">${btc(totBtc)}</td><td class="n">100 %</td></tr>
</table>
<div class="muted">Fiat objem: ${cz2(czkKc)} Kč (BTC ekvivalent kurzem v okamžiku potvrzení). LN/on-chain počty se mohou překrývat u plateb s více metodami. <sup>*</sup>${both} přispěvatelů použilo oba způsoby.</div>

<h2>3 · Statistika výše plateb</h2>
<table>
<tr><th>Metrika</th><th class="n">Bitcoin (sats)</th><th class="n">Fiat (Kč)</th></tr>
<tr><td>Průměr na platbu</td><td class="n">${cz(btcSats/C_BTC.length)}</td><td class="n">${cz(czkKc/C_CZK.length)}</td></tr>
<tr><td>Medián na platbu</td><td class="n">${cz(med(btcAmts))}</td><td class="n">${cz(med(czkAmts))}</td></tr>
<tr><td>Nejvyšší platba</td><td class="n">${cz(Math.max(...btcAmts))}</td><td class="n">${cz(Math.max(...czkAmts))}</td></tr>
<tr><td>Nejnižší platba</td><td class="n">${cz(Math.min(...btcAmts))}</td><td class="n">${cz(Math.min(...czkAmts))}</td></tr>
</table>

<h2>4 · Distribuce velikosti darů</h2>
<div class="muted">Dle BTC ekvivalentu na jednu platbu (sats).</div>
<table>
<tr><th>Pásmo (sats)</th><th class="n">Počet plateb</th><th class="n">Podíl</th><th style="width:30%">Graf</th><th class="n">Objem (sats)</th></tr>
${dist.map(b=>`<tr><td>${b.lbl}</td><td class="n">${cz(b.count)}</td><td class="n">${pct(b.count,conf.length)}</td><td>${bar(b.count,Math.max(...dist.map(x=>x.count)))}</td><td class="n">${cz(b.sum)}</td></tr>`).join("")}
</table>

<h2>5 · Vývoj v čase (potvrzené platby po dnech)</h2>
<table>
<tr><th>Den</th><th class="n">Platby</th><th class="n">BTC / CZK</th><th class="n">Objem (sats)</th><th style="width:32%">Objem</th></tr>
${days.map(d=>`<tr><td>${d.day}</td><td class="n">${cz(d.count)}</td><td class="n">${d.btc}/${d.czk}</td><td class="n">${cz(d.sats)}</td><td>${bar(d.sats,maxDaySats)}</td></tr>`).join("")}
</table>
<div class="muted">Nejsilnější den: <b>${peakDay?peakDay.day:"—"}</b> — ${peakDay?cz(peakDay.sats):0} sats v ${peakDay?peakDay.count:0} platbách.</div>

<h2>6 · Top přispěvatelé (dle objemu)</h2>
<table>
<tr><th class="n">#</th><th>Přispěvatel / skupina</th><th class="n">Platby</th><th class="n">Objem (sats)</th><th class="n">Objem (BTC)</th><th class="n">Podíl</th></tr>
${top.map((e,i)=>`<tr><td class="n">${i+1}</td><td>${esc(e.name)}</td><td class="n">${e.count}</td><td class="n">${cz(e.sats)}</td><td class="n">${btc(e.sats/SATS)}</td><td class="n">${pct(e.sats,totSats)}</td></tr>`).join("")}
</table>

<h2>7 · Stavy plateb</h2>
<table>
<tr><th>Stav</th><th class="n">BTC</th><th class="n">CZK</th><th class="n">Celkem</th></tr>
${["confirmed","pending","expired","rejected"].map(s=>{const b=byStatus[s+"/BTC"]||0,c=byStatus[s+"/CZK"]||0;return `<tr><td>${({confirmed:"Potvrzené",pending:"Čekající",expired:"Expirované",rejected:"Zamítnuté"})[s]}</td><td class="n">${cz(b)}</td><td class="n">${cz(c)}</td><td class="n">${cz(b+c)}</td></tr>`;}).join("")}
<tr style="font-weight:700;background:#faf3e8"><td>Vytvořeno celkem</td><td class="n" colspan="3">${cz(createdCount)}</td></tr>
</table>
<div class="muted">Konverze vytvořené → potvrzené: <b>${pct(conf.length,createdCount)}</b>. Expirované = vygenerovaná platba/QR bez dokončení; nezapočítává se.</div>

<div class="foot">
Report vygenerován automaticky z produkční databáze sbírky (potvrzené příspěvky) a z BTCPay Serveru (LN/on-chain rozpad). Částky v BTC jsou v okamžiku potvrzení; CZK příspěvky převedeny na BTC ekvivalent kurzem při potvrzení, hodnota v CZK/USD v souhrnu je přepočtena aktuálním kurzem (${cz(rateCzk)} Kč/BTC, $${cz(rateUsd)}/BTC). Sbírku zastřešuje The Malahar Network z.s.
</div>
</body></html>`;

const htmlPath = path.join(REPORT_DIR, "report.html");
const pdfPath = path.join(REPORT_DIR, "report.pdf");
fs.writeFileSync(htmlPath, html);
console.log("HTML zapsáno. Klíčová čísla:");
console.log(" vybráno:", btc(totBtc),"BTC =", cz(totSats),"sats | BTC", cz(btcSats),"| CZK", cz(czkSats),"(",cz2(czkKc),"Kč )");
console.log(" LN:", cz(lnTot),"| on-chain:", cz(chain), "| přispěvatelé:", allPeople.size, "| platby:", conf.length);
console.log(" dní:", days.length, "| top1:", top[0].name, cz(top[0].sats),"sats");
try {
  execFileSync("chromium", ["--headless","--no-sandbox","--disable-gpu","--no-pdf-header-footer","--print-to-pdf="+pdfPath, "file://"+htmlPath], { stdio: "ignore", timeout: 120000 });
  const sz = fs.statSync(pdfPath).size;
  if (sz < 5000) throw new Error("PDF příliš malé ("+sz+" B)");
  console.log("PDF ok:", pdfPath, sz, "B");
} catch (e) {
  console.error("PDF generování selhalo:", e.message); process.exitCode = 1;
}
await p.$disconnect();
