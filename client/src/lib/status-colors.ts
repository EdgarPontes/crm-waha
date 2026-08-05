/**
 * Classes utilitárias para badges/estados "soft" (fundo translúcido),
 * compatíveis com light e dark mode. Utilizam os tokens semânticos
 * (success/warning/info/destructive) ou matizes fixos do Tailwind.
 */
export const statusStyles = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  muted: "bg-muted text-muted-foreground border-border",
  violet:
    "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
  blue: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  emerald:
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  amber:
    "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  orange:
    "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  cyan: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400",
  indigo:
    "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400",
} as const;

export type StatusStyle = keyof typeof statusStyles;
