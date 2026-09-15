import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Neobrutalist button.
 *
 * Every variant carries the same 2px black border and offset shadow; only the
 * fill changes. `brutal-press` (globals.css) makes the button shift by the
 * shadow's offset on press so the control reads as physically depressed, which
 * is the interaction this style is built around.
 *
 * `active:translate-y-px` from the stock shadcn button is dropped here — it
 * would fight the press transform.
 */
const buttonVariants = cva(
  "group/button brutal-press inline-flex shrink-0 items-center justify-center rounded-md border-2 border-border bg-clip-padding text-sm font-bold whitespace-nowrap outline-none select-none shadow-[var(--shadow-brutal-sm)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[var(--shadow-brutal)] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "bg-card text-foreground hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/85",
        /**
         * Ghost keeps the flat look for toolbar and menu triggers, where a
         * grid of shadowed boxes would be unreadable. It gains its border on
         * hover so the affordance is still obvious.
         */
        ghost:
          "border-transparent shadow-none hover:border-border hover:bg-muted hover:translate-0 hover:shadow-[var(--shadow-brutal-sm)] aria-expanded:border-border aria-expanded:bg-muted",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 dark:text-black",
        link: "border-transparent shadow-none hover:shadow-none hover:translate-0 text-primary underline underline-offset-4 decoration-2",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-7 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4 text-base",
        icon: "size-9",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
