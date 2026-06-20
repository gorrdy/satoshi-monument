"use client";

import { useCallback, useEffect, useState } from "react";
import AdminAnalytics from "@/components/AdminAnalytics";

interface Donation {
  id: string;
  createdAt: string;
  name: string;
  currency: string;
  amount: number;
  amountBtc: number | null;
  publicMessage: string | null;
  privateMessage: string | null;
  imageUrl: string | null;
  imageBg: string | null;
  status: string;
  hiddenOnWall: boolean;
  btcPurchased: boolean;
  btcpayInvoiceId: string | null;
  variableSymbol: string | null;
  paymentRef: string | null;
  donorKey: string | null;
  confirmedAt: string | null;
  kind?: string;
}

interface FioPayment {
  id: string;
  date: string | null;
  amount: number;
  currency: string;
  vs: string | null;
  message: string | null;
  payerName: string | null;
  status: string;
  donationId: string | null;
}

const FILTERS = [
  { key: "pending", label: "Čekající" },
  { key: "confirmed", label: "Potvrzené" },
  { key: "expired", label: "Expirované" },
  { key: "rejected", label: "Zamítnuté" },
  { key: "all", label: "Vše" },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "Čekající",
  confirmed: "Potvrzeno",
  expired: "Expirováno",
  rejected: "Zamítnuto",
};

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  // Záložka i filtr se pamatují mezi refreshi (localStorage).
  const [filter, setFilter] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("admin.filter") || "pending"
      : "pending",
  );
  // Filtr druhu sbírky: all | monument | supporters.
  const [kindFilter, setKindFilter] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("admin.kindFilter") || "all"
      : "all",
  );
  // Stav uzavření hlavní sbírky (+ snapshot) ze serveru.
  const [campClose, setCampClose] = useState<{
    closed: boolean;
    closedAt: string | null;
    raisedBtc: number;
    donorCount: number;
  } | null>(null);
  const [campBusy, setCampBusy] = useState(false);
  const [view, setView] = useState<
    "payments" | "analytics" | "fiat" | "identity" | "roadmap"
  >(() => {
    if (typeof window === "undefined") return "payments";
    const v = localStorage.getItem("admin.view");
    return v === "analytics" ||
      v === "fiat" ||
      v === "identity" ||
      v === "roadmap"
      ? v
      : "payments";
  });
  const [fiatList, setFiatList] = useState<Donation[]>([]);
  const [btcRate, setBtcRate] = useState<number | null>(null);
  const [btcUsd, setBtcUsd] = useState<number | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<
    Record<
      string,
      { name?: string; publicMessage?: string; imageUrl?: string; imageBg?: string }
    >
  >({});
  const [fio, setFio] = useState<FioPayment[]>([]);
  const [vsDraft, setVsDraft] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState(""); // hledání v platbách
  // Profily identifikátorů (kanonické jméno + logo)
  const [profiles, setProfiles] = useState<
    {
      id: string;
      donorKey: string;
      name: string;
      imageUrl: string | null;
      imageBg: string | null;
    }[]
  >([]);
  const [profKeys, setProfKeys] = useState<
    { donorKey: string; count: number; lastName: string }[]
  >([]);
  const [profDraft, setProfDraft] = useState<
    Record<string, { name?: string; imageUrl?: string; imageBg?: string }>
  >({});
  const [newKey, setNewKey] = useState("");

  // Roadmapa
  type RoadItem = {
    id: string;
    title: string;
    detail: string | null;
    dateLabel: string | null;
    status: string;
    order: number;
    linkUrl: string | null;
    linkBlank: boolean;
  };
  const [road, setRoad] = useState<RoadItem[]>([]);
  const [roadDraft, setRoadDraft] = useState<
    Record<
      string,
      {
        title?: string;
        detail?: string;
        dateLabel?: string;
        status?: string;
        linkUrl?: string;
        linkBlank?: boolean;
      }
    >
  >({});

  const loadRoad = useCallback(async () => {
    const res = await fetch("/api/admin/roadmap", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { items: RoadItem[] };
    setRoad(data.items);
  }, []);

  const roadAction = async (payload: Record<string, unknown>, busyKey: string) => {
    setBusy("road" + busyKey);
    await fetch("/api/admin/roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(null);
    if (payload.action === "save") {
      setRoadDraft((s) => {
        const c = { ...s };
        delete c[payload.id as string];
        return c;
      });
    }
    loadRoad();
  };

  const loadProfiles = useCallback(async () => {
    const res = await fetch("/api/admin/profiles", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      profiles: typeof profiles;
      keys: typeof profKeys;
    };
    setProfiles(data.profiles);
    setProfKeys(data.keys);
  }, []);

  const saveProfile = async (
    donorKey: string,
    d: { name?: string; imageUrl?: string; imageBg?: string },
  ) => {
    if (!d.name?.trim()) return;
    setBusy("prof" + donorKey);
    await fetch("/api/admin/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", donorKey, ...d }),
    });
    setBusy(null);
    setNewKey("");
    setProfDraft((s) => {
      const c = { ...s };
      delete c[donorKey];
      return c;
    });
    loadProfiles();
  };

  const deleteProfile = async (donorKey: string) => {
    setBusy("prof" + donorKey);
    await fetch("/api/admin/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", donorKey }),
    });
    setBusy(null);
    loadProfiles();
  };

  // Nahrání obrázku z disku → vrátí veřejnou URL (/uploads/…), nebo null.
  const uploadImage = async (
    file: File,
    busyKey: string,
  ): Promise<string | null> => {
    setBusy("up" + busyKey);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) return null;
      const d = (await res.json()) as { url?: string };
      return d.url ?? null;
    } catch {
      return null;
    } finally {
      setBusy(null);
    }
  };

  const loadFio = useCallback(async () => {
    const res = await fetch("/api/admin/fio-payments", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { payments: FioPayment[] };
    setFio(data.payments);
  }, []);

  const load = useCallback(
    async (status: string, kind: string) => {
      const kq = kind && kind !== "all" ? `&kind=${kind}` : "";
      const res = await fetch(`/api/admin/donations?status=${status}${kq}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      const data = (await res.json()) as {
        donations: Donation[];
        counts?: Record<string, number>;
      };
      setDonations(data.donations);
      if (data.counts) setCounts(data.counts);
      loadFio();
    },
    [loadFio],
  );

  useEffect(() => {
    load(filter, kindFilter);
  }, [filter, kindFilter, load]);

  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("admin.kindFilter", kindFilter);
  }, [kindFilter]);

  const loadSettings = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/settings", { cache: "no-store" });
      if (r.ok) setCampClose((await r.json()).close);
    } catch {}
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const toggleCampaignClose = async () => {
    const closing = !campClose?.closed;
    const msg = closing
      ? "Uzavřít hlavní sbírku? Zafixuje se konečný stav (vybráno + přispěvatelé) a web se překlopí do finální podoby. Příjem nových darů Přispěvatelů se zastaví. (Patroni běží dál.)"
      : "Znovu otevřít hlavní sbírku? Zruší se uzavření i snapshot a web se vrátí do běžného režimu.";
    if (!confirm(msg)) return;
    setCampBusy(true);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: closing ? "close" : "reopen" }),
      });
      if (r.ok) setCampClose((await r.json()).close);
    } finally {
      setCampBusy(false);
    }
  };

  // Checklist nákupu BTC za fiat: potvrzené CZK platby (nejstarší první).
  const loadFiat = useCallback(async () => {
    // Jen potvrzené CZK (kompletní, bez ořezu) — kvůli správnému součtu „zbývá nakoupit".
    const res = await fetch(
      "/api/admin/donations?status=confirmed&currency=CZK",
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const data = (await res.json()) as { donations: Donation[] };
    setFiatList(
      data.donations.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
    // Aktuální kurz BTC/CZK pro výpočet short pozice.
    try {
      const s = await fetch("/api/stats", { cache: "no-store" });
      if (s.ok) {
        const sd = (await s.json()) as {
          stats?: { btcCzkRate?: number; btcUsdRate?: number };
        };
        if (sd.stats?.btcCzkRate) setBtcRate(sd.stats.btcCzkRate);
        if (sd.stats?.btcUsdRate) setBtcUsd(sd.stats.btcUsdRate);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (view === "fiat") loadFiat();
    if (view === "identity") loadProfiles();
    if (view === "roadmap") loadRoad();
  }, [view, loadFiat, loadProfiles, loadRoad]);

  // Zapamatovat poslední zvolenou záložku a filtr.
  useEffect(() => {
    localStorage.setItem("admin.view", view);
  }, [view]);
  useEffect(() => {
    localStorage.setItem("admin.filter", filter);
  }, [filter]);

  const togglePurchased = async (d: Donation) => {
    setBusy("buy" + d.id);
    // optimisticky překlopit
    setFiatList((list) =>
      list.map((x) =>
        x.id === d.id ? { ...x, btcPurchased: !x.btcPurchased } : x,
      ),
    );
    await fetch("/api/admin/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: d.id,
        action: "setPurchased",
        purchased: !d.btcPurchased,
      }),
    });
    setBusy(null);
  };

  const actFio = async (id: string, action: string, vs?: string) => {
    setBusy("fio" + id + action);
    const res = await fetch("/api/admin/fio-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, vs }),
    });
    if (action === "assign" && res.status === 404) {
      alert("K zadanému VS nebyl nalezen žádný čekající dar.");
    }
    await load(filter, kindFilter);
    setBusy(null);
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      setPassword("");
      load(filter, kindFilter);
    } else {
      setLoginError("Nesprávné jméno nebo heslo.");
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
  };

  const act = async (id: string, action: string) => {
    setBusy(id + action);
    await fetch("/api/admin/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await load(filter, kindFilter);
    setBusy(null);
  };

  const saveKey = async (id: string, donorKey: string) => {
    setBusy(id + "setKey");
    await fetch("/api/admin/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "setKey", donorKey }),
    });
    setKeyDraft((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
    await load(filter, kindFilter);
    setBusy(null);
  };

  const saveEdit = async (d: Donation) => {
    setBusy(d.id + "edit");
    await fetch("/api/admin/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: d.id,
        action: "edit",
        name: edits[d.id]?.name ?? d.name,
        publicMessage: edits[d.id]?.publicMessage ?? d.publicMessage ?? "",
        imageUrl: edits[d.id]?.imageUrl ?? d.imageUrl ?? "",
        imageBg: edits[d.id]?.imageBg ?? d.imageBg ?? "",
      }),
    });
    setEdits((s) => {
      const next = { ...s };
      delete next[d.id];
      return next;
    });
    await load(filter, kindFilter);
    setBusy(null);
  };

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50">
        Načítám…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form
          onSubmit={login}
          className="w-full max-w-sm rounded-2xl bg-[#13131a] border border-white/10 p-6"
        >
          <h1 className="text-xl font-bold mb-4">Správa sbírky</h1>
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Uživatelské jméno"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 mb-3 focus:border-accent focus:outline-none"
            autoFocus
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Heslo"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 mb-3 focus:border-accent focus:outline-none"
          />
          {loginError && (
            <p className="text-sm text-red-400 mb-3">{loginError}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-accent py-2.5 font-semibold text-black hover:brightness-110 transition"
          >
            Přihlásit
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Správa sbírky</h1>
        <button
          onClick={logout}
          className="text-sm text-white/50 hover:text-white"
        >
          Odhlásit
        </button>
      </div>

      {/* Záložky */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
        {([
          { key: "payments", label: "Platby" },
          { key: "fiat", label: "Nákup BTC za fiat" },
          { key: "identity", label: "Identity" },
          { key: "roadmap", label: "Roadmapa" },
          { key: "analytics", label: "Analytika" },
        ] as const).map((tb) => (
          <button
            key={tb.key}
            onClick={() => setView(tb.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === tb.key
                ? "bg-white/15 text-white"
                : "text-white/50 hover:text-white"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {view === "analytics" ? (
        <AdminAnalytics />
      ) : view === "fiat" ? (
        (() => {
          const todo = fiatList.filter((d) => !d.btcPurchased);
          const done = fiatList.filter((d) => d.btcPurchased);
          const sum = (arr: Donation[], f: (d: Donation) => number) =>
            arr.reduce((s, d) => s + f(d), 0);
          const czk = (n: number) => Math.round(n).toLocaleString("cs-CZ");
          const btc = (n: number) => n.toFixed(8);
          return (
            <div>
              <p className="text-sm text-white/50 mb-4">
                Potvrzené CZK platby. Zaškrtni, za co už jsi nakoupil BTC na burze.
                BTC částka = přepočet zafixovaný v okamžiku přijetí platby.
              </p>

              {/* Souhrn k nákupu */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
                  <div className="text-xs text-white/50">Zbývá nakoupit (CZK)</div>
                  <div className="text-lg font-bold text-amber-300">
                    {czk(sum(todo, (d) => d.amount))} Kč
                  </div>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
                  <div className="text-xs text-white/50">Zbývá nakoupit (BTC)</div>
                  <div className="text-lg font-bold font-mono text-amber-300">
                    {btc(sum(todo, (d) => d.amountBtc ?? 0))}
                  </div>
                </div>
                <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-3">
                  <div className="text-xs text-white/50">Nakoupeno (CZK)</div>
                  <div className="text-lg font-bold text-green-300">
                    {czk(sum(done, (d) => d.amount))} Kč
                  </div>
                </div>
                <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-3">
                  <div className="text-xs text-white/50">Nakoupeno (BTC)</div>
                  <div className="text-lg font-bold font-mono text-green-300">
                    {btc(sum(done, (d) => d.amountBtc ?? 0))}
                  </div>
                </div>
              </div>

              {/* Short pozice: kolik BTC dlužíme dárcům (zafixováno při přijetí)
                  vs. kolik BTC reálně koupíme teď za držené CZK. */}
              {(() => {
                const czkTodo = sum(todo, (d) => d.amount);
                const btcOwed = sum(todo, (d) => d.amountBtc ?? 0);
                if (!btcRate || todo.length === 0) {
                  return (
                    <p className="text-sm text-white/40 mb-6">
                      {todo.length === 0
                        ? "Vše nakoupeno — žádná otevřená pozice. 🎉"
                        : "Načítám aktuální kurz…"}
                    </p>
                  );
                }
                const btcBuyableNow = czkTodo / btcRate; // co koupíme teď za držené CZK
                const shortBtc = btcOwed - btcBuyableNow; // + = jsme short (cena vzrostla)
                const positionCzk = czkTodo - btcOwed * btcRate; // + = přebytek, − = ztráta
                const isShort = shortBtc > 0;
                // Break-even: kurz, při kterém držené CZK koupí přesně dlužené BTC.
                const breakEvenCzk = btcOwed > 0 ? czkTodo / btcOwed : 0;
                // Převod na USD přes poměr aktuálních kurzů (czkPerUsd = czk/usd).
                const breakEvenUsd =
                  btcUsd && btcRate ? breakEvenCzk * (btcUsd / btcRate) : 0;
                const usd = (n: number) =>
                  "$" + Math.round(n).toLocaleString("en-US");
                return (
                  <div className="rounded-xl border border-white/15 bg-white/5 p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">
                        Otevřená pozice (zbývá nakoupit)
                      </h3>
                      <span className="text-xs text-white/40">
                        kurz {czk(btcRate)} Kč/BTC
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <div className="text-xs text-white/50">
                          Dlužíme dárcům (BTC)
                        </div>
                        <div className="font-mono font-bold">{btc(btcOwed)}</div>
                        <div className="text-xs text-white/40">
                          kurz při přijetí plateb
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50">
                          Koupíme teď za {czk(czkTodo)} Kč
                        </div>
                        <div className="font-mono font-bold">
                          {btc(btcBuyableNow)}
                        </div>
                        <div className="text-xs text-white/40">aktuální kurz</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50">
                          {isShort ? "Chybí (short) BTC" : "Přebytek BTC"}
                        </div>
                        <div
                          className={`font-mono font-bold ${isShort ? "text-red-300" : "text-green-300"}`}
                        >
                          {isShort ? "−" : "+"}
                          {btc(Math.abs(shortBtc))}
                        </div>
                        <div
                          className={`text-xs ${positionCzk < 0 ? "text-red-300/70" : "text-green-300/70"}`}
                        >
                          {positionCzk >= 0 ? "+" : "−"}
                          {czk(Math.abs(positionCzk))} Kč
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50">
                          Break-even cena BTC
                        </div>
                        <div className="font-mono font-bold">
                          {breakEvenUsd ? usd(breakEvenUsd) : "—"}
                        </div>
                        <div className="text-xs text-white/40">
                          {czk(breakEvenCzk)} Kč · pod ní jsi v plusu
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-white/40 mt-3 leading-relaxed">
                      {isShort
                        ? "Cena BTC od přijetí plateb vzrostla — za držené koruny teď koupíš méně, než kolik dárcům „dlužíš“. Čím dřív nakoupíš, tím menší riziko."
                        : "Cena BTC od přijetí plateb klesla — za držené koruny teď koupíš víc, než kolik dárcům „dlužíš“."}
                    </p>
                  </div>
                );
              })()}

              {fiatList.length === 0 ? (
                <p className="text-white/50 py-8 text-center">
                  Zatím žádné potvrzené CZK platby.
                </p>
              ) : (
                <ul className="space-y-2">
                  {fiatList.map((d) => (
                    <li
                      key={d.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                        d.btcPurchased
                          ? "border-green-500/30 bg-green-500/5 opacity-70"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={d.btcPurchased}
                        disabled={busy === "buy" + d.id}
                        onChange={() => togglePurchased(d)}
                        className="w-5 h-5 shrink-0 accent-green-500 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={`font-semibold ${d.btcPurchased ? "line-through text-white/50" : ""}`}
                        >
                          {d.name}
                        </span>
                        <span className="text-white/40 text-xs ml-2">
                          {new Date(d.createdAt).toLocaleDateString("cs-CZ")}
                          {d.variableSymbol ? ` · VS ${d.variableSymbol}` : ""}
                        </span>
                      </div>
                      <span className="font-mono text-sm whitespace-nowrap">
                        {czk(d.amount)} Kč
                      </span>
                      <span className="font-mono text-sm text-accent whitespace-nowrap">
                        {btc(d.amountBtc ?? 0)} BTC
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()
      ) : view === "identity" ? (
        (() => {
          const inp =
            "bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder:text-white/30";
          const withoutProfile = profKeys.filter(
            (k) => !profiles.some((p) => p.donorKey === k.donorKey),
          );
          const newDraft = profDraft["__new__"] ?? {};
          return (
            <div className="space-y-8">
              <p className="text-sm text-white/60 max-w-2xl leading-relaxed">
                Profil identifikátoru: jedno kanonické <strong>jméno</strong> a{" "}
                <strong>logo</strong>, které se použije na zdi i v recent — bez
                ohledu na to, co přispěvatel zadá. Z platby se převezme jen
                zpráva a částka.
              </p>

              {/* Existující profily */}
              <div>
                <h3 className="text-sm font-semibold text-white/80 mb-3">
                  Profily ({profiles.length})
                </h3>
                <div className="space-y-2">
                  {profiles.length === 0 && (
                    <p className="text-white/40 text-sm">Zatím žádné.</p>
                  )}
                  {profiles.map((p) => {
                    const d = profDraft[p.donorKey] ?? {};
                    const name = d.name ?? p.name;
                    const imageUrl = d.imageUrl ?? p.imageUrl ?? "";
                    const imageBg = d.imageBg ?? p.imageBg ?? "";
                    const set = (
                      patch: Partial<{
                        name: string;
                        imageUrl: string;
                        imageBg: string;
                      }>,
                    ) =>
                      setProfDraft((s) => ({
                        ...s,
                        [p.donorKey]: { ...s[p.donorKey], ...patch },
                      }));
                    return (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3"
                      >
                        <div
                          className="w-10 h-10 shrink-0 overflow-hidden rounded border border-white/10"
                          style={{ background: imageBg || "#ffffff" }}
                        >
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageUrl}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          ) : null}
                        </div>
                        <code
                          className="text-xs text-white/50 w-28 truncate"
                          title={p.donorKey}
                        >
                          {p.donorKey}
                        </code>
                        <input
                          value={name}
                          onChange={(e) => set({ name: e.target.value })}
                          placeholder="Jméno"
                          className={`${inp} w-36`}
                        />
                        <input
                          value={imageUrl}
                          onChange={(e) => set({ imageUrl: e.target.value })}
                          placeholder="URL loga nebo nahraj →"
                          className={`${inp} flex-1 min-w-[12rem]`}
                        />
                        <label className="shrink-0 px-2 py-1 text-sm rounded bg-white/15 text-white hover:bg-white/25 cursor-pointer">
                          {busy === "up" + p.donorKey ? "…" : "Nahrát"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (!f) return;
                              const url = await uploadImage(f, p.donorKey);
                              if (url) set({ imageUrl: url });
                            }}
                          />
                        </label>
                        <input
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(imageBg) ? imageBg : "#ffffff"}
                          onChange={(e) => set({ imageBg: e.target.value })}
                          className="w-8 h-8 rounded bg-transparent border border-white/10 cursor-pointer"
                          title="Barva pozadí pod logem"
                        />
                        <button
                          onClick={() =>
                            saveProfile(p.donorKey, { name, imageUrl, imageBg })
                          }
                          disabled={busy === "prof" + p.donorKey}
                          className="px-3 py-1 rounded bg-white/15 text-white text-sm hover:bg-white/25 disabled:opacity-40"
                        >
                          Uložit
                        </button>
                        <button
                          onClick={() => deleteProfile(p.donorKey)}
                          disabled={busy === "prof" + p.donorKey}
                          className="px-3 py-1 rounded text-red-300 text-sm hover:bg-red-500/15"
                        >
                          Smazat
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Použité identifikátory bez profilu */}
              {withoutProfile.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white/80 mb-3">
                    Identifikátory bez profilu ({withoutProfile.length})
                  </h3>
                  <div className="space-y-2">
                    {withoutProfile.map((k) => {
                      const draftName = profDraft[k.donorKey]?.name ?? k.lastName;
                      return (
                        <div
                          key={k.donorKey}
                          className="flex flex-wrap items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3"
                        >
                          <code
                            className="text-xs text-white/50 w-28 truncate"
                            title={k.donorKey}
                          >
                            {k.donorKey}
                          </code>
                          <span className="text-xs text-white/40">
                            {k.count}× · naposledy „{k.lastName}"
                          </span>
                          <input
                            value={draftName}
                            onChange={(e) =>
                              setProfDraft((s) => ({
                                ...s,
                                [k.donorKey]: {
                                  ...s[k.donorKey],
                                  name: e.target.value,
                                },
                              }))
                            }
                            placeholder="kanonické jméno"
                            className={`${inp} w-36`}
                          />
                          <button
                            onClick={() =>
                              saveProfile(k.donorKey, { name: draftName })
                            }
                            disabled={busy === "prof" + k.donorKey}
                            className="px-3 py-1 rounded bg-white/15 text-white text-sm hover:bg-white/25 disabled:opacity-40"
                          >
                            Vytvořit profil
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ruční přidání */}
              <div>
                <h3 className="text-sm font-semibold text-white/80 mb-3">
                  Přidat ručně
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="identifikátor (donorKey)"
                    className={`${inp} w-44`}
                  />
                  <input
                    value={newDraft.name ?? ""}
                    onChange={(e) =>
                      setProfDraft((s) => ({
                        ...s,
                        __new__: { ...s.__new__, name: e.target.value },
                      }))
                    }
                    placeholder="jméno"
                    className={`${inp} w-36`}
                  />
                  <button
                    onClick={() => newKey.trim() && saveProfile(newKey, newDraft)}
                    disabled={!newKey.trim() || !newDraft.name?.trim()}
                    className="px-3 py-1 rounded bg-white/15 text-white text-sm hover:bg-white/25 disabled:opacity-40"
                  >
                    Přidat
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      ) : view === "roadmap" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-white/60 max-w-2xl leading-relaxed">
              Checkpointy sbírky. Stav: <strong>upcoming</strong> (čeká),{" "}
              <strong>current</strong> (právě teď), <strong>done</strong>{" "}
              (hotovo). Pořadí přesouvej šipkami.
            </p>
            <button
              onClick={() => roadAction({ action: "add", title: "Nový bod" }, "add")}
              disabled={busy === "roadadd"}
              className="shrink-0 px-3 py-1.5 rounded bg-white/15 text-white text-sm hover:bg-white/25 disabled:opacity-40"
            >
              + Přidat bod
            </button>
          </div>
          {road.length === 0 && (
            <p className="text-white/40 text-sm">Zatím žádné body.</p>
          )}
          <div className="space-y-2">
            {road.map((it, i) => {
              const d = roadDraft[it.id] ?? {};
              const title = d.title ?? it.title;
              const detail = d.detail ?? it.detail ?? "";
              const dateLabel = d.dateLabel ?? it.dateLabel ?? "";
              const status = d.status ?? it.status;
              const link = d.linkUrl ?? it.linkUrl ?? "";
              const blank = d.linkBlank ?? it.linkBlank ?? true;
              const set = (
                patch: Partial<{
                  title: string;
                  detail: string;
                  dateLabel: string;
                  status: string;
                  linkUrl: string;
                  linkBlank: boolean;
                }>,
              ) => setRoadDraft((s) => ({ ...s, [it.id]: { ...s[it.id], ...patch } }));
              return (
                <div
                  key={it.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-col">
                      <button
                        onClick={() => roadAction({ action: "move", id: it.id, dir: "up" }, it.id)}
                        disabled={i === 0}
                        className="text-white/50 hover:text-white disabled:opacity-20 leading-none"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => roadAction({ action: "move", id: it.id, dir: "down" }, it.id)}
                        disabled={i === road.length - 1}
                        className="text-white/50 hover:text-white disabled:opacity-20 leading-none"
                      >
                        ▼
                      </button>
                    </div>
                    <input
                      value={dateLabel}
                      onChange={(e) => set({ dateLabel: e.target.value })}
                      placeholder="Termín (např. Q3 2026)"
                      className="w-36 bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder:text-white/30"
                    />
                    <input
                      value={title}
                      onChange={(e) => set({ title: e.target.value })}
                      placeholder="Název"
                      className="flex-1 min-w-[10rem] bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder:text-white/30"
                    />
                    <select
                      value={status}
                      onChange={(e) => set({ status: e.target.value })}
                      className="bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-white"
                    >
                      <option value="upcoming">upcoming</option>
                      <option value="current">current</option>
                      <option value="done">done</option>
                    </select>
                    <button
                      onClick={() =>
                        roadAction(
                          {
                            action: "save",
                            id: it.id,
                            title,
                            detail,
                            dateLabel,
                            status,
                            linkUrl: link,
                            linkBlank: blank,
                          },
                          it.id,
                        )
                      }
                      disabled={busy === "road" + it.id}
                      className="px-3 py-1 rounded bg-white/15 text-white text-sm hover:bg-white/25 disabled:opacity-40"
                    >
                      Uložit
                    </button>
                    <button
                      onClick={() => roadAction({ action: "delete", id: it.id }, it.id)}
                      className="px-3 py-1 rounded text-red-300 text-sm hover:bg-red-500/15"
                    >
                      Smazat
                    </button>
                  </div>
                  <input
                    value={detail}
                    onChange={(e) => set({ detail: e.target.value })}
                    placeholder="Popis (volitelné)"
                    className="w-full bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder:text-white/30"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={link}
                      onChange={(e) => set({ linkUrl: e.target.value })}
                      placeholder="Odkaz (volitelné, https://… — proklik z názvu)"
                      className="flex-1 min-w-[12rem] bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder:text-white/30"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={blank}
                        onChange={(e) => set({ linkBlank: e.target.checked })}
                        className="accent-[var(--accent)]"
                      />
                      otevřít v novém okně
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
      <>
      {/* Uzavření hlavní sbírky (+ snapshot) */}
      <div
        className={`mb-6 rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
          campClose?.closed
            ? "border-red-500/40 bg-red-500/10"
            : "border-white/10 bg-white/5"
        }`}
      >
        <div>
          <div className="font-semibold">
            {campClose?.closed
              ? "🔒 Hlavní sbírka UZAVŘENA"
              : "Hlavní sbírka běží"}
          </div>
          {campClose?.closed && (
            <div className="text-xs text-white/50 mt-0.5 font-mono">
              snapshot: {campClose.raisedBtc.toFixed(8)} BTC ·{" "}
              {campClose.donorCount} přispěvatelů
              {campClose.closedAt
                ? " · " + new Date(campClose.closedAt).toLocaleString("cs-CZ")
                : ""}
            </div>
          )}
          {!campClose?.closed && (
            <div className="text-xs text-white/40 mt-0.5">
              Po uzavření se zafixuje konečný stav a web se překlopí do finální
              podoby. Patroni běží dál.
            </div>
          )}
        </div>
        <button
          onClick={toggleCampaignClose}
          disabled={campBusy}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            campClose?.closed
              ? "bg-white/10 text-white hover:bg-white/20"
              : "bg-red-500/80 text-white hover:bg-red-500"
          }`}
        >
          {campBusy
            ? "…"
            : campClose?.closed
              ? "Otevřít sbírku"
              : "Uzavřít sbírku"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const c = counts[f.key];
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f.key
                  ? "bg-accent text-black font-semibold"
                  : "bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {f.label}
              {c != null && (
                <span
                  className={`ml-1.5 ${filter === f.key ? "opacity-70" : "opacity-50"}`}
                >
                  {c}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filtr druhu sbírky */}
      <div className="flex flex-wrap gap-2 mb-6 -mt-3">
        {[
          ["all", "Vše"],
          ["monument", "Hlavní (Přispěvatelé)"],
          ["supporters", "Patroni"],
        ].map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              kindFilter === k
                ? "bg-white/15 text-white font-semibold"
                : "bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Nepárované příchozí platby z Fio */}
      {fio.filter((p) => p.status === "unmatched").length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <h2 className="font-semibold text-amber-300 mb-3">
            ⚠ Nepárované příchozí platby z Fio
          </h2>
          <div className="space-y-3">
            {fio
              .filter((p) => p.status === "unmatched")
              .map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg bg-black/20 border border-white/10 p-3"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mb-2">
                    <span className="font-mono font-semibold text-accent">
                      {p.amount} {p.currency}
                    </span>
                    <span className="text-white/60">
                      VS: <span className="font-mono">{p.vs || "—"}</span>
                    </span>
                    <span className="text-white/60">{p.payerName || ""}</span>
                    {p.date && (
                      <span className="text-white/40 font-mono text-xs">
                        {p.date.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  {p.message && (
                    <p className="text-xs text-white/50 mb-2">💬 {p.message}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={vsDraft[p.id] ?? p.vs ?? ""}
                      onChange={(e) =>
                        setVsDraft((s) => ({ ...s, [p.id]: e.target.value }))
                      }
                      placeholder="VS čekajícího daru"
                      className="w-44 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs font-mono focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        actFio(p.id, "assign", vsDraft[p.id] ?? p.vs ?? "")
                      }
                      disabled={busy === "fio" + p.id + "assign"}
                      className="rounded bg-green-500/20 text-green-300 px-3 py-1 text-xs hover:bg-green-500/30 transition disabled:opacity-50"
                    >
                      ✓ Přiřadit k daru
                    </button>
                    <button
                      onClick={() => actFio(p.id, "ignore")}
                      disabled={busy === "fio" + p.id + "ignore"}
                      className="rounded bg-white/10 text-white/60 px-3 py-1 text-xs hover:bg-white/20 transition disabled:opacity-50"
                    >
                      Ignorovat
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Hledat (jméno, vzkaz, faktura, identifikátor, částka)…"
        className="w-full mb-4 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
      />
      {(() => {
        const needle = q.trim().toLowerCase();
        const shown = needle
          ? donations.filter((d) =>
              [
                d.name,
                d.publicMessage,
                d.privateMessage,
                d.donorKey,
                d.btcpayInvoiceId,
                d.variableSymbol,
                d.paymentRef,
                String(d.amount),
                d.amountBtc != null ? String(d.amountBtc) : "",
              ]
                .filter(Boolean)
                .some((f) => String(f).toLowerCase().includes(needle)),
            )
          : donations;
        return shown.length === 0 ? (
          <p className="text-white/40 py-8 text-center">
            {donations.length === 0 ? "Žádné záznamy." : "Nic neodpovídá hledání."}
          </p>
        ) : (
          <div className="space-y-3">
            {shown.map((d) => (
            <div
              key={d.id}
              className="rounded-xl bg-white/5 border border-white/10 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{d.name}</span>
                  <span className="font-mono text-accent text-sm">
                    {d.currency === "CZK"
                      ? `${d.amount} Kč`
                      : `${d.amount} BTC`}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      d.status === "confirmed"
                        ? "bg-green-500/20 text-green-300"
                        : d.status === "rejected"
                          ? "bg-red-500/20 text-red-300"
                          : d.status === "expired"
                            ? "bg-white/10 text-white/50"
                            : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {STATUS_LABEL[d.status] ?? d.status}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                    {d.currency}
                  </span>
                  {d.kind === "supporters" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                      Patroni
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/40 font-mono">
                  {new Date(d.createdAt).toLocaleString("cs-CZ")}
                </span>
              </div>

              {(d.variableSymbol || d.paymentRef) && (
                <p className="text-xs text-white/50 mb-1 flex flex-wrap gap-x-4">
                  {d.variableSymbol && (
                    <span>
                      VS: <span className="font-mono">{d.variableSymbol}</span>
                    </span>
                  )}
                  {d.paymentRef && (
                    <span>
                      Poznámka:{" "}
                      <span className="font-mono text-accent">
                        {d.paymentRef}
                      </span>
                    </span>
                  )}
                </p>
              )}
              {d.amountBtc != null && (
                <p className="text-xs text-white/50 mb-1">
                  BTC ekvivalent:{" "}
                  <span className="font-mono">{d.amountBtc}</span>
                </p>
              )}
              {d.publicMessage && (
                <p className="text-sm text-white/70 mb-1">
                  💬 {d.publicMessage}
                </p>
              )}
              {d.privateMessage && (
                <p className="text-sm text-amber-300/80 mb-1">
                  🔒 {d.privateMessage}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={edits[d.id]?.name ?? d.name}
                  onChange={(e) =>
                    setEdits((s) => ({
                      ...s,
                      [d.id]: { ...s[d.id], name: e.target.value },
                    }))
                  }
                  placeholder="Jméno"
                  className="w-40 bg-white/5 border border-white/10 px-2 py-1 text-xs focus:outline-none"
                />
                <input
                  value={edits[d.id]?.publicMessage ?? d.publicMessage ?? ""}
                  onChange={(e) =>
                    setEdits((s) => ({
                      ...s,
                      [d.id]: { ...s[d.id], publicMessage: e.target.value },
                    }))
                  }
                  placeholder="Veřejný vzkaz"
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 px-2 py-1 text-xs focus:outline-none"
                />
                <button
                  onClick={() => saveEdit(d)}
                  disabled={
                    busy === d.id + "edit" ||
                    !edits[d.id] ||
                    ((edits[d.id]?.name ?? d.name) === d.name &&
                      (edits[d.id]?.publicMessage ?? d.publicMessage ?? "") ===
                        (d.publicMessage ?? "") &&
                      (edits[d.id]?.imageUrl ?? d.imageUrl ?? "") ===
                        (d.imageUrl ?? "") &&
                      (edits[d.id]?.imageBg ?? d.imageBg ?? "") ===
                        (d.imageBg ?? ""))
                  }
                  className="border border-white/10 bg-white/5 text-white px-2.5 py-1 text-xs font-medium hover:bg-white/10 transition disabled:opacity-40"
                >
                  Uložit
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-white/50 shrink-0">
                  Logo / obrázek (URL):
                </span>
                <input
                  value={edits[d.id]?.imageUrl ?? d.imageUrl ?? ""}
                  onChange={(e) =>
                    setEdits((s) => ({
                      ...s,
                      [d.id]: { ...s[d.id], imageUrl: e.target.value },
                    }))
                  }
                  placeholder="https://… nebo nahraj z disku →"
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 px-2 py-1 text-xs font-mono focus:outline-none"
                />
                <label className="shrink-0 px-2 py-1 text-xs rounded bg-white/15 text-white hover:bg-white/25 cursor-pointer">
                  {busy === "up" + d.id ? "…" : "Nahrát"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      const url = await uploadImage(f, d.id);
                      if (url)
                        setEdits((s) => ({
                          ...s,
                          [d.id]: { ...s[d.id], imageUrl: url },
                        }));
                    }}
                  />
                </label>
                {(edits[d.id]?.imageUrl ?? d.imageUrl) ? (
                  <>
                    <span className="text-xs text-white/50 shrink-0">Pozadí:</span>
                    <input
                      type="color"
                      value={edits[d.id]?.imageBg ?? d.imageBg ?? "#ffffff"}
                      onChange={(e) =>
                        setEdits((s) => ({
                          ...s,
                          [d.id]: { ...s[d.id], imageBg: e.target.value },
                        }))
                      }
                      title="Barva pozadí pod logem"
                      className="w-7 h-7 shrink-0 bg-transparent border border-white/10 rounded cursor-pointer"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={edits[d.id]?.imageUrl ?? d.imageUrl ?? ""}
                      alt="náhled"
                      className="w-7 h-7 object-contain rounded shrink-0"
                      style={{ background: edits[d.id]?.imageBg ?? d.imageBg ?? "#ffffff" }}
                    />
                  </>
                ) : null}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-white/50 shrink-0">Párovací ID:</span>
                <input
                  value={keyDraft[d.id] ?? d.donorKey ?? ""}
                  onChange={(e) =>
                    setKeyDraft((s) => ({ ...s, [d.id]: e.target.value }))
                  }
                  placeholder="e-mail / řetězec…"
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 px-2 py-1 text-xs font-mono focus:outline-none"
                />
                <button
                  onClick={() => saveKey(d.id, keyDraft[d.id] ?? d.donorKey ?? "")}
                  disabled={
                    busy === d.id + "setKey" ||
                    keyDraft[d.id] === undefined ||
                    keyDraft[d.id] === (d.donorKey ?? "")
                  }
                  className="border border-white/10 bg-white/5 text-white px-2.5 py-1 text-xs font-medium hover:bg-white/10 transition disabled:opacity-40"
                >
                  Uložit
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {d.status !== "confirmed" && (
                  <button
                    onClick={() => act(d.id, "confirm")}
                    disabled={busy === d.id + "confirm"}
                    className="rounded-md bg-green-500/20 text-green-300 px-3 py-1.5 text-sm hover:bg-green-500/30 transition disabled:opacity-50"
                  >
                    ✓ Potvrdit
                  </button>
                )}
                {d.status !== "rejected" && (
                  <button
                    onClick={() => act(d.id, "reject")}
                    disabled={busy === d.id + "reject"}
                    className="rounded-md bg-red-500/20 text-red-300 px-3 py-1.5 text-sm hover:bg-red-500/30 transition disabled:opacity-50"
                  >
                    ✕ Zamítnout
                  </button>
                )}
                {d.status === "confirmed" && d.publicMessage && (
                  <button
                    onClick={() => act(d.id, d.hiddenOnWall ? "unhide" : "hide")}
                    disabled={busy === d.id + "hide" || busy === d.id + "unhide"}
                    className="rounded-md bg-white/10 text-white/70 px-3 py-1.5 text-sm hover:bg-white/20 transition disabled:opacity-50"
                  >
                    {d.hiddenOnWall ? "Zobrazit na zdi" : "Skrýt ze zdi"}
                  </button>
                )}
              </div>
            </div>
            ))}
          </div>
        );
      })()}
      </>
      )}
    </div>
  );
}
