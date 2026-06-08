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
  const [filter, setFilter] = useState("pending");
  const [view, setView] = useState<"payments" | "analytics" | "fiat">(
    "payments",
  );
  const [fiatList, setFiatList] = useState<Donation[]>([]);
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

  const loadFio = useCallback(async () => {
    const res = await fetch("/api/admin/fio-payments", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { payments: FioPayment[] };
    setFio(data.payments);
  }, []);

  const load = useCallback(
    async (status: string) => {
      const res = await fetch(`/api/admin/donations?status=${status}`, {
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
    load(filter);
  }, [filter, load]);

  // Checklist nákupu BTC za fiat: potvrzené CZK platby (nejstarší první).
  const loadFiat = useCallback(async () => {
    const res = await fetch("/api/admin/donations?status=confirmed", {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { donations: Donation[] };
    setFiatList(
      data.donations
        .filter((d) => d.currency === "CZK")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  }, []);

  useEffect(() => {
    if (view === "fiat") loadFiat();
  }, [view, loadFiat]);

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
    await load(filter);
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
      load(filter);
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
    await load(filter);
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
    await load(filter);
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
    await load(filter);
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
      ) : (
      <>
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

      {donations.length === 0 ? (
        <p className="text-white/40 py-8 text-center">Žádné záznamy.</p>
      ) : (
        <div className="space-y-3">
          {donations.map((d) => (
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
                  placeholder="https://… (např. logo firmy; nahradí avatar)"
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 px-2 py-1 text-xs font-mono focus:outline-none"
                />
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
      )}
      </>
      )}
    </div>
  );
}
