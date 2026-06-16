import Identicon from "./Identicon";

/**
 * Avatar přispěvatele: vlastní obrázek/logo (imageUrl + volitelné pozadí),
 * jinak generativní identicon. Vyplní rodičovský (osezený) box.
 */
export default function Avatar({
  imageUrl,
  imageBg,
  seed,
  name,
}: {
  imageUrl?: string | null;
  imageBg?: string | null;
  seed: string;
  name: string;
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-full h-full object-contain p-0.5"
        style={{ background: imageBg || "#ffffff" }}
      />
    );
  }
  return <Identicon seed={seed} name={name} className="w-full h-full" />;
}
