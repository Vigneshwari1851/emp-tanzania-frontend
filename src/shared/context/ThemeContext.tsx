import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme, event?: any) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getStoredTheme(): Theme {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

  useEffect(() => {
    applyTheme(resolvedTheme);
    localStorage.setItem("theme", theme);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme, event?: any) => {
    const resolved = t === "system" ? getSystemTheme() : t;

    if (!(document as any).startViewTransition) {
      document.documentElement.classList.add('disable-transitions');
      setThemeState(t);
      applyTheme(resolved);
      
      // Force synchronous reflow to prevent staggered rendering
      void document.documentElement.offsetHeight;
      
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('disable-transitions');
      });
      return;
    }

    // Extract button center coordinates from click event (or default to top-right corner)
    let x = window.innerWidth - 40;
    let y = 40;

    if (event) {
      const currentTarget = event.currentTarget || event.target;
      if (currentTarget && typeof currentTarget.getBoundingClientRect === 'function') {
        const rect = currentTarget.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      } else if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        x = event.clientX;
        y = event.clientY;
      }
    }

    // Calculate maximum radius required to cover the entire viewport from the button's position
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = (document as any).startViewTransition(() => {
      setThemeState(t);
      applyTheme(resolved);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: 250,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)'
        }
      );
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
