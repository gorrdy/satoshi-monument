import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchNewFioTransactions } from "@/lib/fio";
import { czkToBtc } from "@/lib/price";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key =
    req.nextUrl.searchParams.get("key") ?? req.headers.get("x-cron-key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Auto-expirace: nezaplacené CZK QR starší než 2 h → „expired"
  // (případ, kdy někdo vygeneruje QR, ale platbu nepošle). Běží i bez Fio tokenu.
  const EXPIRE_HOURS = 2;
  const cutoff = new Date(Date.now() - EXPIRE_HOURS * 3600 * 1000);
  const expiredRes = await prisma.donation.updateMany({
    where: { status: "pending", currency: "CZK", createdAt: { lt: cutoff } },
    data: { status: "expired" },
  });

  const result = await fetchNewFioTransactions();
  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      reason: result.reason,
      expiredCount: expiredRes.count,
    });
  }

  // Jen příchozí CZK platby.
  const credits = result.transactions.filter(
    (t) => t.amount > 0 && t.currency === "CZK",
  );

  const confirmed: Array<{ id: string; amount: number; vs: string | null }> = [];
  let unmatchedCount = 0;

  for (const tx of credits) {
    // Idempotence: už vyřízenou platbu (matched/ignored) nepřepočítáváme.
    // (chrání proti dvojímu započtení při reprocessu / resetu kurzoru)
    const existingFio = await prisma.fioPayment.findUnique({
      where: { fioId: tx.id },
      select: { status: true },
    });
    if (existingFio && existingFio.status !== "unmatched") continue;

    // Párovací identifikátory: kód SN-XXXXX ze zprávy (preferovaný — větší prostor,
    // řeší kolizi VS) a variabilní symbol jako fallback.
    const refMatch = tx.message?.toUpperCase().match(/SN-[0-9A-Z]{5}/);
    const ref = refMatch ? refMatch[0] : null;

    // „Vlastník" daru — primárně podle SN, pak podle VS; nejstarší (původní) shoda.
    let owner = ref
      ? await prisma.donation.findFirst({
          where: { currency: "CZK", paymentRef: ref },
          orderBy: { createdAt: "asc" },
        })
      : null;
    if (!owner && tx.vs) {
      owner = await prisma.donation.findFirst({
        where: { currency: "CZK", variableSymbol: tx.vs },
        orderBy: { createdAt: "asc" },
      });
    }

    const base = {
      fioId: tx.id,
      date: tx.date,
      amount: tx.amount,
      currency: tx.currency,
      vs: tx.vs,
      message: tx.message,
      payerName: tx.payerName,
    };

    if (!owner) {
      unmatchedCount++;
      await prisma.fioPayment.upsert({
        where: { fioId: tx.id },
        create: { ...base, status: "unmatched" },
        update: {}, // existující (např. ignored) nepřepisujeme
      });
      continue;
    }

    const amountBtc = await czkToBtc(tx.amount);

    if (owner.status === "pending" || owner.status === "expired") {
      // První (nebo pozdní) platba → potvrdit původní dar skutečnou částkou.
      await prisma.donation.update({
        where: { id: owner.id },
        data: {
          status: "confirmed",
          amount: tx.amount,
          amountBtc,
          confirmedAt: new Date(),
        },
      });
      confirmed.push({ id: owner.id, amount: tx.amount, vs: tx.vs });
      await prisma.fioPayment.upsert({
        where: { fioId: tx.id },
        create: { ...base, status: "matched", donationId: owner.id },
        update: { status: "matched", donationId: owner.id },
      });
    } else {
      // Původní dar už potvrzený → OPAKOVANÁ platba se stejným VS/SN.
      // Založíme nový potvrzený dar (dědí identifikátor/jméno) → sečte se na zdi.
      const dup = await prisma.donation.create({
        data: {
          name: owner.name,
          currency: "CZK",
          amount: tx.amount,
          amountBtc,
          status: "confirmed",
          confirmedAt: new Date(),
          donorKey: owner.donorKey,
          publicMessage: owner.publicMessage,
          variableSymbol: owner.variableSymbol,
          paymentRef: owner.paymentRef,
        },
      });
      confirmed.push({ id: dup.id, amount: tx.amount, vs: tx.vs });
      await prisma.fioPayment.upsert({
        where: { fioId: tx.id },
        create: { ...base, status: "matched", donationId: dup.id },
        update: { status: "matched", donationId: dup.id },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    expiredCount: expiredRes.count,
    checkedCredits: credits.length,
    confirmed,
    unmatchedCount,
  });
}
