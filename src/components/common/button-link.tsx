import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ButtonProps = ComponentProps<typeof Button>;

interface ButtonLinkProps
  extends Omit<ButtonProps, "render" | "nativeButton" | "children"> {
  href: string;
  children: ReactNode;
}

/**
 * A button-styled link.
 *
 * Base UI's Button assumes it renders a native <button> and logs an
 * accessibility error when it does not. Passing `nativeButton={false}` here
 * once keeps that correct everywhere, instead of relying on each call site to
 * remember it.
 */
export function ButtonLink({ href, children, ...props }: ButtonLinkProps) {
  return (
    <Button {...props} nativeButton={false} render={<Link href={href} />}>
      {children}
    </Button>
  );
}
