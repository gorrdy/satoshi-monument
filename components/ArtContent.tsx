"use client";

import { useLocaleSwitch } from "./I18nProvider";

/**
 * Samostatná stránka /art — „Art & Bitcoin, úvod pro umělce".
 * Podklad pro otevřenou uměleckou soutěž (Varianta 2). Dvojjazyčná (cs/en) —
 * jazyk řídí sdílený přepínač v hlavičce (useLocaleSwitch). Mimo locale prefix.
 */
export default function ArtContent() {
  const { locale, switchLocale } = useLocaleSwitch();
  const en = locale === "en";
  const L = (cs: string, e: string) => (en ? e : cs);

  const cards = en
    ? ["Free, non-state money", "A non-inflationary savings account for billions of people"]
    : ["Svobodné nestátní peníze", "Neinflační spořicí účet pro miliardy lidí"];

  const ethos: [string, string][] = en
    ? [
        ["No one is the boss.", "There's no headquarters to shut down, no director to fire. Bitcoin belongs to everyone and no one at once."],
        ["The rules apply equally to all.", "There will only ever be 21 million bitcoins. No more, no less. This number is written into the code itself and cannot be changed."],
        ["Openness.", "Bitcoin's code is public. Anyone can read it, check it, verify it. No one has to trust anyone — you just look."],
        ["Freedom and resilience.", "Bitcoin works the same in Prague, in New York, and in countries where people have no access to a bank account, in dictatorships and democracies. There's no single place to switch off or block — the network runs simultaneously on thousands of computers worldwide, and as long as even a few of them run, Bitcoin works."],
      ]
    : [
        ["Nikdo není šéf.", "Neexistuje centrála, kterou by šlo zavřít, ředitel, kterého by šlo vyhodit. Bitcoin patří všem a nikomu zároveň."],
        ["Pravidla platí pro všechny stejně.", "Bitcoinů bude jen 21 milionů. Ani víc, ani míň. Toto číslo je zapsané v samotném kódu a nejde ho změnit."],
        ["Otevřenost.", "Kód Bitcoinu je veřejný. Kdokoli si ho může přečíst, zkontrolovat, ověřit. Nikdo nemusí nikomu věřit — stačí se podívat."],
        ["Svoboda a odolnost.", "Bitcoin funguje stejně v Praze, v New Yorku i v zemích, kde lidé nemají přístup k bankovnímu účtu, v diktaturách i demokraciích. Neexistuje jediné místo, které by šlo vypnout nebo zablokovat — síť běží současně na tisících počítačů po celém světě, a dokud běží alespoň pár z nich, Bitcoin funguje."],
      ];

  return (
    <>
      <main className="px-4 py-10 sm:py-16">
        {/* Bez hlavičky (jen na této stránce) — decentní přepínač jazyka vpravo nahoře. */}
        <div className="max-w-2xl mx-auto flex justify-end mb-8 sm:mb-10">
          <div className="ui-eyebrow flex items-center gap-2 select-none">
            <button
              type="button"
              onClick={() => switchLocale("cs")}
              className={en ? "ui-muted hover:opacity-80" : "ui-accent"}
              aria-pressed={!en}
            >
              CS
            </button>
            <span aria-hidden className="ui-muted opacity-40">
              /
            </span>
            <button
              type="button"
              onClick={() => switchLocale("en")}
              className={en ? "ui-accent" : "ui-muted hover:opacity-80"}
              aria-pressed={en}
            >
              EN
            </button>
          </div>
        </div>

        {/* Hero */}
        <header className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
          <span className="ui-eyebrow ui-accent">
            {"// "}
            {L("Satoshi Monument · úvod pro umělce", "Satoshi Monument · a primer for artists")}
          </span>
          <h1 className="ui-display font-bold text-5xl sm:text-7xl mt-4 leading-[0.95]">
            Art <span className="ui-accent">&amp;</span> Bitcoin
          </h1>
          <p className="text-lg sm:text-xl ui-muted leading-relaxed mt-6 max-w-2xl mx-auto">
            {L(
              "Než začnete tvořit, tady je myšlenka, kterou máte ztělesnit. Krátký úvod do Bitcoinu, jeho étosu a příběhu Satoshiho Nakamota — pro každého, kdo se rozhodne přispět svým dílem.",
              "Before you start creating, here's the idea you're meant to embody. A short primer on Bitcoin, its ethos and the story of Satoshi Nakamoto — for anyone who decides to contribute their work.",
            )}
          </p>
        </header>

        <div className="max-w-2xl mx-auto space-y-16 sm:space-y-20">
          {/* Co je Bitcoin? */}
          <section>
            <h2 className="ui-display text-3xl sm:text-4xl font-bold mb-5 leading-tight">
              {L("Co je Bitcoin?", "What is Bitcoin?")}
            </h2>
            <div className="space-y-4 text-[1.05rem] ui-muted leading-relaxed">
              <p>
                {L(
                  "Představte si peníze, které nikdo nevlastní. Které nemá v rukou žádná banka, žádný stát, žádná firma. Peníze, které nejde vypnout, zabavit ani vytisknout navíc, když se to zrovna někomu hodí.",
                  "Imagine money that no one owns. Money held by no bank, no state, no company. Money that can't be switched off, seized, or printed in extra quantity whenever it happens to suit someone.",
                )}
              </p>
              <p className="ui-display text-2xl font-bold text-[var(--fg)] py-1">
                {L("To je Bitcoin.", "That is Bitcoin.")}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 my-7">
              {cards.map((t) => (
                <div key={t} className="ui-card p-5 flex items-center gap-3 font-medium">
                  <span className="ui-accent text-xl leading-none">₿</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4 text-[1.05rem] ui-muted leading-relaxed">
              <p>
                {L(
                  "Není to firma. Není to instituce. Je to síť tisíců počítačů po celém světě, které se spolu dohodly na společných pravidlech. A ta pravidla dodržují bez výjimek, bez nadřízeného a bez toho, aby někdo mohl říct „tentokrát to bude jinak.“",
                  "It's not a company. It's not an institution. It's a network of thousands of computers around the world that have agreed on shared rules. And they follow those rules without exceptions, without a superior, and without anyone being able to say “this time it'll be different.”",
                )}
              </p>
              <p>
                {L(
                  "Bitcoin vznikl v roce 2009, krátce po finanční krizi, kdy lidé po celém světě sledovali, jak banky padají a státy tisknou peníze, aby je zachránily — a snižují tak kupní sílu našich úspor. Bitcoin byl odpovědí na otázku: co kdyby peníze fungovaly jinak? Co kdyby existovala měna, která nezávisí na důvěře v jedinou instituci, ale na matematice a na síti počítačů a lidí, kteří se navzájem nemusí znát ani si věřit?",
                  "Bitcoin was born in 2009, shortly after the financial crisis, when people around the world watched banks collapse and states print money to save them — eroding the purchasing power of our savings. Bitcoin was an answer to the question: what if money worked differently? What if there were a currency that doesn't depend on trust in a single institution, but on mathematics and on a network of computers and people who don't need to know or trust one another?",
                )}
              </p>
            </div>
          </section>

          {/* Podstata a étos */}
          <section>
            <h2 className="ui-display text-3xl sm:text-4xl font-bold mb-5 leading-tight">
              {L("Podstata a étos", "Substance and ethos")}
            </h2>
            <p className="text-[1.05rem] ui-muted leading-relaxed mb-6">
              {L(
                "Bitcoin stojí na několika jednoduchých, ale radikálních myšlenkách:",
                "Bitcoin rests on a few simple but radical ideas:",
              )}
            </p>
            <ul className="space-y-4">
              {ethos.map(([lead, body]) => (
                <li key={lead} className="ui-border-l pl-5 py-1">
                  <span className="ui-display font-bold text-[var(--fg)]">{lead}</span>{" "}
                  <span className="ui-muted">{body}</span>
                </li>
              ))}
            </ul>
            <p className="text-[1.05rem] leading-relaxed mt-7">
              {L(
                "Tohle je étos, který definuje celou bitcoinovou komunitu: ",
                "This is the ethos that defines the whole Bitcoin community: ",
              )}
              <span className="ui-accent font-medium">
                {L(
                  "důvěra nahrazená ověřitelností, centralizace nahrazená decentralizací, kontrola nahrazená svobodou.",
                  "trust replaced by verifiability, centralization replaced by decentralization, control replaced by freedom.",
                )}
              </span>
            </p>
          </section>

          {/* Proč socha v Česku? */}
          <section>
            <h2 className="ui-display text-3xl sm:text-4xl font-bold mb-5 leading-tight">
              {L("Proč socha v Česku?", "Why a statue in Czechia?")}
            </h2>
            <div className="space-y-4 text-[1.05rem] ui-muted leading-relaxed">
              <p>
                {L(
                  "Bitcoin nevznikl v Česku. Ale Česko patří mezi místa, kde se skutečně formoval.",
                  "Bitcoin wasn't born in Czechia. But Czechia is among the places where it truly took shape.",
                )}
              </p>
              {en ? (
                <p>
                  This is where <strong className="text-[var(--fg)]">Trezor</strong> was born — the world's first hardware wallet, which today protects the bitcoins of millions. Bitcoin standards used the world over originated here. The Czech Republic is also where{" "}
                  <strong className="text-[var(--fg)]">Slush Pool</strong> (today Braiins pool) was created — the world's very first Bitcoin mining pool.{" "}
                  <strong className="text-[var(--fg)]">General Bytes</strong> is based here, the global leader in making Bitcoin ATMs. Every year Prague hosts{" "}
                  <strong className="text-[var(--fg)]">BTC Prague</strong> — the largest Bitcoin conference in Europe, bringing thousands of people from around the world.
                </p>
              ) : (
                <p>
                  Vznikl tu <strong className="text-[var(--fg)]">Trezor</strong> — první hardwarová peněženka na světě, která dnes chrání bitcoiny milionů lidí. Vznikly zde bitcoinové standardy, které využívá celý svět. V České republice vznikl i{" "}
                  <strong className="text-[var(--fg)]">Slush Pool</strong> (dnes Braiins pool) — úplně první bitcoinový těžební pool na světě. Sídlí tu{" "}
                  <strong className="text-[var(--fg)]">General Bytes</strong>, globální lídr ve výrobě bitcoinmatů. Každý rok se v Praze koná{" "}
                  <strong className="text-[var(--fg)]">BTC Prague</strong> — největší bitcoinová konference v Evropě, která sem přivádí tisíce lidí z celého světa.
                </p>
              )}
              <p>
                {L(
                  "Česko není jen zemí, kde se Bitcoin hojně používá. Je zemí, která ho pomáhala a pomáhá budovat. Proto se česká bitcoinová komunita rozhodla světu nabídnout vlastní unikátní poctu Bitcoinu — otevřenou, sdílitelnou a realizovatelnou kýmkoliv, tedy postavenou na stejném principu open source, ze kterého Bitcoin sám vyrostl.",
                  "Czechia isn't just a country where Bitcoin is widely used. It's a country that helped and still helps build it. That's why the Czech Bitcoin community decided to offer the world its own unique tribute to Bitcoin — open, shareable and buildable by anyone, founded on the same open-source principle from which Bitcoin itself grew.",
                )}
              </p>
            </div>
          </section>

          {/* Kdo je Satoshi Nakamoto? */}
          <section>
            <h2 className="ui-display text-3xl sm:text-4xl font-bold mb-5 leading-tight">
              {L("Kdo je Satoshi Nakamoto?", "Who is Satoshi Nakamoto?")}
            </h2>
            <p className="text-[1.05rem] ui-muted leading-relaxed mb-3">
              {L(
                "A teď to nejzajímavější — kdo tohle všechno vymyslel?",
                "And now the most intriguing part — who came up with all this?",
              )}
            </p>
            <p className="ui-display text-4xl sm:text-5xl font-bold ui-accent mb-6">
              {L("Nikdo neví.", "Nobody knows.")}
            </p>
            <div className="space-y-4 text-[1.05rem] ui-muted leading-relaxed">
              <p>
                {L(
                  "V roce 2008 se objevil dokument — takzvaný whitepaper — podepsaný pseudonymem Satoshi Nakamoto. Popisoval princip Bitcoinu jasně a stručně, na devíti stranách. V lednu 2009 Satoshi spustil síť naostro a vytěžil úplně první bitcoiny.",
                  "In 2008, a document appeared — the so-called whitepaper — signed with the pseudonym Satoshi Nakamoto. It described how Bitcoin works clearly and concisely, in nine pages. In January 2009 Satoshi launched the network for real and mined the very first bitcoins.",
                )}
              </p>
              <p>
                {L(
                  "Pak nadále psal kód, komunikoval s prvními vývojáři, odpovídal na otázky na diskusních fórech, společně s komunitou zdokonalovali kód. V roce 2011 konstatoval, že bitcoin je v dobrých rukou a že se jde věnovat něčemu dalšímu. A pak zmizel. Beze stopy. Nikdo neví, jestli je to muž, žena nebo skupina lidí. Nikdo neví, jestli žije nebo ne. Nezanechal žádnou fotku, žádný rozhovor, žádnou stopu, kterou by šlo sledovat.",
                  "Satoshi went on writing code, communicating with the first developers, answering questions on discussion forums, refining the code together with the community. In 2011 they remarked that Bitcoin was in good hands and that they were moving on to something else. And then they vanished. Without a trace. No one knows whether it's a man, a woman or a group of people. No one knows whether they're alive or not. They left no photo, no interview, no trail to follow.",
                )}
              </p>
              <p className="text-[var(--fg)] font-medium">
                {L(
                  "Možná to nejdůležitější, co o Satoshiho identitě víme, je, že jsme se rozhodli to nevědět.",
                  "Perhaps the most important thing we know about Satoshi's identity is that we chose not to know it.",
                )}
              </p>
              <p>
                {L(
                  "Bitcoin byl od první chvíle navržený tak, aby nepotřeboval k chodu svého tvůrce. Aby fungoval sám, bez toho, aby ho někdo řídil, opravoval nebo měnil podle svého uvážení. Satoshiho zmizení nebyla náhoda ani tragédie — bylo to možná to nejdůslednější gesto, jaké mohl udělat. Dokázal, že myšlenka může fungovat i bez svého autora.",
                  "Bitcoin was designed from the very first moment not to need its creator to run. To function on its own, without anyone steering it, fixing it or changing it at will. Satoshi's disappearance was neither an accident nor a tragedy — it was perhaps the most consistent gesture they could make. They proved that an idea can work even without its author.",
                )}
              </p>
            </div>
          </section>

          {/* Proč by to měl umělec vědět — finální výzva */}
          <section className="ui-card p-7 sm:p-9">
            <span className="ui-eyebrow ui-accent">
              {L("Proč by to měl umělec vědět", "Why an artist should know this")}
            </span>
            <div className="space-y-4 text-[1.05rem] ui-muted leading-relaxed mt-4">
              <p>
                {L(
                  "Satoshi Nakamoto je anonymní, ale není prázdný. Je to postava, kterou si každý představuje jinak — a právě v tom je jeho síla jako inspirace. Není to hrdina s tváří na plakátu. Je to symbol myšlenky, která je větší než jakýkoliv jednotlivec.",
                  "Satoshi Nakamoto is anonymous, but not empty. It's a figure everyone imagines differently — and therein lies its strength as inspiration. It's not a hero with a face on a poster. It's a symbol of an idea greater than any individual.",
                )}
              </p>
              <p>
                {L(
                  "Bitcoin samotný je plný vizuálních a konceptuálních motivů, se kterými lze pracovat: síť bez středu, transparentnost bez tváře, svoboda bez povolení, matematická jistota nahrazující slepou důvěru, 21 milionů jako pevná hranice v nekonečném vesmíru čísel.",
                  "Bitcoin itself is full of visual and conceptual motifs to work with: a network without a center, transparency without a face, freedom without permission, mathematical certainty replacing blind trust, 21 million as a fixed limit in the infinite universe of numbers.",
                )}
              </p>
            </div>
            <p className="ui-display text-2xl sm:text-3xl font-bold leading-snug mt-7 pt-7 ui-border-t">
              {L("Vaším úkolem není nakreslit Bitcoin. ", "Your task is not to draw Bitcoin. ")}
              <span className="ui-accent">
                {L(
                  "Vaším úkolem je najít způsob, jak tuhle myšlenku ztělesnit tak, aby promluvila i k někomu, kdo o Bitcoinu nikdy neslyšel.",
                  "Your task is to find a way to embody this idea so that it speaks even to someone who has never heard of Bitcoin.",
                )}
              </span>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
