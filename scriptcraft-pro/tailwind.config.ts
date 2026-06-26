import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        'sc-bg': 'var(--sc-bg)',
        'sc-bg-elevated': 'var(--sc-bg-elevated)',
        'sc-bg-strong': 'var(--sc-bg-strong)',
        'sc-border-subtle': 'var(--sc-border-subtle)',
        'sc-text': 'var(--sc-text)',
        'sc-text-muted': 'var(--sc-text-muted)',
        'sc-text-subtle': 'var(--sc-text-subtle)',
        'sc-accent': 'var(--sc-accent)',
        'sc-accent-soft': 'var(--sc-accent-soft)',
        'sc-accent-soft-strong': 'var(--sc-accent-soft-strong)',
      },
    },
  },
  plugins: [],
} satisfies Config
