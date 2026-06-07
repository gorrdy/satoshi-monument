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
    // Identifikátory pro párování: VS + případný kód SN-XXXX ze zprávy.
    const refMatch = tx.message?.toUpperCase().match(/SN-[0-9A-Z]{5}/);
    const ref = refMatch ? refMatch[0] : null;
    const idOr = [
      ...(tx.vs ? [{ variableSymbol: tx.vs }] : []),
      ...(ref ? [{ paymentRef: ref }] : []),
    ];

    // 1) čekající (i už expirovaný — pozdní platba) dar se stejným VS/ref → potvrdíme.
    let donation =
      idOr.length > 0
        ? await prisma.donation.findFirst({
            where: {
              status: { in: ["pending", "expired"] },
              currency: "CZK",
              OR: idOr,
            },
          })
        : null;

    // 2) už potvrzený dar se stejným VS/ref → platba je vyřízená (žádná akce, není „nepárovaná").
    const alreadyConfirmed =
      !donation && idOr.length > 0
        ? await prisma.donation.findFirst({
            where: { status: "confirmed", currency: "CZK", OR: idOr },
          })
        : null;

    const base = {
      fioId: tx.id,
      date: tx.date,
      amount: tx.amount,
      currency: tx.currency,
      vs: tx.vs,
      message: tx.message,
      payerName: tx.payerName,
    };

    if (donation) {
      // Potvrdíme se SKUTEČNĚ přijatou částkou (přepočet na BTC ekvivalent).
      const amountBtc = await czkToBtc(tx.amount);
      await prisma.donation.update({
        where: { id: donation.id },
        data: {
          status: "confirmed",
          amount: tx.amount,
          amountBtc,
          confirmedAt: new Date(),
        },
      });
      confirmed.push({ id: donation.id, amount: tx.amount, vs: tx.vs });
      // Audit: zaznamenáme platbu jako spárovanou.
      await prisma.fioPayment.upsert({
        where: { fioId: tx.id },
        create: { ...base, status: "matched", donationId: donation.id },
        update: { status: "matched", donationId: donation.id },
      });
    } else if (alreadyConfirmed) {
      // Platba odpovídá už potvrzenému daru → vyřízená, bez upozornění.
      await prisma.fioPayment.upsert({
        where: { fioId: tx.id },
        create: { ...base, status: "matched", donationId: alreadyConfirmed.id },
        update: {},
      });
    } else {
      unmatchedCount++;
      // Uložíme nepárovanou platbu pro ruční přiřazení v adminu (bez přepisu vyřízených).
      await prisma.fioPayment.upsert({
        where: { fioId: tx.id },
        create: { ...base, status: "unmatched" },
        update: {}, // existující (např. ignored/matched) nepřepisujeme
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
