import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, letting later Tailwind utilities win over earlier ones in
 * the same group. `clsx` handles the conditionals; `tailwind-merge` resolves
 * conflicts like `p-2 p-4` that plain concatenation would leave ambiguous.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
