import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export interface ChartColors {
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  success: string;
  warning: string;
  info: string;
  destructive: string;
  primary: string;
}

function resolveVar(name: string): string {
  if (typeof document === "undefined") return "currentColor";
  const probe = document.createElement("span");
  probe.style.setProperty("color", `var(${name})`);
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color || "currentColor";
}

/**
 * Resolve as CSS custom properties de cor em valores concretos,
 * recalculando quando o tema ou o esquema de cor muda. Necessário
 * porque atributos de apresentação SVG (stroke/fill) não resolvem var().
 */
export function useChartColors(): ChartColors {
  const { theme, colorScheme } = useTheme();

  return useMemo(
    () => ({
      chart1: resolveVar("--chart-1"),
      chart2: resolveVar("--chart-2"),
      chart3: resolveVar("--chart-3"),
      chart4: resolveVar("--chart-4"),
      chart5: resolveVar("--chart-5"),
      success: resolveVar("--success"),
      warning: resolveVar("--warning"),
      info: resolveVar("--info"),
      destructive: resolveVar("--destructive"),
      primary: resolveVar("--primary"),
    }),
    [theme, colorScheme]
  );
}
