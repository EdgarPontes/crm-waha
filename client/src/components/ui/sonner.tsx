import { Toaster as Sonner, type ToasterProps } from "sonner";

type ToasterPropsExtended = ToasterProps & {
  theme?: "light" | "dark" | "system";
};

const Toaster = ({ theme = "light", ...props }: ToasterPropsExtended) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };