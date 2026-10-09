/** Label colors: semantic swatches that work in light and dark mode. */
export const LABEL_COLORS = {
  gray: "bg-zinc-500/12 text-zinc-700 ring-zinc-500/25 dark:text-zinc-300",
  red: "bg-red-500/12 text-red-700 ring-red-500/25 dark:text-red-300",
  orange: "bg-orange-500/12 text-orange-700 ring-orange-500/25 dark:text-orange-300",
  amber: "bg-amber-500/14 text-amber-800 ring-amber-500/30 dark:text-amber-300",
  green: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  teal: "bg-teal-500/12 text-teal-700 ring-teal-500/25 dark:text-teal-300",
  blue: "bg-blue-500/12 text-blue-700 ring-blue-500/25 dark:text-blue-300",
  violet: "bg-violet-500/12 text-violet-700 ring-violet-500/25 dark:text-violet-300",
  pink: "bg-pink-500/12 text-pink-700 ring-pink-500/25 dark:text-pink-300",
} as const;

export type LabelColor = keyof typeof LABEL_COLORS;

export function labelColorClass(color: string) {
  return LABEL_COLORS[color as LabelColor] ?? LABEL_COLORS.gray;
}
