import {
  COLOR_SCHEME_META,
  useTheme,
  type ColorScheme,
} from "@/contexts/ThemeContext";
import { Check, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeColorSelectProps {
  compact?: boolean;
  className?: string;
}

export function ThemeColorSelect({
  compact = false,
  className,
}: ThemeColorSelectProps) {
  const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
  const active = COLOR_SCHEME_META[colorScheme];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon-sm" : "default"}
          className={cn("gap-2", className)}
          title="Personalizar tema"
        >
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border border-border"
            style={{ backgroundColor: active.value }}
          />
          {!compact && <Palette className="h-4 w-4" />}
          {!compact && (
            <span className="sr-only lg:not-sr-only">{active.label}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Cor de destaque</DropdownMenuLabel>
        {(Object.keys(COLOR_SCHEME_META) as ColorScheme[]).map(scheme => {
          const meta = COLOR_SCHEME_META[scheme];
          const isActive = colorScheme === scheme;
          return (
            <DropdownMenuItem
              key={scheme}
              className="cursor-pointer"
              onSelect={() => setColorScheme(scheme)}
            >
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border border-border"
                style={{ backgroundColor: meta.value }}
              />
              <span className="flex-1">{meta.label}</span>
              {isActive && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => setTheme("light")}
        >
          <Sun className="h-4 w-4" />
          <span className="flex-1">Claro</span>
          {theme === "light" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => setTheme("dark")}
        >
          <Moon className="h-4 w-4" />
          <span className="flex-1">Escuro</span>
          {theme === "dark" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
