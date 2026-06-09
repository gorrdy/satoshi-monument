"use client";

import { useTranslations } from "next-intl";

// Loga sítí (24×24, fill currentColor) — jednotný vzhled v kroužcích.
const ICONS: Record<string, React.ReactNode> = {
  x: (
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.65l-5.21-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.71 6.231 5.453-6.231zm-1.16 17.52h1.833L7.084 4.126H5.117l11.967 15.644z" />
  ),
  telegram: (
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.27 1.37.18 1.09 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
  ),
  whatsapp: (
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.043zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414z" />
  ),
  facebook: (
    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.49 0-1.95.93-1.95 1.88v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
  ),
};

function Circle({
  href,
  label,
  children,
  onClick,
}: {
  href?: string;
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const cls =
    "flex items-center justify-center w-11 h-11 rounded-full ui-border ui-soft press transition-colors hover:text-[var(--accent)]";
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={cls}
    >
      {children}
    </a>
  ) : (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function Glyph({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export default function ShareButtons({
  url,
  text,
  downloadHref,
}: {
  url: string;
  text: string;
  downloadHref?: string;
}) {
  const t = useTranslations("share");

  const u = encodeURIComponent(url);
  const tx = encodeURIComponent(text);
  const links = [
    { key: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${tx}&url=${u}` },
    { key: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${tx}` },
    { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${tx}%20${u}` },
    { key: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {links.map((l) => (
        <Circle key={l.key} href={l.href} label={l.label}>
          <Glyph name={l.key} />
        </Circle>
      ))}
      {downloadHref && (
        <Circle href={downloadHref} label={t("download")}>
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
          </svg>
        </Circle>
      )}
    </div>
  );
}
