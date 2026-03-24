import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-sans)', 'system-ui', 'sans-serif'] },
      colors: {
        amber: { DEFAULT: '#BA7517', light: 'rgba(186,117,23,0.1)' },
        ledger: { green: '#3B6D11', red: '#A32D2D' },
      },
    },
  },
  plugins: [],
}
export default config
