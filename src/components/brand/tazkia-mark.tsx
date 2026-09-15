import { cn } from "@/lib/utils";

/**
 * The Tazkia Mengajar mark.
 *
 * NOTE: this is an approximation, redrawn from the 150px Instagram profile
 * image — the only version available. It follows the same idea (a blue
 * monogram on a white disc that reads as a smiling face) and uses the sampled
 * brand blue, but it is not the official artwork. Replace this component's SVG
 * with the real asset when the source file is to hand; nothing else needs to
 * change, since every usage goes through this one component.
 *
 * Inline SVG rather than an image file so it stays crisp at any size, inherits
 * the brand colour from a CSS variable, and needs no network request.
 */
export function TazkiaMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "border-border bg-card inline-flex items-center justify-center rounded-full border-2",
        className,
      )}
    >
      <svg
        viewBox="0 0 64 64"
        className="size-[70%] overflow-visible"
        fill="none"
        role="img"
        aria-label="Logo Tazkia Mengajar"
      >
        {/* Eyes. */}
        <circle cx="21" cy="19" r="4.5" fill="var(--brand)" />
        <circle cx="43" cy="19" r="4.5" fill="var(--brand)" />
        {/* Smile: an open bowl with round caps, the mark's dominant form. */}
        <path
          d="M15 33a17 17 0 0 0 34 0"
          stroke="var(--brand)"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
