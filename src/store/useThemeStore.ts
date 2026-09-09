import { create } from 'zustand'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

interface ThemeState {
  theme: Theme
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('sf-theme') as Theme) || 'light',
  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('sf-theme', next)
    applyTheme(next)
    set({ theme: next })
  },
}))

// 模块加载时立即应用，避免闪白
applyTheme(useThemeStore.getState().theme)