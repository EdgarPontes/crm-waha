import React, { createContext, useContext, useEffect, useState } from "react";

export const COLOR_SCHEMES = [
  "mono",
  "marrom",
  "roxo-vibrante",
  "roxo-laranja",
  "laranja-quente",
  "azul-violeta",
  "azul-dourado",
  "azul-turquesa",
  "gradiente",
  "verde-limao",
  "azul-tech",
  "cinza-lima",
] as const;

export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export type Theme = "light" | "dark";

export interface ThemeColor {
  name: ColorScheme;
  label: string;
  value: string;
}

export const COLOR_SCHEME_META: Record<ColorScheme, ThemeColor> = {
  mono: { name: "mono", label: "Preto & Branco", value: "#111111" },
  marrom: { name: "marrom", label: "Marrom & Bege", value: "#99775c" },
  "roxo-vibrante": {
    name: "roxo-vibrante",
    label: "Roxo, Laranja & Rosa",
    value: "#4b2e83",
  },
  "roxo-laranja": {
    name: "roxo-laranja",
    label: "Roxo & Laranja",
    value: "#ff5841",
  },
  "laranja-quente": {
    name: "laranja-quente",
    label: "Laranja & Vermelho",
    value: "#dd2e18",
  },
  "azul-violeta": {
    name: "azul-violeta",
    label: "Azul, Branco & Violeta",
    value: "#4a8bdf",
  },
  "azul-dourado": {
    name: "azul-dourado",
    label: "Azul Royal & Dourado",
    value: "#002349",
  },
  "azul-turquesa": {
    name: "azul-turquesa",
    label: "Azul, Turquesa & Dourado",
    value: "#178582",
  },
  gradiente: {
    name: "gradiente",
    label: "Gradiente & Azul-escuro",
    value: "#635bff",
  },
  "verde-limao": {
    name: "verde-limao",
    label: "Verde-limão",
    value: "#00dd00",
  },
  "azul-tech": { name: "azul-tech", label: "Azul & Branco", value: "#00abe4" },
  "cinza-lima": {
    name: "cinza-lima",
    label: "Cinza & Verde-amarelo",
    value: "#baff39",
  },
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";
const COLOR_SCHEME_STORAGE_KEY = "color-scheme";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultColorScheme?: ColorScheme;
  switchable?: boolean;
}

function readStoredValue<T extends string>(
  key: string,
  defaultValue: T,
  validValues: readonly T[]
): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored && validValues.includes(stored as T)) {
      return stored as T;
    }
  } catch {
    // ignore storage errors
  }
  return defaultValue;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  defaultColorScheme = "mono",
  switchable = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    readStoredValue(THEME_STORAGE_KEY, defaultTheme, ["light", "dark"])
  );
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() =>
    readStoredValue(COLOR_SCHEME_STORAGE_KEY, defaultColorScheme, COLOR_SCHEMES)
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", colorScheme);
    try {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, colorScheme);
    } catch {
      // ignore storage errors
    }
  }, [colorScheme]);

  const setTheme = (next: Theme) => {
    if (!switchable) return;
    setThemeState(next);
  };

  const toggleTheme = () => {
    if (!switchable) return;
    setThemeState(prev => (prev === "light" ? "dark" : "light"));
  };

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        colorScheme,
        setColorScheme,
        switchable,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
