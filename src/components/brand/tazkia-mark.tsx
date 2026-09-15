import Image from "next/image";

import { cn } from "@/lib/utils";

import logo from "../../../public/brand/logo-tazkia-mengajar.png";

/**
 * The Tazkia Mengajar mark: a "tm" ligature sitting in a smile.
 *
 * This is the supplied artwork, not a redrawing — trimmed of its margin and
 * with the white ground knocked out to transparency so it sits on any surface.
 *
 * The source is only 74x70px once trimmed, so the asset ships at 2x that and
 * the mark should not be rendered much larger than 64px or it will soften.
 * If a vector or higher-resolution original turns up, replacing the file in
 * public/brand is the only change needed — every usage goes through here.
 */
export function TazkiaMark({
  className,
  withRing = true,
}: {
  className?: string;
  /** The white disc and border. Turn off to place the mark on its own. */
  withRing?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        withRing && "border-border bg-card rounded-full border-2",
        className,
      )}
    >
      <Image
        src={logo}
        alt="Logo Tazkia Mengajar"
        className={cn("object-contain", withRing ? "size-[70%]" : "size-full")}
        // Part of the shell on every page, so it should never fade in late.
        priority
      />
    </span>
  );
}
