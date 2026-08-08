// Açık / karanlık mod
// Seçim tarayıcıda saklanır. Hiç seçim yapılmadıysa cihazın kendi tercihi kullanılır.

const KEY = 'uniplan-theme'

export function getStoredTheme() {
  return localStorage.getItem(KEY) // 'light' | 'dark' | null
}

export function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme() {
  return getStoredTheme() ?? systemTheme()
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}
