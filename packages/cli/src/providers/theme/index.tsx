import { createContext, useState, useCallback, useContext } from "react"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path";


import type { ReactNode } from "react";
import { DEFAULT_THEME, type ThemeColors, THEMES, type Theme } from "../../theme";

const CONFIG_DIR = join(homedir(), ".kloud-code");
const THEME_PREFERENCE_PATH = join(CONFIG_DIR, "preference.json");


type ThemePreferences = {
  themeName?: string;
};



function getInitialTheme(): Theme {
  try {
    const preferences = JSON.parse(
      readFileSync(THEME_PREFERENCE_PATH, "utf-8")
    ) as Partial<ThemePreferences>;

    const savedTheme = THEMES.find(
      (theme) => theme.name === preferences.themeName
    );

    return savedTheme ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

function persistTheme(theme: Theme) {
  try {
    mkdirSync(CONFIG_DIR, {
      recursive: true
    });
    writeFileSync(
      THEME_PREFERENCE_PATH,
      JSON.stringify({
        themeName: theme.name
      } satisfies ThemePreferences, null, 2), "utf-8"
    )
  } catch (error) {

  }
}

type ThemeContextValue = {
  colors: ThemeColors,
  currentTheme: Theme,
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be within theme provider")
  return value
}

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({
  children
}: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(getInitialTheme);

  const setTheme = useCallback((theme: Theme) => {
    setCurrentTheme(theme);
    persistTheme(theme)
  }, []);

  return (
    <ThemeContext.Provider value={{
      colors: currentTheme.colors, currentTheme, setTheme
    }}>
      {children}
    </ThemeContext.Provider>
  )
}
