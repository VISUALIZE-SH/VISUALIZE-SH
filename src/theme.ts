/**
 * Color-theme preferences live outside individual workspaces so News, Atlas,
 * Data, modals, and the Cytoscape canvas always resolve the same mode.
 */
export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'visualize-sh-theme'
export const DARK_MODE_QUERY = '(prefers-color-scheme: dark)'

export function readThemePreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Storage can be unavailable under strict browser privacy policies; the
    // in-memory preference still works for the current visit.
  }
}

export function resolveDarkTheme(preference: ThemePreference, systemDark: boolean): boolean {
  return preference === 'dark' || (preference === 'system' && systemDark)
}

export function applyResolvedTheme(dark: boolean): void {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

/** Apply the saved preference before React mounts to avoid a light-theme flash. */
export function initializeTheme(): void {
  const preference = readThemePreference()
  applyResolvedTheme(resolveDarkTheme(preference, window.matchMedia(DARK_MODE_QUERY).matches))
}
